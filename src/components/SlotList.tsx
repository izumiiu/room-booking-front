import styles from './SlotList.module.css';
import type { Slot } from '../lib/types';

interface Props {
    slots: Slot[];
    from: number | null;
    to: number | null;
    onPick: (slot: number) => void;
}

const TAG: Record<Slot['status'], string> = {
    free: 'ว่าง',
    booked: 'จองแล้ว',
    past: 'ผ่านไปแล้ว',
    closed: 'ปิด'
};

export function SlotList({ slots, from, to, onPick }: Props) {
    return (
        <div>
            <div className={styles.legend}>
                <span className={styles.key}><span className={`${styles.swatch} ${styles.swFree}`} />ว่าง</span>
                <span className={styles.key}><span className={`${styles.swatch} ${styles.swPick}`} />ที่เลือก</span>
                <span className={styles.key}><span className={`${styles.swatch} ${styles.swBooked}`} />จองแล้ว</span>
            </div>

            <div className={styles.list}>
                {slots.map((s) => {
                    const selected = from !== null && to !== null && s.slot >= from && s.slot <= to;
                    const disabled = s.status !== 'free';

                    const cls = [
                        styles.slot,
                        selected ? styles.picked : '',
                        s.status === 'booked' ? styles.taken : '',
                        s.status === 'past' || s.status === 'closed' ? styles.gone : ''
                    ].filter(Boolean).join(' ');

                    return (
                        <button
                            key={s.slot}
                            type="button"
                            className={cls}
                            disabled={disabled}
                            aria-pressed={selected}
                            onClick={() => onPick(s.slot)}
                        >
                            <span className={styles.time}>{s.start} – {s.end}</span>
                            <span className={styles.tag}>{selected ? 'เลือกอยู่' : TAG[s.status]}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
