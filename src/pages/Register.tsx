import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { ErrorBox } from '../components/Feedback';
import { FullPageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/useAuth';
import * as api from '../lib/api';
import { messageOf } from '../lib/errors';
import styles from './Auth.module.css';

export function Register() {
    const { user, ready, login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [fieldError, setFieldError] = useState<{ username?: string; password?: string; confirm?: string }>({});
    const [busy, setBusy] = useState(false);

    if (!ready) return <FullPageSpinner />;
    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/bookings'} replace />;

    // ตรวจฝั่งนี้เพื่อให้ผู้ใช้รู้เร็ว ไม่ใช่เพื่อความปลอดภัย — backend ตรวจซ้ำอยู่แล้ว
    const validate = (): boolean => {
        const next: typeof fieldError = {};
        const u = username.trim();
        if (u.length < 3 || /\s/.test(u)) next.username = 'ต้องมีอย่างน้อย 3 ตัวอักษร และห้ามมีช่องว่าง';
        if (password.length < 8 || /\s/.test(password)) next.password = 'ต้องยาวอย่างน้อย 8 ตัว และห้ามมีช่องว่าง';
        if (confirm !== password) next.confirm = 'รหัสผ่านไม่ตรงกัน';
        setFieldError(next);
        return Object.keys(next).length === 0;
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validate()) return;

        setBusy(true);
        try {
            const u = username.trim();
            await api.register(u, password);
            // สมัครเสร็จพาเข้าระบบให้เลย ไม่ต้องให้พิมพ์ซ้ำอีกรอบ
            const me = await login(u, password);
            navigate(me.role === 'admin' ? '/admin' : '/bookings', { replace: true });
        } catch (err) {
            setError(messageOf(err));
            setBusy(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <Link to="/" className={styles.back}>← กลับหน้าแรก</Link>

            <h1 className={styles.title}>สมัครบัญชี</h1>
            <p className={styles.lead}>สมัครครั้งเดียว ใช้จองได้ตลอด</p>

            <form className={styles.form} onSubmit={onSubmit} noValidate>
                {error && <ErrorBox title="สมัครไม่สำเร็จ" message={error} />}

                <Field
                    label="ชื่อผู้ใช้"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    hint="อย่างน้อย 3 ตัวอักษร ห้ามมีช่องว่าง"
                    {...(fieldError.username ? { error: fieldError.username } : {})}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={busy}
                />

                <Field
                    label="รหัสผ่าน"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    hint="อย่างน้อย 8 ตัวอักษร"
                    {...(fieldError.password ? { error: fieldError.password } : {})}
                    autoComplete="new-password"
                    disabled={busy}
                />

                <Field
                    label="ยืนยันรหัสผ่าน"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    {...(fieldError.confirm ? { error: fieldError.confirm } : {})}
                    autoComplete="new-password"
                    disabled={busy}
                />

                <Button type="submit" full loading={busy}>
                    {busy ? 'กำลังสมัคร' : 'สมัครบัญชี'}
                </Button>
            </form>

            <p className={styles.foot}>
                มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
            </p>
        </div>
    );
}
