import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { FullPageSpinner } from '../components/Spinner';
import type { Role } from '../lib/types';

/**
 * ★ ตัวนี้คือ "ประสบการณ์ใช้งาน" ไม่ใช่ "ความปลอดภัย"
 * ใครก็เปิด devtools แล้วยิง /api/admin/... เองได้โดยไม่ผ่านหน้าเว็บ
 * ตัวที่ป้องกันจริงคือ verifyJWT + verifyRoles ที่ backend
 */
export function ProtectedRoute({ role, children }: { role?: Role; children: ReactNode }) {
    const { user, ready } = useAuth();

    if (!ready) return <FullPageSpinner label="กำลังตรวจสอบสิทธิ์" />;
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/bookings'} replace />;
    }
    return <>{children}</>;
}
