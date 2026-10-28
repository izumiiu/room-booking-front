import { Badge } from './Badge';
import { Button } from './Button';
import { formatFull } from '../lib/date';
import { rangeLabel } from '../lib/slot';
import { canCancel, hoursOf, stateOf } from '../lib/booking';
import styles from './BookingCard.module.css';
import type { Booking } from '../lib/types';

const LABEL = {
    upcoming: { tone: 'ok', text: 'ยืนยันแล้ว' },
    past: { tone: 'neutral', text: 'ผ่านไปแล้ว' },
    cancelled: { tone: 'danger', text: 'ยกเลิกแล้ว' }
} as const;

export function BookingCard({ booking, onCancel }: { booking: Booking; onCancel?: (b: Booking) => void }) {
    const state = stateOf(booking);
    const badge = LABEL[state];
    const dim = state !== 'upcoming';

    return (
        <article className={`${styles.card} ${dim ? styles.dim : ''}`}>
            <div className={styles.top}>
                <div>
                    <p className={styles.date}>{formatFull(booking.date)}</p>
                    <p className={styles.time}>
                        {rangeLabel(booking.startSlot, booking.endSlot)}
                        <span className={styles.hours}>{hoursOf(booking)} ชั่วโมง</span>
                    </p>
                </div>
                <Badge tone={badge.tone}>{badge.text}</Badge>
            </div>

            <p className={styles.topic}>{booking.topic}</p>

            <div className={styles.meta}>
                <span>ผู้เข้าร่วม {booking.attendees} คน</span>
                {booking.department && <span>{booking.department}</span>}
            </div>

            {booking.status === 'cancelled' && booking.cancelReason && (
                <p className={styles.reason}>เหตุผล: {booking.cancelReason}</p>
            )}

            {onCancel && canCancel(booking) && (
                <div className={styles.foot}>
                    <Button variant="danger" onClick={() => onCancel(booking)}>ยกเลิกการจอง</Button>
                </div>
            )}
        </article>
    );
}
