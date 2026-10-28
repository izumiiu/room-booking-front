import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { ErrorBox } from '../components/Feedback';
import { FullPageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/useAuth';
import { messageOf } from '../lib/errors';
import styles from './Auth.module.css';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function Login() {
    const { user, ready, login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (!ready) return <FullPageSpinner />;
    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/bookings'} replace />;

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            // backend ส่ง role กลับมาด้วย จึงรู้ได้ทันทีว่าต้องไปหน้าไหน
            const me = await login(username.trim(), password);
            navigate(me.role === 'admin' ? '/admin' : '/bookings', { replace: true });
        } catch (err) {
            setError(messageOf(err));
            setBusy(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <Link to="/" className={styles.back}>← กลับหน้าแรก</Link>

            <h1 className={styles.title}>เข้าสู่ระบบ</h1>
            <p className={styles.lead}>ใช้บัญชีเดียวกับที่สมัครไว้</p>

            <form className={styles.form} onSubmit={onSubmit} noValidate>
                {error && <ErrorBox title="เข้าสู่ระบบไม่สำเร็จ" message={error} />}

                <Field
                    label="ชื่อผู้ใช้"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    autoComplete="current-password"
                    disabled={busy}
                />

                <Button type="submit" full loading={busy}>
                    {busy ? 'กำลังเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
                </Button>
            </form>

            {USE_MOCK && (
                <div className={styles.demo}>
                    โหมดทดลอง — ผู้ใช้ <code>somchai</code> / <code>password123</code><br />
                    เจ้าหน้าที่ <code>admin</code> / <code>admin12345</code>
                </div>
            )}

            <p className={styles.foot}>
                ยังไม่มีบัญชี? <Link to="/register">สมัครบัญชี</Link>
            </p>
        </div>
    );
}
