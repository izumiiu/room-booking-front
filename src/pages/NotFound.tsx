import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import styles from './Auth.module.css';

export function NotFound() {
    return (
        <div className={styles.wrap}>
            <h1 className={styles.title}>ไม่พบหน้านี้</h1>
            <p className={styles.lead}>ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <Button full variant="secondary">กลับหน้าแรก</Button>
            </Link>
        </div>
    );
}
