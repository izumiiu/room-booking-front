import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BookingCard } from '../components/BookingCard';
import { Button } from '../components/Button';
import { EmptyState, ErrorBox } from '../components/Feedback';
import { LoadingBlock } from '../components/Spinner';
import { Modal } from '../components/Modal';
import * as api from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { stateOf } from '../lib/booking';
import { formatFull } from '../lib/date';
import { rangeLabel } from '../lib/slot';
import { messageOf } from '../lib/errors';
import styles from './MyBookings.module.css';
import type { Booking, MyBookings as MyBookingsData } from '../lib/types';

export function MyBookings() {
    const navigate = useNavigate();
    const { data, loading, error, reload } = useLoad<MyBookingsData>(() => api.getMyBookings(), 'me');

    const [target, setTarget] = useState<Booking | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState('');

    const confirmCancel = async () => {
        if (!target) return;
        setCancelling(true);
        setCancelError('');
        try {
            await api.cancelBooking(target.id);
            setTarget(null);
            reload();
        } catch (err) {
            setCancelError(messageOf(err));
        } finally {
            setCancelling(false);
        }
    };

    const upcoming = data?.bookings.filter((b) => stateOf(b) === 'upcoming') ?? [];
    const history = data?.bookings.filter((b) => stateOf(b) !== 'upcoming') ?? [];
    const quotaFull = data ? data.quota.used >= data.quota.max : false;

    return (
        <AppShell>
            <div className={styles.head}>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>การจองของฉัน</h1>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
                    {data && (
                        <span className={`${styles.quota} ${quotaFull ? styles.quotaFull : ''}`}>
                            จองค้างไว้
                            <span className={styles.quotaNum}>{data.quota.used} / {data.quota.max}</span>
                        </span>
                    )}
                    <Button onClick={() => navigate('/book')} disabled={quotaFull}>
                        จองเวลาเพิ่ม
                    </Button>
                </div>
            </div>

            {loading && <LoadingBlock label="กำลังโหลดการจอง" />}

            {!loading && error && (
                <div className={styles.list}>
                    <ErrorBox title="โหลดข้อมูลไม่สำเร็จ" message={error} />
                    <div><Button variant="secondary" onClick={reload}>ลองอีกครั้ง</Button></div>
                </div>
            )}

            {!loading && !error && data && data.bookings.length === 0 && (
                <EmptyState
                    title="ยังไม่มีการจอง"
                    text="เลือกวันและช่วงเวลาที่ต้องการ แล้วจองได้ทันทีโดยไม่ต้องรออนุมัติ"
                    action={<Button onClick={() => navigate('/book')}>จองเวลา</Button>}
                />
            )}

            {!loading && !error && upcoming.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>กำลังจะถึง</h2>
                    <div className={styles.list}>
                        {upcoming.map((b) => (
                            <BookingCard key={b.id} booking={b} onCancel={setTarget} />
                        ))}
                    </div>
                </section>
            )}

            {!loading && !error && history.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>ประวัติการจอง</h2>
                    <div className={styles.list}>
                        {history.map((b) => <BookingCard key={b.id} booking={b} />)}
                    </div>
                </section>
            )}

            {target && (
                <Modal
                    title="ยกเลิกการจองนี้?"
                    onClose={() => { if (!cancelling) { setTarget(null); setCancelError(''); } }}
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setTarget(null)} disabled={cancelling}>
                                ไม่ยกเลิก
                            </Button>
                            <Button variant="dangerSolid" onClick={confirmCancel} loading={cancelling}>
                                {cancelling ? 'กำลังยกเลิก' : 'ยืนยันยกเลิก'}
                            </Button>
                        </>
                    }
                >
                    {cancelError && <ErrorBox title="ยกเลิกไม่สำเร็จ" message={cancelError} />}

                    <div className={styles.confirmWhat}>
                        <p className={styles.confirmDate}>{formatFull(target.date)}</p>
                        <p className={styles.confirmTime}>{rangeLabel(target.startSlot, target.endSlot)}</p>
                        <p className={styles.confirmTopic}>{target.topic}</p>
                    </div>

                    <p className={styles.confirmText}>
                        ช่วงเวลานี้จะถูกคืนให้คนอื่นจองได้ทันที และ
                        <span className={styles.warn}> กู้คืนไม่ได้</span> หากต้องการใช้ห้องอีกต้องจองใหม่
                    </p>
                </Modal>
            )}
        </AppShell>
    );
}
