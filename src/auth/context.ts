import { createContext } from 'react';
import type { User } from '../lib/types';

export interface AuthState {
    user: User | null;
    /** ตรวจเสร็จหรือยังว่ามี session ค้างอยู่ — ก่อนนี้ยังตัดสินใจอะไรไม่ได้ */
    ready: boolean;
    login: (username: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
