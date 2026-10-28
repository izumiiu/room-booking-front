import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from './errors';

interface Result<T> {
    data: T | null;
    loading: boolean;
    error: string;
    reload: () => void;
}

/**
 * โหลดข้อมูลจาก API พร้อมจัดการสามสถานะให้ครบ (loading / error / data)
 *
 * ★ ปัญหาที่ตัวนี้แก้: ผู้ใช้กดวันที่ 29 แล้วกดวันที่ 30 ทันที แต่เน็ตช้า
 *   คำตอบของวันที่ 29 มาถึงทีหลังแล้วทับตารางของวันที่ 30 — หน้าจอเลยแสดงผิดวัน
 *   cleanup ของ useEffect ตั้งธง alive = false ให้คำขอเก่า ผลที่มาช้าจึงถูกทิ้งไป
 *
 * สังเกตว่า loading ไม่ได้เป็น state ของตัวเอง แต่คำนวณจากการเทียบว่า
 * ข้อมูลที่ถืออยู่มาจากคำขอล่าสุดหรือเปล่า — state ที่คำนวณได้ไม่ควรเก็บซ้ำ
 *
 * key = สิ่งที่เปลี่ยนแล้วต้องโหลดใหม่ (เช่นวันที่) ทำให้ dependency ชัดเจนและคงที่
 */
export function useLoad<T>(fn: () => Promise<T>, key: string): Result<T> {
    const [nonce, setNonce] = useState(0);
    const reqKey = `${key}#${nonce}`;

    const [state, setState] = useState<{ key: string; data: T | null; error: string }>({
        key: '', data: null, error: ''
    });

    // เก็บฟังก์ชันล่าสุดไว้ใน ref เพื่อไม่ให้ effect ทำงานใหม่ทุกครั้งที่ component วาดซ้ำ
    const fnRef = useRef(fn);
    useEffect(() => { fnRef.current = fn; });

    useEffect(() => {
        let alive = true;

        fnRef.current()
            .then((d) => { if (alive) setState({ key: reqKey, data: d, error: '' }); })
            .catch((e: unknown) => { if (alive) setState({ key: reqKey, data: null, error: messageOf(e) }); });

        return () => { alive = false; };
    }, [reqKey]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    const loading = state.key !== reqKey;

    return {
        data: loading ? null : state.data,
        loading,
        error: loading ? '' : state.error,
        reload
    };
}
