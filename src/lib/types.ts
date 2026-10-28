// รูปร่างข้อมูลทั้งหมดที่วิ่งระหว่าง frontend กับ backend
// ต้องตรงกับที่ backend ส่งจริงทุก field — ถ้าไม่ตรง TypeScript จะฟ้องตอน compile ไม่ใช่ตอนผู้ใช้เจอหน้าขาว

export type Role = 'normalUser' | 'admin';

export interface User {
    id: string;
    username: string;
    role: Role;
}

export type SlotStatus = 'free' | 'booked' | 'past' | 'closed';

export interface Slot {
    slot: number;
    start: string;   // "08:30"
    end: string;     // "09:30"
    status: SlotStatus;
}

export interface Availability {
    date: string;
    today: string;
    nowMinutes: number;
    isOpen: boolean;
    slots: Slot[];
}

export interface Booking {
    id: string;
    date: string;
    startSlot: number;
    endSlot: number;
    start: string;
    end: string;
    topic: string;
    purpose: string | null;
    attendees: number;
    fullName: string;
    department: string | null;
    phone: string;
    email: string;
    status: 'booked' | 'cancelled';
    cancelReason: string | null;
    cancelledAt: string | null;
    createdAt: string | null;
}

export interface MyBookings {
    bookings: Booking[];
    quota: { max: number; used: number };
}

export interface NewBooking {
    date: string;
    startSlot: number;
    endSlot: number;
    topic: string;
    purpose?: string;
    attendees: number;
    fullName: string;
    department?: string;
    phone: string;
    email: string;
}

export interface LoginResult {
    accessToken: string;
    user: User;
}

export interface DayOverride {
    date: string;
    isOpen: boolean;
    note: string | null;
    updatedAt: string | null;
}

export interface AdminBookings {
    bookings: Booking[];
    total: number;
    page: number;
    limit: number;
}
