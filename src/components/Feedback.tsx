import type { ReactNode } from 'react';
import styles from './Feedback.module.css';

export function ErrorBox({ title = 'เกิดข้อผิดพลาด', message }: { title?: string; message: string }) {
    // role="alert" = โปรแกรมอ่านหน้าจอจะอ่านทันทีที่ขึ้น ไม่ต้องรอผู้ใช้เลื่อนไปเจอ
    return (
        <div className={styles.error} role="alert">
            <span aria-hidden="true">⚠</span>
            <span className={styles.errorBody}>
                <strong className={styles.errorTitle}>{title}</strong>
                {message}
            </span>
        </div>
    );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
    return (
        <div className={styles.empty}>
            <span className={styles.emptyTitle}>{title}</span>
            {text && <span className={styles.emptyText}>{text}</span>}
            {action}
        </div>
    );
}

export function Notice({ children }: { children: ReactNode }) {
    return <div className={styles.notice}>{children}</div>;
}
