// ★ ประตูเดียวที่หน้าเว็บใช้คุยกับโลกภายนอก
// ไม่มีหน้าไหนเรียก fetch เอง ทุกอย่างผ่านที่นี่
// สลับระหว่างของปลอมกับของจริงด้วย VITE_USE_MOCK ใน .env โดยไม่ต้องแก้โค้ดหน้าเว็บสักบรรทัด
import { http, refreshSession } from './http';
import * as mock from './mock';
import type {
    Availability, Booking, DayOverride, DayState, LoginResult, MyBookings, NewBooking, User, AdminBookings
} from './types';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const qs = (params: Record<string, string | number | undefined>): string => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : '';
};

// ===== auth =====

export const login = (username: string, password: string): Promise<LoginResult> =>
    USE_MOCK
        ? mock.login(username, password)
        : http<LoginResult>('/auth/login', { method: 'POST', body: { username, password }, auth: false });

export const register = (username: string, password: string): Promise<void> =>
    USE_MOCK
        ? mock.register(username, password)
        : http<void>('/auth/register', { method: 'POST', body: { username, password }, auth: false });

export const logout = (): Promise<void> =>
    USE_MOCK
        ? mock.logout()
        : http<void>('/auth/logout', { method: 'POST', auth: false });

export const getMe = (): Promise<User> =>
    USE_MOCK
        ? mock.restore().then((u) => {
              if (!u) throw new Error('ไม่ได้ล็อกอิน');
              return u;
          })
        : http<User>('/auth/me');

/** ใช้ตอนเปิดเว็บครั้งแรก: ยังล็อกอินค้างอยู่หรือเปล่า */
export const restoreSession = async (): Promise<User | null> => {
    if (USE_MOCK) return mock.restore();
    const token = await refreshSession();
    if (!token) return null;
    try {
        return await http<User>('/auth/me');
    } catch {
        return null;
    }
};

// ===== availability =====

export const getAvailability = (date: string): Promise<Availability> =>
    USE_MOCK
        ? mock.getAvailability(date)
        : http<Availability>(`/availability${qs({ date })}`, { auth: false });

/** เปิด/ปิดของหลายวันพร้อมกัน — แถบเลือกวันใช้ตัวนี้แทนการเดาเอาเองว่าเสาร์อาทิตย์ปิด */
export const getDayStates = (from: string, to: string): Promise<{ days: DayState[] }> =>
    USE_MOCK
        ? mock.getDayStates(from, to)
        : http<{ days: DayState[] }>(`/availability/days${qs({ from, to })}`, { auth: false });

// ===== bookings =====

export const createBooking = (input: NewBooking): Promise<Booking> =>
    USE_MOCK
        ? mock.createBooking(input)
        : http<Booking>('/bookings', { method: 'POST', body: input });

export const getMyBookings = (): Promise<MyBookings> =>
    USE_MOCK ? mock.getMyBookings() : http<MyBookings>('/bookings/me');

export const cancelBooking = (id: string): Promise<Booking> =>
    USE_MOCK ? mock.cancelBooking(id) : http<Booking>(`/bookings/${id}/cancel`, { method: 'POST' });

// ===== admin =====

export const adminListBookings = (params: {
    from?: string; to?: string; q?: string; status?: string; page?: number; limit?: number;
}): Promise<AdminBookings> =>
    USE_MOCK ? mock.adminListBookings(params) : http<AdminBookings>(`/admin/bookings${qs(params)}`);

export const adminCancelBooking = (id: string, reason: string): Promise<Booking> =>
    USE_MOCK
        ? mock.adminCancelBooking(id, reason)
        : http<Booking>(`/admin/bookings/${id}/cancel`, { method: 'POST', body: { reason } });

export const adminListDayOverrides = (params: { from?: string; to?: string } = {}): Promise<{ overrides: DayOverride[] }> =>
    USE_MOCK
        ? mock.adminListDayOverrides(params)
        : http<{ overrides: DayOverride[] }>(`/admin/day-overrides${qs(params)}`);

export const adminSetDayOverride = (date: string, isOpen: boolean, note?: string): Promise<DayOverride> =>
    USE_MOCK
        ? mock.adminSetDayOverride(date, isOpen, note)
        : http<DayOverride>('/admin/day-overrides', { method: 'POST', body: { date, isOpen, ...(note ? { note } : {}) } });

export const adminRemoveDayOverride = (date: string): Promise<void> =>
    USE_MOCK ? mock.adminRemoveDayOverride(date) : http<void>(`/admin/day-overrides/${date}`, { method: 'DELETE' });
