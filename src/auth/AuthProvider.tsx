import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../lib/api';
import { setAccessToken, setSessionLostHandler } from '../lib/http';
import { AuthContext } from './context';
import type { User } from '../lib/types';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // ธงกันผลลัพธ์ที่มาถึงหลัง component ถูกถอดออกไปแล้ว
        let alive = true;

        // ถ้าต่ออายุ token ไม่สำเร็จกลางทาง ให้ถือว่าหลุด session ทันที
        setSessionLostHandler(() => { if (alive) setUser(null); });

        api.restoreSession()
            .then((u) => { if (alive) setUser(u); })
            .catch(() => { /* ไม่มี session ค้าง = ยังไม่ได้ล็อกอิน ไม่ใช่ error */ })
            .finally(() => { if (alive) setReady(true); });

        return () => { alive = false; setSessionLostHandler(null); };
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<User> => {
        const res = await api.login(username, password);
        setAccessToken(res.accessToken);   // อยู่ใน memory เท่านั้น
        setUser(res.user);
        return res.user;
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            await api.logout();
        } finally {
            // ล้างฝั่งเราเสมอ แม้ server จะตอบไม่สำเร็จ
            setAccessToken(null);
            setUser(null);
        }
    }, []);

    const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
