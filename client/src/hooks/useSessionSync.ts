import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useSessionSync(): void {
    const navigate = useNavigate();

    useEffect(() => {
        const goToLogin = () => navigate('/login');

        const handleExpired = () => {
            const wasAuthenticated = localStorage.getItem('was_authenticated');
            navigate(wasAuthenticated ? '/login?expired=true' : '/login', { replace: true });
        };

        window.addEventListener('auth:expired', handleExpired);

        let channel: BroadcastChannel | undefined;
        let cleanupStorage: (() => void) | undefined;

        try {
            channel = new BroadcastChannel('auth');
            channel.onmessage = (event: MessageEvent) => {
                if (event.data?.type === 'logout') goToLogin();
            };
        } catch {
            // Fallback para browsers sem BroadcastChannel (Safari antigo)
            const handleStorage = (event: StorageEvent) => {
                if (event.key === 'auth:logout') goToLogin();
            };
            window.addEventListener('storage', handleStorage);
            cleanupStorage = () => window.removeEventListener('storage', handleStorage);
        }

        return () => {
            window.removeEventListener('auth:expired', handleExpired);
            channel?.close();
            cleanupStorage?.();
        };
    }, [navigate]);
}
