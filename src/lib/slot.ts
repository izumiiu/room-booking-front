// สำเนาค่าคงที่จาก backend (src/utils/slot.ts)
// ต้องตรงกันเสมอ ถ้าฝั่งไหนเปลี่ยนต้องแก้ทั้งสองที่
export const OPEN_MIN = 8 * 60 + 30;   // 08:30
export const SLOT_MIN = 60;
export const SLOT_COUNT = 12;
export const MAX_ADVANCE_DAYS = 7;
export const MAX_ACTIVE_BOOKINGS = 3;

export const slotStart = (slot: number): number => OPEN_MIN + slot * SLOT_MIN;
export const slotEnd = (slot: number): number => slotStart(slot) + SLOT_MIN;

export const toHHMM = (min: number): string =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const slotLabel = (slot: number): string =>
    `${toHHMM(slotStart(slot))} – ${toHHMM(slotEnd(slot))}`;

/** ช่วง start–end รวมกันเป็นข้อความเดียว เช่น 10:30 – 12:30 */
export const rangeLabel = (startSlot: number, endSlot: number): string =>
    `${toHHMM(slotStart(startSlot))} – ${toHHMM(slotEnd(endSlot))}`;

export const slotCountOf = (startSlot: number, endSlot: number): number =>
    endSlot - startSlot + 1;
