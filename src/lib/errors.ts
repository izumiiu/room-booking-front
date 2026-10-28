export class ApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

/** ข้อความสำรองเผื่อ backend ไม่ได้ส่ง message มา หรือเน็ตล่มก่อนถึง server */
const FALLBACK: Record<string, string> = {
    SLOT_TAKEN: 'ช่วงเวลานี้เพิ่งถูกจองไป กรุณาเลือกช่วงใหม่',
    QUOTA_FULL: 'คุณจองค้างไว้ครบจำนวนแล้ว',
    DAY_CLOSED: 'วันดังกล่าวปิดให้บริการ',
    ALREADY_STARTED: 'เลยเวลาเริ่มใช้งานแล้ว ยกเลิกไม่ได้',
    ALREADY_CANCELLED: 'การจองนี้ถูกยกเลิกไปแล้ว',
    NOT_OWNER: 'ไม่มีสิทธิ์ทำรายการนี้',
    BAD_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    NETWORK: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
};

export const messageOf = (err: unknown): string => {
    if (err instanceof ApiError) return err.message || FALLBACK[err.code] || 'เกิดข้อผิดพลาด';
    if (err instanceof Error) return err.message;
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
};

/** error ที่แปลว่า "ตารางเปลี่ยนไปแล้ว" — หน้าจอควรโหลดใหม่ให้ผู้ใช้เห็นของล่าสุด */
export const needsRefresh = (err: unknown): boolean =>
    err instanceof ApiError && (err.code === 'SLOT_TAKEN' || err.code === 'DAY_CLOSED');
