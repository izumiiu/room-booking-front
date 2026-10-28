import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './Modal.module.css';

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
}

export function Modal({ title, onClose, children, footer, wide = false }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeRef.current?.focus();

        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);

        // กันหน้าข้างหลังเลื่อนตามขณะเปิดกล่อง
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div
            className={styles.backdrop}
            // คลิกพื้นหลังเพื่อปิด แต่คลิกในกล่องต้องไม่ปิด จึงเช็คว่าคลิกโดนตัว backdrop เองไหม
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`${styles.panel} ${wide ? styles.wide : ''}`} role="dialog" aria-modal="true" aria-label={title}>
                <div className={styles.head}>
                    <h2 className={styles.title}>{title}</h2>
                    <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="ปิด">✕</button>
                </div>
                {children}
                {footer && <div className={styles.actions}>{footer}</div>}
            </div>
        </div>
    );
}
