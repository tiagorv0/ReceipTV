import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../api/index';

interface ProtectedRouteProps {
    children: ReactNode;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const location = useLocation();

    useEffect(() => {
        api.get('/auth/me')
            .then(() => setStatus('authenticated'))
            .catch(() => setStatus('unauthenticated'));
    }, []);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-900">
                <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (status === 'unauthenticated') {
        sessionStorage.setItem('redirect_after_login', location.pathname);
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
