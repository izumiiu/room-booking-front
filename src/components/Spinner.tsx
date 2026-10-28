import styles from './Spinner.module.css';

export function Spinner() {
    return <span className={styles.ring} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'กำลังโหลด' }: { label?: string }) {
    return (
        <div className={styles.block} role="status">
            <span className={styles.ring} aria-hidden="true" />
            <span>{label}…</span>
        </div>
    );
}

export function FullPageSpinner({ label = 'กำลังโหลด' }: { label?: string }) {
    return (
        <div className={`${styles.block} ${styles.page}`} role="status">
            <span className={styles.ring} aria-hidden="true" />
            <span>{label}…</span>
        </div>
    );
}
