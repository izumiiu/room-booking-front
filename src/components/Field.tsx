import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface Common {
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    optional?: boolean;
}

type InputProps = Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'required'>;

export function Field({ label, hint, error, required, optional, ...rest }: InputProps) {
    const id = useId();
    const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={id}>
                {label}
                {required && <span className={styles.req} aria-hidden="true">*</span>}
                {optional && <span className={styles.optional}>(ไม่บังคับ)</span>}
            </label>
            <input
                id={id}
                className={`${styles.input} ${error ? styles.invalid : ''}`}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...rest}
            />
            {error
                ? <span id={`${id}-err`} className={styles.error}>{error}</span>
                : hint ? <span id={`${id}-hint`} className={styles.hint}>{hint}</span> : null}
        </div>
    );
}

type AreaProps = Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>;

export function TextareaField({ label, hint, error, required, optional, ...rest }: AreaProps) {
    const id = useId();
    const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={id}>
                {label}
                {required && <span className={styles.req} aria-hidden="true">*</span>}
                {optional && <span className={styles.optional}>(ไม่บังคับ)</span>}
            </label>
            <textarea
                id={id}
                className={`${styles.input} ${error ? styles.invalid : ''}`}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...rest}
            />
            {error
                ? <span id={`${id}-err`} className={styles.error}>{error}</span>
                : hint ? <span id={`${id}-hint`} className={styles.hint}>{hint}</span> : null}
        </div>
    );
}
