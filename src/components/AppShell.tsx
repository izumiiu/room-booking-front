import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import styles from './AppShell.module.css';

export function AppShell({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <div className={styles.shell}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.brand}>
                        <span className={styles.room}>ห้องประชุม TC-402</span>
                        {user?.role === 'admin'
                            ? <span className={styles.staff}>เจ้าหน้าที่</span>
                            : <span className={styles.sub}>08:30 – 20:30</span>}
                    </div>
                    {user && (
                        <div className={styles.right}>
                            <span className={styles.who}>{user.username}</span>
                            <button type="button" className={styles.signout} onClick={handleSignOut}>
                                ออกจากระบบ
                            </button>
                        </div>
                    )}
                </div>
            </header>
            <main className={styles.main}>{children}</main>
        </div>
    );
}
