import { Link, Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../auth/useAuth';
import { FullPageSpinner } from '../components/Spinner';
import { MAX_ACTIVE_BOOKINGS, MAX_ADVANCE_DAYS } from '../lib/slot';
import styles from './Landing.module.css';

export function Landing() {
    const { user, ready } = useAuth();

    if (!ready) return <FullPageSpinner />;
    // ล็อกอินค้างอยู่แล้วก็ไม่ต้องเห็นหน้านี้ พาไปหน้าของตัวเองเลย
    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/bookings'} replace />;

    return (
        <div className={styles.wrap}>
            <p className={styles.eyebrow}>คณะอุทยานวิทยาศาสตร์</p>
            <h1 className={styles.title}>จองห้องประชุม TC-402</h1>
            <p className={styles.lead}>
                ดูช่วงเวลาที่ว่างแล้วจองได้ทันที ไม่ต้องรออนุมัติ
            </p>

            <div className={styles.facts}>
                <div className={styles.fact}>
                    <span className={styles.factKey}>เวลาทำการ</span>
                    <span className={styles.factVal}>08:30 – 20:30 (จันทร์ – ศุกร์)</span>
                </div>
                <div className={styles.fact}>
                    <span className={styles.factKey}>จองล่วงหน้า</span>
                    <span className={styles.factVal}>ได้ {MAX_ADVANCE_DAYS} วัน</span>
                </div>
                <div className={styles.fact}>
                    <span className={styles.factKey}>จองค้างได้</span>
                    <span className={styles.factVal}>ไม่เกิน {MAX_ACTIVE_BOOKINGS} รายการ</span>
                </div>
            </div>

            <div className={styles.actions}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Button full>เข้าสู่ระบบ</Button>
                </Link>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                    <Button full variant="secondary">สมัครบัญชี</Button>
                </Link>
            </div>
        </div>
    );
}
