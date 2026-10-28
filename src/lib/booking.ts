import { todayTH, nowMinutesTH } from './date';
import { slotStart } from './slot';
import type { Booking } from './types';

export type BookingState = 'upcoming' | 'past' | 'cancelled';

/** เลยเวลาเริ่มใช้งานไปแล้วหรือยัง — คำนวณสดทุกครั้ง ไม่ได้เก็บในฐานข้อมูล */
export const isPast = (b: Booking): boolean => {
    const today = todayTH();
    if (b.date < today) return true;
    return b.date === today && nowMinutesTH() >= slotStart(b.startSlot);
};

export const stateOf = (b: Booking): BookingState => {
    if (b.status === 'cancelled') return 'cancelled';
    return isPast(b) ? 'past' : 'upcoming';
};

export const canCancel = (b: Booking): boolean => stateOf(b) === 'upcoming';

export const hoursOf = (b: Booking): number => b.endSlot - b.startSlot + 1;
