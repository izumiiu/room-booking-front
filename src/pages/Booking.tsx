import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DayStrip } from '../components/DayStrip';
import { SlotList } from '../components/SlotList';
import { Button } from '../components/Button';
import { Field, TextareaField } from '../components/Field';
import { ErrorBox } from '../components/Feedback';
import { LoadingBlock } from '../components/Spinner';
import * as api from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { ApiError, messageOf } from '../lib/errors';
import { bookableDays, formatFull, isWeekend, todayTH } from '../lib/date';
import { MAX_ADVANCE_DAYS, rangeLabel } from '../lib/slot';
import styles from './Booking.module.css';
import type { Availability } from '../lib/types';

interface Selection { date: string; a: number; b: number }

interface FormState {
    topic: string;
    purpose: string;
    attendees: string;
    fullName: string;
    department: string;
    phone: string;
    email: string;
}

const EMPTY_FORM: FormState = {
    topic: '', purpose: '', attendees: '', fullName: '', department: '', phone: '', email: ''
};

/** วันแรกที่จองได้จริง — ถ้าวันนี้เป็นเสาร์อาทิตย์ให้ข้ามไปวันเปิดถัดไป */
const firstOpenDay = (days: string[]): string => days.find((d) => !isWeekend(d)) ?? todayTH();

export function Booking() {
    const navigate = useNavigate();
    const [days] = useState(() => bookableDays(MAX_ADVANCE_DAYS));
    const [date, setDate] = useState(() => firstOpenDay(days));

    const { data, loading, error, reload } = useLoad<Availability>(
        () => api.getAvailability(date),
        date
    );

    // ★ เก็บวันที่ไว้ในตัวเลือกด้วย แทนที่จะล้างค่าใน useEffect ตอนเปลี่ยนวัน
    //   สิ่งที่คำนวณได้ไม่ควรเก็บเป็น state แยก และ effect ที่ไปสั่ง setState ทำให้วาดซ้ำโดยไม่จำเป็น
    const [sel, setSel] = useState<Selection | null>(null);
    const picked = sel && sel.date === date ? sel : null;

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [submitError, setSubmitError] = useState('');
    const [busy, setBusy] = useState(false);

    const set = <K extends keyof FormState>(key: K, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const choose = (i: number) => {
        setSubmitError('');
        if (!picked) { setSel({ date, a: i, b: i }); return; }
        if (i === picked.a && i === picked.b) { setSel(null); return; }

        const lo = Math.min(i, picked.a);
        const hi = Math.max(i, picked.a);

        // มีช่องที่จองไม่ได้คั่นกลาง = เลือกข้ามไม่ได้ ให้เริ่มใหม่ที่ช่องที่เพิ่งกด
        const blocked = (data?.slots ?? []).some(
            (s) => s.slot >= lo && s.slot <= hi && s.status !== 'free'
        );
        setSel(blocked ? { date, a: i, b: i } : { date, a: lo, b: hi });
    };

    const validate = (): boolean => {
        const next: Partial<Record<keyof FormState, string>> = {};
        if (!form.topic.trim()) next.topic = 'กรุณาระบุหัวข้อการประชุม';
        const n = Number(form.attendees);
        if (!form.attendees.trim() || !Number.isInteger(n) || n < 1) next.attendees = 'กรุณาระบุจำนวนผู้เข้าร่วม';
        if (!form.fullName.trim()) next.fullName = 'กรุณาระบุชื่อ-นามสกุล';
        if (!/^[0-9+\-\s()]{6,20}$/.test(form.phone.trim())) next.phone = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'อีเมลไม่ถูกต้อง';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        if (!picked) { setSubmitError('กรุณาเลือกช่วงเวลาก่อน'); return; }
        if (!validate()) return;

        setBusy(true);
        try {
            await api.createBooking({
                date: picked.date,
                startSlot: picked.a,
                endSlot: picked.b,
                topic: form.topic.trim(),
                attendees: Number(form.attendees),
                fullName: form.fullName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim().toLowerCase(),
                ...(form.purpose.trim() ? { purpose: form.purpose.trim() } : {}),
                ...(form.department.trim() ? { department: form.department.trim() } : {})
            });
            navigate('/bookings', { replace: true });
        } catch (err) {
            setSubmitError(messageOf(err));
            // มีคนตัดหน้าไปก่อน หรือวันถูกปิด -> ตารางที่เห็นอยู่ล้าสมัยแล้ว ต้องโหลดใหม่
            if (err instanceof ApiError && (err.code === 'SLOT_TAKEN' || err.code === 'DAY_CLOSED')) {
                setSel(null);
                reload();
            }
            setBusy(false);
        }
    };

    const hours = picked ? picked.b - picked.a + 1 : 0;

    return (
        <AppShell>
            <Link to="/bookings" className={styles.back}>← การจองของฉัน</Link>
            <h1 className={styles.title}>เลือกวันและช่วงเวลา</h1>
            <p className={styles.lead}>
                ห้อง TC-402 · เปิดจอง 08:30 – 20:30 น. วันจันทร์ถึงศุกร์ · จองล่วงหน้าได้ {MAX_ADVANCE_DAYS} วัน
            </p>

            <div className={styles.strip}>
                <DayStrip days={days} value={date} onChange={(d) => { setDate(d); setSubmitError(''); }} />
            </div>

            <form onSubmit={submit} noValidate>
                <div className={styles.cols}>

                    <section className={styles.left}>
                        <h2 className={styles.dayHeading}>{formatFull(date)}</h2>

                        {loading && <LoadingBlock label="กำลังโหลดตาราง" />}

                        {!loading && error && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                                <ErrorBox title="โหลดตารางไม่สำเร็จ" message={error} />
                                <div><Button variant="secondary" onClick={reload}>ลองอีกครั้ง</Button></div>
                            </div>
                        )}

                        {!loading && !error && data && !data.isOpen && (
                            <div className={styles.closed}>
                                <div className={styles.closedIcon} aria-hidden="true">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A3A17" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="5" width="18" height="16" rx="2" />
                                        <path d="M8 3v4M16 3v4M3 11h18M9 16l6-3M15 16l-6-3" />
                                    </svg>
                                </div>
                                <p className={styles.closedTitle}>วันนี้ปิดทำการ</p>
                                <p className={styles.closedText}>
                                    ห้อง TC-402 เปิดจองวันจันทร์ถึงศุกร์<br />เลือกวันอื่นจากแถบด้านบน
                                </p>
                            </div>
                        )}

                        {!loading && !error && data && data.isOpen && (
                            <SlotList
                                slots={data.slots}
                                from={picked?.a ?? null}
                                to={picked?.b ?? null}
                                onPick={choose}
                            />
                        )}
                    </section>

                    <aside className={styles.side}>
                        {picked ? (
                            <div className={styles.summary}>
                                <div className={styles.summaryDate}>{formatFull(picked.date)}</div>
                                <div className={styles.summaryTime}>{rangeLabel(picked.a, picked.b)} น.</div>
                                <div className={styles.summaryHours}>{hours} ชั่วโมง</div>
                            </div>
                        ) : (
                            <div className={styles.summaryEmpty}>
                                ยังไม่ได้เลือกช่วงเวลา แตะช่องที่ว่างในตารางก่อน
                            </div>
                        )}

                        <div className={styles.group}>
                            <div className={styles.sec}>รายละเอียดการประชุม</div>

                            <Field
                                label="หัวข้อ" required
                                value={form.topic}
                                onChange={(e) => set('topic', e.target.value)}
                                placeholder="เช่น ประชุมคณะกรรมการประจำเดือน"
                                {...(errors.topic ? { error: errors.topic } : {})}
                                disabled={busy}
                            />
                            <TextareaField
                                label="วัตถุประสงค์" optional
                                rows={3}
                                value={form.purpose}
                                onChange={(e) => set('purpose', e.target.value)}
                                placeholder="เช่น เพื่อสรุปผลการดำเนินงานและวางแผนเดือนถัดไป"
                                disabled={busy}
                            />
                            <Field
                                label="จำนวนผู้เข้าร่วมประชุม" required
                                type="number" inputMode="numeric" min={1}
                                value={form.attendees}
                                onChange={(e) => set('attendees', e.target.value)}
                                placeholder="ต้องระบุ"
                                {...(errors.attendees ? { error: errors.attendees } : {})}
                                disabled={busy}
                            />
                        </div>

                        <div className={styles.rule} />

                        <div className={styles.group}>
                            <div className={styles.groupHead}>
                                <div className={styles.sec}>ข้อมูลผู้ติดต่อ</div>
                                <div className={styles.secNote}>เจ้าหน้าที่ใช้ติดต่อกลับเมื่อจำเป็น</div>
                            </div>

                            <Field
                                label="ชื่อ–นามสกุล" required
                                value={form.fullName}
                                onChange={(e) => set('fullName', e.target.value)}
                                placeholder="เช่น สมหญิง ใจดี"
                                autoComplete="name"
                                {...(errors.fullName ? { error: errors.fullName } : {})}
                                disabled={busy}
                            />
                            <Field
                                label="หน่วยงาน" optional
                                value={form.department}
                                onChange={(e) => set('department', e.target.value)}
                                placeholder="เช่น งานบริหารทั่วไป"
                                disabled={busy}
                            />
                            <div className={styles.pair}>
                                <Field
                                    label="เบอร์โทรศัพท์" required
                                    type="tel" inputMode="tel"
                                    value={form.phone}
                                    onChange={(e) => set('phone', e.target.value)}
                                    placeholder="08x-xxx-xxxx"
                                    autoComplete="tel"
                                    {...(errors.phone ? { error: errors.phone } : {})}
                                    disabled={busy}
                                />
                                <Field
                                    label="อีเมล" required
                                    type="email" inputMode="email"
                                    value={form.email}
                                    onChange={(e) => set('email', e.target.value)}
                                    placeholder="name@nu.ac.th"
                                    autoComplete="email"
                                    {...(errors.email ? { error: errors.email } : {})}
                                    disabled={busy}
                                />
                            </div>
                        </div>

                        {submitError && <ErrorBox title="จองไม่สำเร็จ" message={submitError} />}

                        <div className={styles.deskSubmit}>
                            <Button type="submit" full loading={busy} disabled={!picked}>
                                {busy ? 'กำลังจอง' : 'ยืนยันการจอง'}
                            </Button>
                            <p className={styles.afterSubmit}>ยืนยันแล้วได้ห้องทันที ไม่ต้องรออนุมัติ</p>
                        </div>
                    </aside>

                </div>

                <div className={styles.bar}>
                    {picked ? (
                        <div className={styles.barInfo}>
                            <span className={styles.barRange}>{rangeLabel(picked.a, picked.b)} น.</span>
                            <span className={styles.barHours}>{hours} ชั่วโมง</span>
                        </div>
                    ) : (
                        <p className={styles.barHint}>เลือกช่วงเวลาก่อนจึงจะจองได้</p>
                    )}
                    <Button type="submit" full loading={busy} disabled={!picked}>
                        {busy ? 'กำลังจอง' : 'ยืนยันการจอง'}
                    </Button>
                </div>
            </form>
        </AppShell>
    );
}
