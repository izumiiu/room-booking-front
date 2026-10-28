import { useContext } from 'react';
import { AuthContext } from './context';
import type { AuthState } from './context';

export const useAuth = (): AuthState => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth ต้องถูกเรียกภายใน <AuthProvider>');
    return ctx;
};
