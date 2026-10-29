// backend จำลอง — ตอบคำตอบรูปแบบเดียวกับของจริงทุก field
// และบังคับกฎเดียวกันด้วย เพื่อให้หน้าเว็บได้เจอ error ทุกแบบตั้งแต่ตอนพัฒนา
import { ApiError } from './errors';
import { SLOT_COUNT, slotStart, slotEnd, toHHMM, MAX_ACTIVE_BOOKINGS, MAX_ADVANCE_DAYS } from './slot';
import { todayTH, nowMinutesTH, addDays, isWeekend } from './date';
import type {
    Availability, Booking, DayOverride, DayState, LoginResult, MyBookings, NewBooking, Role, Slot, User, AdminBookings
} from './types';

// หน่วงเวลาให้เหมือนเน็ตจริง ถ้าไม่หน่วง เราจะลืมทำสถานะ "กำลังโหลด"
// แล้วพอต่อ backend จริงหน้าจะกระพริบ
const DELAY = 300;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface MockUser { id: string; username: string; password: string; role: Role }
interface MockBooking extends Booking { userId: string }

const users: MockUser[] = [
    { id: 'u1', username: 'somchai', password: 'password123', role: 'normalUser' },
    { id: 'u2', username: 'admin', password: 'admin12345', role: 'admin' }
];

const nextOpenDays = (n: number): string[] => {
    const out: string[] = [];
    let d = todayTH();
    while (out.length < n) {
        d = addDays(d, 1);
        if (!isWeekend(d)) out.push(d);
    }
    return out;
};

const [D1 = todayTH(), D2 = todayTH()] = nextOpenDays(2);

const mk = (b: Omit<MockBooking, 'start' | 'end' | 'createdAt'>): MockBooking => ({
    ...b,
    start: toHHMM(slotStart(b.startSlot)),
    end: toHHMM(slotEnd(b.endSlot)),
    createdAt: new Date().toISOString()
});

let seq = 100;
const newId = () => `b${++seq}`;

const bookings: MockBooking[] = [
    mk({
        id: newId(), userId: 'u1', date: D1, startSlot: 1, endSlot: 1,
        topic: 'ประชุมคณะกรรมการประจำเดือน', purpose: 'สรุปผลการดำเนินงานไตรมาส', attendees: 12,
        fullName: 'สมชาย ใจดี', department: 'คณะวิทยาศาสตร์', phone: '081-234-5678',
        email: 'somchai@nu.ac.th', status: 'booked', cancelReason: null, cancelledAt: null
    }),
    mk({
        id: newId(), userId: 'u3', date: D1, startSlot: 5, endSlot: 6,
        topic: 'อบรมระบบสารบรรณอิเล็กทรอนิกส์', purpose: null, attendees: 25,
        fullName: 'มานี รักเรียน', department: 'กองกลาง', phone: '082-345-6789',
        email: 'manee@nu.ac.th', status: 'booked', cancelReason: null, cancelledAt: null
    }),
    mk({
        id: newId(), userId: 'u1', date: D2, startSlot: 3, endSlot: 3,
        topic: 'สัมภาษณ์นักศึกษาฝึกงาน', purpose: null, attendees: 4,
        fullName: 'สมชาย ใจดี', department: 'คณะวิทยาศาสตร์', phone: '081-234-5678',
        email: 'somchai@nu.ac.th', status: 'booked', cancelReason: null, cancelledAt: null
    }),
    mk({
        id: newId(), userId: 'u1', date: addDays(todayTH(), -9), startSlot: 2, endSlot: 3,
        topic: 'ประชุมวางแผนโครงการ', purpose: null, attendees: 8,
        fullName: 'สมชาย ใจดี', department: 'คณะวิทยาศาสตร์', phone: '081-234-5678',
        email: 'somchai@nu.ac.th', status: 'cancelled',
        cancelReason: 'เลื่อนการประชุม', cancelledAt: new Date().toISOString()
    })
];

const overrides: DayOverride[] = [];

// เก็บแค่ว่า "ใครล็อกอินอยู่" ไม่ใช่ token จริง — ของปลอมล้วน
// มีไว้ให้ refresh หน้าแล้วยังอยู่ เหมือนที่ httpOnly cookie ทำในระบบจริง
const SESSION_KEY = 'mock-session';
const readSession = (): string | null => {
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
};
const writeSession = (id: string | null): void => {
    try {
        if (id) sessionStorage.setItem(SESSION_KEY, id);
        else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* โหมดส่วนตัวของ browser อาจห้ามเขียน */ }
};

const toUser = (u: MockUser): User => ({ id: u.id, username: u.username, role: u.role });
// ตัด userId ออกก่อนส่งให้หน้าเว็บ — backend จริงก็ไม่ได้ส่ง field นี้ออกมา
const strip = (b: MockBooking): Booking => ({
    id: b.id, date: b.date, startSlot: b.startSlot, endSlot: b.endSlot,
    start: b.start, end: b.end, topic: b.topic, purpose: b.purpose,
    attendees: b.attendees, fullName: b.fullName, department: b.department,
    phone: b.phone, email: b.email, status: b.status,
    cancelReason: b.cancelReason, cancelledAt: b.cancelledAt, createdAt: b.createdAt
});

const currentUser = (): MockUser => {
    const id = readSession();
    const u = users.find((x) => x.id === id);
    if (!u) throw new ApiError(401, 'NO_AUTH', 'กรุณาเข้าสู่ระบบ');
    return u;
};

const isDayOpen = (date: string): boolean => {
    const o = overrides.find((x) => x.date === date);
    return o ? o.isOpen : !isWeekend(date);
};

const takenSlots = (date: string): Set<number> => {
    const taken = new Set<number>();
    for (const b of bookings) {
        if (b.date !== date || b.status !== 'booked') continue;
        for (let s = b.startSlot; s <= b.endSlot; s++) taken.add(s);
    }
    return taken;
};

const activeCount = (userId: string): number => {
    const today = todayTH();
    const started = Math.floor((nowMinutesTH() - slotStart(0)) / 60);
    return bookings.filter((b) =>
        b.userId === userId && b.status === 'booked' &&
        (b.date > today || (b.date === today && b.startSlot > started))
    ).length;
};

// ===== auth =====

export const login = async (username: string, password: string): Promise<LoginResult> => {
    await sleep(DELAY);
    const u = users.find((x) => x.username === username && x.password === password);
    if (!u) throw new ApiError(401, 'BAD_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    writeSession(u.id);
    return { accessToken: `mock-token-${u.id}`, user: toUser(u) };
};

export const register = async (username: string, password: string): Promise<void> => {
    await sleep(DELAY);
    if (username.length < 3 || /\s/.test(username)) throw new ApiError(400, 'BAD_USERNAME', 'ชื่อต้องมีอย่างน้อย 3 ตัวอักษร และห้ามมีช่องว่าง');
    if (password.length < 8 || /\s/.test(password)) throw new ApiError(400, 'BAD_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว และห้ามมีช่องว่าง');
    if (users.some((x) => x.username === username)) throw new ApiError(409, 'DUPLICATE', 'ชื่อผู้ใช้นี้ถูกใช้แล้ว');
    users.push({ id: `u${users.length + 1}`, username, password, role: 'normalUser' });
};

export const restore = async (): Promise<User | null> => {
    await sleep(120);
    const id = readSession();
    const u = users.find((x) => x.id === id);
    return u ? toUser(u) : null;
};

export const logout = async (): Promise<void> => {
    await sleep(120);
    writeSession(null);
};

// ===== availability =====

export const getAvailability = async (date: string): Promise<Availability> => {
    await sleep(DELAY);
    const today = todayTH();
    const nowMinutes = nowMinutesTH();
    const open = isDayOpen(date);
    const taken = open ? takenSlots(date) : new Set<number>();

    const slots: Slot[] = [];
    for (let s = 0; s < SLOT_COUNT; s++) {
        let status: Slot['status'];
        if (!open) status = 'closed';
        else if (date < today) status = 'past';
        else if (date === today && nowMinutes >= slotStart(s)) status = 'past';
        else if (taken.has(s)) status = 'booked';
        else status = 'free';
        slots.push({ slot: s, start: toHHMM(slotStart(s)), end: toHHMM(slotEnd(s)), status });
    }
    return { date, today, nowMinutes, isOpen: open, slots };
};

export const getDayStates = async (from: string, to: string): Promise<{ days: DayState[] }> => {
    await sleep(200);
    const days: DayState[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
        const o = overrides.find((x) => x.date === d);
        days.push({ date: d, isOpen: o ? o.isOpen : !isWeekend(d), note: o?.note ?? null });
    }
    return { days };
};

// ===== bookings =====

export const createBooking = async (input: NewBooking): Promise<Booking> => {
    await sleep(DELAY + 200);
    const me = currentUser();
    const today = todayTH();

    if (input.date < today) throw new ApiError(400, 'PAST_DATE', 'ไม่สามารถจองย้อนหลังได้');
    if (input.date > addDays(today, MAX_ADVANCE_DAYS - 1))
        throw new ApiError(400, 'TOO_FAR', `จองล่วงหน้าได้ไม่เกิน ${MAX_ADVANCE_DAYS} วัน`);
    if (!isDayOpen(input.date)) throw new ApiError(409, 'DAY_CLOSED', 'วันดังกล่าวปิดให้บริการ');
    if (input.startSlot > input.endSlot) throw new ApiError(400, 'BAD_RANGE', 'เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด');
    if (input.date === today && nowMinutesTH() >= slotStart(input.startSlot))
        throw new ApiError(400, 'PAST_SLOT', 'ช่วงเวลาที่เลือกผ่านไปแล้ว');
    if (activeCount(me.id) >= MAX_ACTIVE_BOOKINGS)
        throw new ApiError(409, 'QUOTA_FULL', `จองค้างไว้ได้ไม่เกิน ${MAX_ACTIVE_BOOKINGS} รายการ`);

    const taken = takenSlots(input.date);
    for (let s = input.startSlot; s <= input.endSlot; s++) {
        if (taken.has(s)) throw new ApiError(409, 'SLOT_TAKEN', 'ช่วงเวลานี้เพิ่งถูกจองไป กรุณาเลือกช่วงใหม่');
    }

    const created = mk({
        id: newId(), userId: me.id,
        date: input.date, startSlot: input.startSlot, endSlot: input.endSlot,
        topic: input.topic, purpose: input.purpose ?? null, attendees: input.attendees,
        fullName: input.fullName, department: input.department ?? null,
        phone: input.phone, email: input.email,
        status: 'booked', cancelReason: null, cancelledAt: null
    });
    bookings.push(created);
    return strip(created);
};

export const getMyBookings = async (): Promise<MyBookings> => {
    await sleep(DELAY);
    const me = currentUser();
    const mine = bookings
        .filter((b) => b.userId === me.id)
        .sort((a, b) => (b.date === a.date ? b.startSlot - a.startSlot : b.date.localeCompare(a.date)))
        .map(strip);
    return { bookings: mine, quota: { max: MAX_ACTIVE_BOOKINGS, used: activeCount(me.id) } };
};

export const cancelBooking = async (id: string): Promise<Booking> => {
    await sleep(DELAY);
    const me = currentUser();
    const b = bookings.find((x) => x.id === id);
    if (!b) throw new ApiError(404, 'NOT_FOUND', 'ไม่พบการจองนี้');
    if (b.userId !== me.id) throw new ApiError(403, 'NOT_OWNER', 'ยกเลิกได้เฉพาะการจองของตัวเอง');
    if (b.status === 'cancelled') throw new ApiError(409, 'ALREADY_CANCELLED', 'การจองนี้ถูกยกเลิกไปแล้ว');

    const today = todayTH();
    if (b.date < today || (b.date === today && nowMinutesTH() >= slotStart(b.startSlot)))
        throw new ApiError(409, 'ALREADY_STARTED', 'เลยเวลาเริ่มใช้งานแล้ว ยกเลิกไม่ได้');

    b.status = 'cancelled';
    b.cancelledAt = new Date().toISOString();
    return strip(b);
};

// ===== admin =====

export const adminListBookings = async (params: {
    from?: string; to?: string; q?: string; status?: string; page?: number; limit?: number;
}): Promise<AdminBookings> => {
    await sleep(DELAY);
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const q = params.q?.trim().toLowerCase() ?? '';

    const matched = bookings.filter((b) => {
        if (params.from && b.date < params.from) return false;
        if (params.to && b.date > params.to) return false;
        if (params.status && b.status !== params.status) return false;
        if (q && ![b.fullName, b.topic, b.department ?? '', b.email].some((f) => f.toLowerCase().includes(q))) return false;
        return true;
    }).sort((a, b) => (b.date === a.date ? b.startSlot - a.startSlot : b.date.localeCompare(a.date)));

    return {
        bookings: matched.slice((page - 1) * limit, page * limit).map(strip),
        total: matched.length,
        page,
        limit
    };
};

export const adminCancelBooking = async (id: string, reason: string): Promise<Booking> => {
    await sleep(DELAY);
    const b = bookings.find((x) => x.id === id);
    if (!b) throw new ApiError(404, 'NOT_FOUND', 'ไม่พบการจองนี้');
    if (b.status === 'cancelled') throw new ApiError(409, 'ALREADY_CANCELLED', 'การจองนี้ถูกยกเลิกไปแล้ว');
    b.status = 'cancelled';
    b.cancelReason = reason;
    b.cancelledAt = new Date().toISOString();
    return strip(b);
};

export const adminListDayOverrides = async (
    params: { from?: string; to?: string } = {}
): Promise<{ overrides: DayOverride[] }> => {
    await sleep(DELAY);
    const list = overrides.filter((o) => {
        if (params.from && o.date < params.from) return false;
        if (params.to && o.date > params.to) return false;
        return true;
    });
    return { overrides: [...list].sort((a, b) => a.date.localeCompare(b.date)) };
};

export const adminSetDayOverride = async (date: string, isOpen: boolean, note?: string): Promise<DayOverride> => {
    await sleep(DELAY);
    if (!isOpen) {
        const count = bookings.filter((b) => b.date === date && b.status === 'booked').length;
        if (count > 0) throw new ApiError(409, 'HAS_BOOKINGS', `วันนี้มีการจองค้างอยู่ ${count} รายการ กรุณายกเลิกก่อนปิดห้อง`);
    }
    const next: DayOverride = { date, isOpen, note: note ?? null, updatedAt: new Date().toISOString() };
    const i = overrides.findIndex((o) => o.date === date);
    if (i >= 0) overrides[i] = next; else overrides.push(next);
    return next;
};

export const adminRemoveDayOverride = async (date: string): Promise<void> => {
    await sleep(DELAY);
    const i = overrides.findIndex((o) => o.date === date);
    if (i >= 0) overrides.splice(i, 1);
};
