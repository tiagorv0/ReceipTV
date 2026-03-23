import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useSessionSync() {
    const navigate = useNavigate();

    useEffect(() => {
        const goToLogin = () => navigate('/login');

        const handleExpired = () => {
            const wasAuthenticated = localStorage.getItem('was_authenticated');
            navigate(wasAuthenticated ? '/login?expired=true' : '/login', { replace: true });
        };

        window.addEventListener('auth:expired', handleExpired);

        let channel;
        if ('BroadcastChannel' in window) {
            channel = new BroadcastChannel('auth');
            channel.onmessage = (event) => {
                if (event.data?.type === 'logout') goToLogin();
            };
        } else {
            // Fallback para browsers sem BroadcastChannel (Safari antigo)
            const handleStorage = (event) => {
                if (event.key === 'auth:logout') goToLogin();
            };
            window.addEventListener('storage', handleStorage);
            return () => {
                window.removeEventListener('auth:expired', handleExpired);
                window.removeEventListener('storage', handleStorage);
            };
        }

        return () => {
            window.removeEventListener('auth:expired', handleExpired);
            channel?.close();
        };
    }, [navigate]);
}
