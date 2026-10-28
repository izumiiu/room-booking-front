import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { EmptyState, ErrorBox } from '../components/Feedback';
import { LoadingBlock } from '../components/Spinner';
import { Modal } from '../components/Modal';
import * as api from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { messageOf } from '../lib/errors';
import { stateOf, hoursOf } from '../lib/booking';
import {
    addDays, addMonths, dateRange, daysBetween, formatFull, formatShort,
    isWeekend, monthEnd, monthLabel, monthStart, todayTH
} from '../lib/date';
import { SLOT_COUNT, slotStart, slotEnd, toHHMM, rangeLabel } from '../lib/slot';
import styles from './AdminDashboard.module.css';
import type { Booking, DayOverride } from '../lib/types';

type Kind = 'day' | 'week' | 'month' | 'custom';
interface Period { kind: Kind; from: string; to: string }

const dayPeriod = (d: string): Period => ({ kind: 'day', from: d, to: d });
const weekPeriod = (d: string): Period => ({ kind: 'week', from: d, to: addDays(d, 6) });
const monthPeriod = (d: string): Period => ({ kind: 'month', from: monthStart(d), to: monthEnd(d) });

const periodText = (p: Period): string => {
    if (p.kind === 'day') return formatFull(p.from);
    if (p.kind === 'month') return monthLabel(p.from);
    return `${formatShort(p.from)} – ${formatShort(p.to)}`;
};

const shift = (p: Period, dir: 1 | -1): Period => {
    if (p.kind === 'day') return dayPeriod(addDays(p.from, dir));
    if (p.kind === 'month') return monthPeriod(addMonths(p.from, dir));
    const span = daysBetween(p.from, p.to);
    return { ...p, from: addDays(p.from, dir * span), to: addDays(p.to, dir * span) };
};

const STATUS_BADGE = {
    upcoming: { tone: 'ok', text: 'ยืนยันแล้ว' },
    past: { tone: 'neutral', text: 'ผ่านไปแล้ว' },
    cancelled: { tone: 'danger', text: 'ยกเลิกแล้ว' }
} as const;

export function AdminDashboard() {
    const [period, setPeriod] = useState<Period>(() => weekPeriod(todayTH()));
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');          // ค่าที่ยิงไปจริง กดค้นหาแล้วค่อยเปลี่ยน
    const [onlyCancelled, setOnlyCancelled] = useState(false);

    const key = `${period.from}|${period.to}|${search}|${onlyCancelled}`;
    const { data, loading, error, reload } = useLoad(async () => {
        const [list, days] = await Promise.all([
            api.adminListBookings({
                from: period.from, to: period.to, limit: 100,
                ...(search ? { q: search } : {}),
                ...(onlyCancelled ? { status: 'cancelled' } : {})
            }),
            api.adminListDayOverrides({ from: period.from, to: period.to })
        ]);
        return { list, overrides: days.overrides };
    }, key);

    const [detail, setDetail] = useState<Booking | null>(null);
    const [asking, setAsking] = useState<Booking | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [panel, setPanel] = useState(false);

    const overrides: DayOverride[] = data?.overrides ?? [];
    const bookings: Booking[] = data?.list.bookings ?? [];

    const isOpenDay = (d: string): boolean => {
        const o = overrides.find((x) => x.date === d);
        return o ? o.isOpen : !isWeekend(d);
    };

    const days = dateRange(period.from, period.to);
    const openDays = days.filter(isOpenDay);
    const closedDays = days.filter((d) => !isOpenDay(d));

    // ช่องที่ถูกจองของแต่ละวัน — คลี่ช่วง startSlot..endSlot ออกเป็นช่องเดี่ยว
    const takenByDay = new Map<string, Set<number>>();
    for (const b of bookings) {
        if (b.status !== 'booked') continue;
        const set = takenByDay.get(b.date) ?? new Set<number>();
        for (let s = b.startSlot; s <= b.endSlot; s++) set.add(s);
        takenByDay.set(b.date, set);
    }

    const activeBookings = bookings.filter((b) => b.status === 'booked');
    const bookedHours = activeBookings.reduce((sum, b) => sum + hoursOf(b), 0);
    const freeSlots = Math.max(openDays.length * SLOT_COUNT - bookedHours, 0);

    const doCancel = async () => {
        if (!asking) return;
        if (!reason.trim()) { setActionError('กรุณาระบุเหตุผล ผู้จองจะเห็นข้อความนี้'); return; }
        setBusy(true);
        setActionError('');
        try {
            await api.adminCancelBooking(asking.id, reason.trim());
            setAsking(null);
            setDetail(null);
            setReason('');
            reload();
        } catch (err) {
            setActionError(messageOf(err));
        } finally {
            setBusy(false);
        }
    };

    const singleDay = days.length === 1 && days[0] !== undefined;
    const theDay = days[0] ?? period.from;

    return (
        <AppShell>
            <h1 className={styles.title}>ภาพรวมการจอง</h1>
            <p className={styles.lead}>ห้อง TC-402 · เปิดจอง 08:30 – 20:30 น. วันจันทร์ถึงศุกร์</p>

            {/* ---- ช่วงวันที่ ---- */}
            <div className={styles.period}>
                <div className={styles.periodRow}>
                    <div className={styles.nav}>
                        <button type="button" className={styles.arrow} aria-label="ช่วงก่อนหน้า"
                                onClick={() => setPeriod((p) => shift(p, -1))}>←</button>
                        <span className={styles.periodLabel}>{periodText(period)}</span>
                        <button type="button" className={styles.arrow} aria-label="ช่วงถัดไป"
                                onClick={() => setPeriod((p) => shift(p, 1))}>→</button>
                    </div>

                    <div className={styles.chips}>
                        <button type="button" className={`${styles.chip} ${period.kind === 'day' ? styles.chipOn : ''}`}
                                onClick={() => setPeriod(dayPeriod(todayTH()))}>วันนี้</button>
                        <button type="button" className={`${styles.chip} ${period.kind === 'week' ? styles.chipOn : ''}`}
                                onClick={() => setPeriod(weekPeriod(todayTH()))}>7 วันข้างหน้า</button>
                        <button type="button" className={`${styles.chip} ${period.kind === 'month' ? styles.chipOn : ''}`}
                                onClick={() => setPeriod(monthPeriod(todayTH()))}>เดือนนี้</button>
                        <button type="button" className={`${styles.chip} ${period.kind === 'custom' ? styles.chipOn : ''}`}
                                onClick={() => setPeriod((p) => ({ ...p, kind: 'custom' }))}>กำหนดเอง</button>
                    </div>
                </div>

                {period.kind === 'custom' && (
                    <div className={styles.custom}>
                        <div>
                            <label className={styles.dateLabel} htmlFor="from">จากวันที่</label>
                            <input id="from" type="date" className={styles.dateInput} value={period.from}
                                   onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} />
                        </div>
                        <div>
                            <label className={styles.dateLabel} htmlFor="to">ถึงวันที่</label>
                            <input id="to" type="date" className={styles.dateInput} value={period.to}
                                   onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} />
                        </div>
                    </div>
                )}
            </div>

            <p className={styles.scopeNote}>
                ตัวเลขและตารางด้านล่างคิดจาก {periodText(period)} · {days.length} วัน
                (เปิด {openDays.length} · ปิด {closedDays.length})
            </p>

            {loading && <LoadingBlock label="กำลังโหลดข้อมูล" />}
            {!loading && error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    <ErrorBox title="โหลดข้อมูลไม่สำเร็จ" message={error} />
                    <div><Button variant="secondary" onClick={reload}>ลองอีกครั้ง</Button></div>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {/* ---- สถิติ ---- */}
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <div className={styles.statKey}>จำนวนการจอง</div>
                            <div className={styles.statVal}>{activeBookings.length}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statKey}>ชั่วโมงที่ถูกจอง</div>
                            <div className={styles.statVal}>{bookedHours}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statKey}>ช่วงที่ยังว่าง</div>
                            <div className={styles.statVal}>{freeSlots}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statKey}>วันที่ปิดทำการ</div>
                            <div className={styles.statVal}>{closedDays.length}</div>
                        </div>
                    </div>

                    {/* ---- ตารางห้อง + ทางลัด ---- */}
                    <div className={styles.mid}>
                        <section className={styles.grid}>
                            <h2 className={styles.gridTitle}>
                                {singleDay ? `ตารางห้อง ${formatFull(theDay)}` : 'ตารางห้องในช่วงที่เลือก'}
                            </h2>

                            {singleDay && !isOpenDay(theDay) && (
                                <div className={styles.closedBox}>
                                    <div className={styles.closedIcon} aria-hidden="true">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A3A17" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="5" width="18" height="16" rx="2" />
                                            <path d="M8 3v4M16 3v4M3 11h18M9 16l6-3M15 16l-6-3" />
                                        </svg>
                                    </div>
                                    <p className={styles.closedTitle}>ปิดทำการทั้งวัน</p>
                                    <p className={styles.closedText}>
                                        {overrides.find((o) => o.date === theDay)?.note ?? 'เสาร์-อาทิตย์ปิดตามค่าเริ่มต้น'}
                                    </p>
                                </div>
                            )}

                            {singleDay && isOpenDay(theDay) && (
                                <div className={styles.tiles}>
                                    {Array.from({ length: SLOT_COUNT }, (_, s) => {
                                        const taken = takenByDay.get(theDay)?.has(s) ?? false;
                                        return (
                                            <div key={s} className={`${styles.tile} ${taken ? styles.tileTaken : ''}`}>
                                                <span className={styles.nowrap}>
                                                    {toHHMM(slotStart(s))} – {toHHMM(slotEnd(s))}
                                                </span>
                                                <span className={styles.tileTag}>{taken ? 'จองแล้ว' : 'ว่าง'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!singleDay && (
                                <div>
                                    <div className={styles.legend}>
                                        <span className={styles.key}><span className={`${styles.sw} ${styles.swFree}`} />ว่าง</span>
                                        <span className={styles.key}><span className={`${styles.sw} ${styles.swTaken}`} />จองแล้ว</span>
                                        <span className={styles.key}><span className={`${styles.sw} ${styles.swClosed}`} />ปิดทำการ</span>
                                    </div>
                                    <div className={styles.rows}>
                                        {days.map((d) => {
                                            const open = isOpenDay(d);
                                            const taken = takenByDay.get(d) ?? new Set<number>();
                                            return (
                                                <div key={d} className={styles.row}>
                                                    <span className={styles.rowDay}>{formatShort(d).replace(/ \d{4}$/, '')}</span>
                                                    <div className={styles.cells}>
                                                        {Array.from({ length: SLOT_COUNT }, (_, s) => (
                                                            <span
                                                                key={s}
                                                                className={`${styles.cell} ${!open ? styles.cellClosed : taken.has(s) ? styles.cellTaken : ''}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className={styles.rowSum}>
                                                        {open ? `จองแล้ว ${taken.size} / ${SLOT_COUNT}` : 'ปิดทำการ'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className={styles.side}>
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>ทางลัด</h2>
                                <Button full onClick={() => setPanel(true)}>ปิด–เปิดห้อง</Button>
                                <p className={styles.cardNote}>
                                    เสาร์-อาทิตย์ปิดอยู่แล้วโดยค่าเริ่มต้น ใช้ปุ่มนี้เมื่อต้องปิดวันธรรมดา
                                    หรือเปิดวันหยุดเป็นกรณีพิเศษ
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* ---- รายการจองทั้งหมด ---- */}
                    <section className={styles.listSection}>
                        <div className={styles.listHead}>
                            <h2 className={styles.listTitle}>รายการจองทั้งหมด</h2>
                            <div className={styles.tools}>
                                <label className="sr-only" htmlFor="q">ค้นหาการจอง</label>
                                <input
                                    id="q" type="search" className={styles.search}
                                    placeholder="ค้นหาชื่อผู้จอง หัวข้อ หรือหน่วยงาน"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') setSearch(query.trim()); }}
                                />
                                <Button variant="ghost" onClick={() => setSearch(query.trim())}>ค้นหา</Button>
                                <button type="button"
                                        className={`${styles.chip} ${!onlyCancelled ? styles.chipOn : ''}`}
                                        onClick={() => setOnlyCancelled(false)}>ทั้งหมด</button>
                                <button type="button"
                                        className={`${styles.chip} ${onlyCancelled ? styles.chipOn : ''}`}
                                        onClick={() => setOnlyCancelled(true)}>เฉพาะที่ยกเลิก</button>
                            </div>
                        </div>

                        {asking && (
                            <div className={styles.ask}>
                                <div className={styles.askTitle}>ยกเลิกการจองของผู้ใช้รายนี้?</div>
                                <div className={styles.askWhat}>
                                    {formatShort(asking.date)} · {rangeLabel(asking.startSlot, asking.endSlot)} · {asking.fullName} · {asking.topic}
                                </div>
                                <div className={styles.askField}>
                                    <Field
                                        label="เหตุผล (ผู้จองจะเห็นข้อความนี้)" required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="เช่น ห้องถูกใช้สำหรับประชุมเร่งด่วนของผู้บริหาร"
                                        disabled={busy}
                                    />
                                </div>
                                {actionError && <div style={{ marginTop: 'var(--sp-3)' }}><ErrorBox message={actionError} /></div>}
                                <div className={styles.askActions}>
                                    <Button variant="dangerSolid" onClick={doCancel} loading={busy}>ยืนยันการยกเลิก</Button>
                                    <Button variant="ghost" onClick={() => { setAsking(null); setReason(''); setActionError(''); }} disabled={busy}>ไม่ยกเลิก</Button>
                                </div>
                            </div>
                        )}

                        {bookings.length === 0 ? (
                            <div style={{ paddingBottom: 'var(--sp-5)' }}>
                                <EmptyState
                                    title="ไม่มีรายการในช่วงนี้"
                                    text="ลองเปลี่ยนช่วงวันที่ หรือล้างคำค้นหา"
                                />
                            </div>
                        ) : (
                            <>
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th scope="col">วันที่</th>
                                                <th scope="col">ช่วงเวลา</th>
                                                <th scope="col">หัวข้อ</th>
                                                <th scope="col">ผู้จอง</th>
                                                <th scope="col">หน่วยงาน</th>
                                                <th scope="col">เบอร์โทร</th>
                                                <th scope="col">สถานะ</th>
                                                <th scope="col">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bookings.map((b) => {
                                                const st = stateOf(b);
                                                const badge = STATUS_BADGE[st];
                                                return (
                                                    <tr key={b.id}>
                                                        <td className={styles.nowrap}>{formatShort(b.date)}</td>
                                                        <td className={styles.nowrap} style={{ fontWeight: 600 }}>
                                                            {rangeLabel(b.startSlot, b.endSlot)}
                                                        </td>
                                                        <td>
                                                            <button type="button" className={styles.linkBtn} onClick={() => setDetail(b)}>
                                                                {b.topic}
                                                            </button>
                                                        </td>
                                                        <td className={styles.nowrap}>{b.fullName}</td>
                                                        <td className={`${styles.nowrap} ${styles.sub}`}>{b.department ?? '—'}</td>
                                                        <td className={`${styles.nowrap} ${styles.sub}`}>{b.phone}</td>
                                                        <td><Badge tone={badge.tone}>{badge.text}</Badge></td>
                                                        <td>
                                                            {st === 'upcoming' ? (
                                                                <button type="button" className={styles.rowCancel}
                                                                        onClick={() => { setAsking(b); setReason(''); setActionError(''); }}>
                                                                    ยกเลิก
                                                                </button>
                                                            ) : <span className={styles.sub}>—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className={styles.foot}>
                                    แสดง {bookings.length} จาก {data.list.total} รายการ · คลิกที่หัวข้อเพื่อดูรายละเอียดทั้งหมด
                                </p>
                            </>
                        )}
                    </section>
                </>
            )}

            {detail && (
                <Modal title={detail.topic} onClose={() => setDetail(null)} wide>
                    <div><Badge tone={STATUS_BADGE[stateOf(detail)].tone}>{STATUS_BADGE[stateOf(detail)].text}</Badge></div>
                    <div className={styles.rule} />
                    <div className={styles.detailList}>
                        <div className={styles.detailRow}><span className={styles.detailKey}>วันที่</span><span className={styles.detailVal}>{formatFull(detail.date)}</span></div>
                        <div className={styles.detailRow}><span className={styles.detailKey}>ช่วงเวลา</span><span className={styles.detailVal} style={{ fontWeight: 600 }}>{rangeLabel(detail.startSlot, detail.endSlot)} น. · {hoursOf(detail)} ชั่วโมง</span></div>
                        <div className={styles.detailRow}><span className={styles.detailKey}>วัตถุประสงค์</span><span className={styles.detailVal}>{detail.purpose ?? '—'}</span></div>
                        <div className={styles.detailRow}><span className={styles.detailKey}>ผู้เข้าร่วม</span><span className={styles.detailVal}>{detail.attendees} คน</span></div>
                    </div>
                    <div className={styles.rule} />
                    <div className={styles.detailSec}>ผู้จอง</div>
                    <div className={styles.detailList}>
                        <div className={styles.detailRow}><span className={styles.detailKey}>ชื่อ–นามสกุล</span><span className={styles.detailVal}>{detail.fullName}</span></div>
                        <div className={styles.detailRow}><span className={styles.detailKey}>หน่วยงาน</span><span className={styles.detailVal}>{detail.department ?? '—'}</span></div>
                        <div className={styles.detailRow}><span className={styles.detailKey}>เบอร์โทรศัพท์</span><span className={styles.detailVal}>{detail.phone}</span></div>
                        <div className={styles.detailRow}><span className={styles.detailKey}>อีเมล</span><span className={styles.detailVal}>{detail.email}</span></div>
                    </div>
                    {detail.status === 'cancelled' && detail.cancelReason && (
                        <>
                            <div className={styles.rule} />
                            <div className={styles.detailRow}><span className={styles.detailKey}>เหตุผลที่ยกเลิก</span><span className={styles.detailVal}>{detail.cancelReason}</span></div>
                        </>
                    )}
                    <div style={{ display: 'flex', gap: '9px', marginTop: 'var(--sp-6)' }}>
                        {stateOf(detail) === 'upcoming' && (
                            <Button variant="danger" onClick={() => { setAsking(detail); setDetail(null); setReason(''); }}>
                                ยกเลิกการจองนี้
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setDetail(null)}>ปิด</Button>
                    </div>
                </Modal>
            )}

            {panel && (
                <DayPanel
                    overrides={overrides}
                    onClose={() => setPanel(false)}
                    onChanged={reload}
                />
            )}
        </AppShell>
    );
}

/* ---------------- ปิด–เปิดห้อง ---------------- */

function DayPanel({ overrides, onClose, onChanged }: {
    overrides: DayOverride[];
    onClose: () => void;
    onChanged: () => void;
}) {
    const [date, setDate] = useState(() => todayTH());
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const options = dateRange(todayTH(), addDays(todayTH(), 30));
    const override = overrides.find((o) => o.date === date);
    const open = override ? override.isOpen : !isWeekend(date);
    const closedList = overrides.filter((o) => !o.isOpen);

    const act = async (makeOpen: boolean) => {
        if (!makeOpen && !note.trim()) { setError('กรุณาระบุเหตุผล ผู้ใช้จะเห็นข้อความนี้ในหน้าจอง'); return; }
        setBusy(true);
        setError('');
        try {
            await api.adminSetDayOverride(date, makeOpen, makeOpen ? undefined : note.trim());
            setNote('');
            onChanged();
        } catch (err) {
            setError(messageOf(err));
        } finally {
            setBusy(false);
        }
    };

    const reopen = async (d: string) => {
        setBusy(true);
        setError('');
        try {
            await api.adminRemoveDayOverride(d);
            onChanged();
        } catch (err) {
            setError(messageOf(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title="ปิด–เปิดห้อง" onClose={onClose} wide>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -8 }}>
                ปิดหรือเปิดได้ทีละทั้งวัน ไม่แยกเป็นช่วงเวลา
            </p>
            <div className={styles.rule} />

            <label className={styles.dateLabel} htmlFor="pickday">เลือกวันที่</label>
            <select id="pickday" className={styles.select} value={date} onChange={(e) => setDate(e.target.value)} disabled={busy}>
                {options.map((d) => <option key={d} value={d}>{formatFull(d)}</option>)}
            </select>

            <div className={`${styles.status} ${open ? '' : styles.statusClosed}`}>
                <div className={styles.statusTitle}>{open ? 'วันนี้เปิดให้จอง' : 'วันนี้ปิดทำการ'}</div>
                <div className={styles.statusNote}>
                    {override
                        ? (override.note ?? 'เจ้าหน้าที่ตั้งค่าไว้เป็นกรณีพิเศษ')
                        : (isWeekend(date) ? 'เสาร์-อาทิตย์ปิดตามค่าเริ่มต้น' : 'วันทำการปกติ')}
                </div>
            </div>

            {error && <div style={{ marginTop: 'var(--sp-4)' }}><ErrorBox message={error} /></div>}

            {open ? (
                <div style={{ marginTop: 18 }}>
                    <Field
                        label="เหตุผล" required
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="เช่น วันหยุดราชการ หรือ ซ่อมระบบปรับอากาศ"
                        hint="ข้อความนี้จะแสดงให้ผู้ใช้เห็นในหน้าจอง"
                        disabled={busy}
                    />
                    <div style={{ marginTop: 18 }}>
                        <Button full variant="dangerSolid" onClick={() => act(false)} loading={busy}>
                            ปิดห้องทั้งวันนี้
                        </Button>
                    </div>
                </div>
            ) : (
                <div style={{ marginTop: 18 }}>
                    <Button full onClick={() => act(true)} loading={busy}>เปิดห้องวันนี้</Button>
                </div>
            )}

            <div className={styles.rule} />
            <div className={styles.detailSec}>วันที่ปิดไว้ตอนนี้</div>
            {closedList.length === 0 ? (
                <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>ยังไม่มีวันที่ถูกปิดเป็นกรณีพิเศษ</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {closedList.map((o) => (
                        <div key={o.date} className={styles.closedItem}>
                            <div>
                                <div className={styles.closedItemDate}>{formatFull(o.date)}</div>
                                <div className={styles.closedItemNote}>{o.note ?? '—'}</div>
                            </div>
                            <Button variant="ghost" onClick={() => reopen(o.date)} disabled={busy}>เปิดคืน</Button>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
