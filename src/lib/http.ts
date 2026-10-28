import { ApiError } from './errors';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3500/api';

// ★ access token อยู่ในตัวแปรนี้เท่านั้น ไม่เคยแตะ localStorage
//   localStorage อ่านได้จาก JavaScript ทุกตัวในหน้า — XSS ตัวเดียว token หลุด
//   ตัวแปรนี้หายเมื่อ refresh หน้า ซึ่งเป็นเหตุผลที่ต้องมี /auth/refresh
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (token: string | null): void => { accessToken = token; };
export const setSessionLostHandler = (fn: (() => void) | null): void => { onSessionLost = fn; };

const doRefresh = async (): Promise<string | null> => {
    try {
        const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken?: string };
        if (!data.accessToken) return null;
        accessToken = data.accessToken;
        return accessToken;
    } catch {
        return null;
    }
};

// ★ single-flight: token อายุ 10 นาที พอหมดอายุ หน้าที่ยิง 3 request พร้อมกัน
//   จะได้ 401 ทั้งสามแล้วยิง refresh ซ้อนกันสามครั้ง
//   ตัวนี้ทำให้คนที่มาทีหลังรอคิวเดียวกันแทนที่จะยิงใหม่
let refreshing: Promise<string | null> | null = null;

export const refreshSession = (): Promise<string | null> => {
    if (!refreshing) {
        refreshing = doRefresh().finally(() => { refreshing = null; });
    }
    return refreshing;
};

interface Options {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
    auth?: boolean;
}

export async function http<T>(path: string, opts: Options = {}, allowRetry = true): Promise<T> {
    const { method = 'GET', body, auth = true } = opts;

    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    let res: Response;
    try {
        res = await fetch(`${BASE}${path}`, {
            method,
            headers,
            credentials: 'include',   // ★ ขาดบรรทัดนี้ = browser ไม่แนบ httpOnly cookie = refresh ล้มเงียบ ๆ
            ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });
    } catch {
        throw new ApiError(0, 'NETWORK', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
    }

    // token หมดอายุ -> ต่ออายุเงียบ ๆ แล้วลองใหม่หนึ่งครั้ง ผู้ใช้ไม่รู้สึกอะไร
    if (res.status === 401 && auth && allowRetry) {
        const fresh = await refreshSession();
        if (fresh) return http<T>(path, opts, false);
        setAccessToken(null);
        onSessionLost?.();
    }

    if (res.status === 204) return undefined as T;

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
        const d = (data ?? {}) as { message?: string; code?: string };
        throw new ApiError(res.status, d.code ?? 'UNKNOWN', d.message ?? 'เกิดข้อผิดพลาด');
    }

    return data as T;
}
