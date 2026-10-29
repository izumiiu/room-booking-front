import { dayShort, dayMedium, dayNumber, isWeekend, isToday } from '../lib/date';
import { MAX_ADVANCE_DAYS } from '../lib/slot';
import styles from './DayStrip.module.css';

interface Props {
    days: string[];
    value: string;
    onChange: (date: string) => void;
    /** เปิด/ปิดจริงของแต่ละวันจาก backend — null = ยังโหลดไม่เสร็จ ใช้กฎเสาร์อาทิตย์ไปก่อน */
    openByDate: Map<string, boolean> | null;
}

export function DayStrip({ days, value, onChange, openByDate }: Props) {
    return (
        <div>
            <div className={styles.head}>
                <span className={styles.label}>เลือกวัน</span>
                <span className={styles.note}>จองล่วงหน้าได้ {MAX_ADVANCE_DAYS} วัน</span>
            </div>

            <div className={styles.strip} role="group" aria-label="เลือกวันที่ต้องการจอง">
                {days.map((d) => {
                    // ★ ถามจาก backend เสมอเมื่อมีข้อมูล
                    //   เสาร์อาทิตย์เป็นแค่ "ค่าเริ่มต้น" ซึ่ง admin สั่งทับได้ทั้งสองทาง
                    //   ถ้าเดาเองที่นี่ วันเสาร์ที่ admin เปิดไว้จะกดไม่ได้ทั้งที่ backend ยอมให้จอง
                    const known = openByDate?.get(d);
                    const closed = known === undefined ? isWeekend(d) : !known;
                    const selected = d === value;
                    const cls = [styles.day, selected ? styles.on : '', closed ? styles.off : '']
                        .filter(Boolean).join(' ');

                    return (
                        <button
                            key={d}
                            type="button"
                            className={cls}
                            disabled={closed}
                            aria-pressed={selected}
                            onClick={() => onChange(d)}
                        >
                            <span className={styles.dow}>
                                <span className={styles.dowShort}>{dayShort(d)}</span>
                                <span className={styles.dowLong}>{dayMedium(d)}</span>
                            </span>
                            <span className={styles.num}>{dayNumber(d)}</span>
                            <span className={styles.tag}>
                                {closed ? 'ปิด' : isToday(d) ? 'วันนี้' : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
