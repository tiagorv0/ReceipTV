import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/index';

const ProtectedRoute = ({ children }) => {
    const [status, setStatus] = useState('loading');

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
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
