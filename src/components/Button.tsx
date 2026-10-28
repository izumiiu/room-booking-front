import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    full?: boolean;
    loading?: boolean;
    children: ReactNode;
}

export function Button({
    variant = 'primary', full = false, loading = false,
    disabled, children, className, type = 'button', ...rest
}: Props) {
    const cls = [styles.btn, styles[variant], full ? styles.full : '', className ?? '']
        .filter(Boolean).join(' ');

    return (
        <button type={type} className={cls} disabled={disabled === true || loading} {...rest}>
            {loading && <span className={styles.spin} aria-hidden="true" />}
            {children}
        </button>
    );
}
