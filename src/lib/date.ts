const TZ = 'Asia/Bangkok';

/** "วันนี้" ในสายตาผู้ใช้ไทย ไม่ใช่ของเครื่อง */
export const todayTH = (): string => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

export const nowMinutesTH = (): number => {
    const parts = new Date()
        .toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' })
        .split(':');
    return Number(parts[0] ?? 0) * 60 + Number(parts[1] ?? 0);
};

/** บวกวันบน UTC ล้วน ผลเหมือนกันทุกเครื่อง */
export const addDays = (date: string, n: number): string => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

const dayIndex = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

export const isWeekend = (date: string): boolean => {
    const d = dayIndex(date);
    return d === 0 || d === 6;
};

const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const DAY_MED = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

export const dayShort = (date: string): string => DAY_SHORT[dayIndex(date)] ?? '';
export const dayMedium = (date: string): string => DAY_MED[dayIndex(date)] ?? '';
export const dayFull = (date: string): string => DAY_FULL[dayIndex(date)] ?? '';
export const dayNumber = (date: string): number => Number(date.slice(8, 10));

/** 28 ต.ค. 2569 — ปีพุทธศักราชตามที่คนไทยอ่าน */
export const formatShort = (date: string): string => {
    const [y, m, d] = date.split('-').map(Number);
    return `${d} ${MONTH_SHORT[(m ?? 1) - 1]} ${(y ?? 0) + 543}`;
};

/** วันพุธที่ 28 ตุลาคม 2569 */
export const formatFull = (date: string): string => {
    const [y, m, d] = date.split('-').map(Number);
    return `วัน${dayFull(date)}ที่ ${d} ${MONTH_FULL[(m ?? 1) - 1]} ${(y ?? 0) + 543}`;
};

/** รายการวันที่จองได้ เริ่มจากวันนี้ */
export const bookableDays = (count: number): string[] => {
    const start = todayTH();
    return Array.from({ length: count }, (_, i) => addDays(start, i));
};

export const isToday = (date: string): boolean => date === todayTH();
export const isPastDate = (date: string): boolean => date < todayTH();

/** วันแรกและวันสุดท้ายของเดือนที่ date อยู่ */
export const monthStart = (date: string): string => `${date.slice(0, 7)}-01`;

export const monthEnd = (date: string): string => {
    const d = new Date(`${monthStart(date)}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    return d.toISOString().slice(0, 10);
};

export const addMonths = (date: string, n: number): string => {
    const d = new Date(`${monthStart(date)}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
};

/** ตุลาคม 2569 */
export const monthLabel = (date: string): string => {
    const [y, m] = date.split('-').map(Number);
    return `${MONTH_FULL[(m ?? 1) - 1]} ${(y ?? 0) + 543}`;
};

/** จำนวนวันระหว่างสองวันที่ (รวมปลายทั้งสองข้าง) */
export const daysBetween = (from: string, to: string): number => {
    const a = new Date(`${from}T00:00:00Z`).getTime();
    const b = new Date(`${to}T00:00:00Z`).getTime();
    return Math.round((b - a) / 86400000) + 1;
};

/** รายการวันที่ตั้งแต่ from ถึง to */
export const dateRange = (from: string, to: string): string[] => {
    const out: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
};
