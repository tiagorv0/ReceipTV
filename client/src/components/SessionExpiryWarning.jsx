import { useEffect, useState } from 'react';
import api from '../api/index';

const WARNING_THRESHOLD_SECONDS = 5 * 60; // avisar 5 minutos antes

const SessionExpiryWarning = () => {
    const [showWarning, setShowWarning] = useState(false);
    const [renewing, setRenewing] = useState(false);

    useEffect(() => {
        async function renewSilently() {
            try {
                const { data } = await api.post('/auth/refresh');
                if (data?.accessTokenExp) {
                    localStorage.setItem('sessionExpiry', String(data.accessTokenExp));
                }
                schedule();
            } catch {
                // Interceptor cuida do redirect para /login
            }
        }

        function schedule() {
            const expStr = localStorage.getItem('sessionExpiry');
            if (!expStr) return;

            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            const exp = parseInt(expStr, 10);
            const now = Math.floor(Date.now() / 1000);
            const secondsLeft = exp - now - 30; // margem de 30s para clock skew

            if (secondsLeft <= 0) return;

            if (secondsLeft <= WARNING_THRESHOLD_SECONDS) {
                if (rememberMe) {
                    renewSilently();
                } else {
                    setShowWarning(true);
                }
                return;
            }

            const delay = (secondsLeft - WARNING_THRESHOLD_SECONDS) * 1000;
            const timer = setTimeout(() => {
                if (localStorage.getItem('rememberMe') === 'true') {
                    renewSilently();
                } else {
                    setShowWarning(true);
                }
            }, delay);
            return timer;
        }

        const timer = schedule();
        return () => { if (timer) clearTimeout(timer); };
    }, []);

    const handleRenew = async () => {
        setRenewing(true);
        try {
            const { data } = await api.post('/auth/refresh');
            if (data?.accessTokenExp) {
                localStorage.setItem('sessionExpiry', String(data.accessTokenExp));
            }
            setShowWarning(false);
        } catch {
            // Interceptor cuida do redirect para /login
        } finally {
            setRenewing(false);
        }
    };

    if (!showWarning) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-zinc-800 border border-yellow-500/40 rounded-xl p-4 shadow-2xl max-w-sm w-full">
            <p className="text-sm font-semibold text-yellow-400 mb-1">Sessão expirando em breve</p>
            <p className="text-xs text-zinc-400 mb-3">
                Sua sessão vai expirar em aproximadamente 5 minutos. Deseja renová-la?
            </p>
            <div className="flex gap-2">
                <button
                    onClick={handleRenew}
                    disabled={renewing}
                    className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                    {renewing ? 'Renovando...' : 'Renovar sessão'}
                </button>
                <button
                    onClick={() => setShowWarning(false)}
                    className="text-xs px-3 py-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    Ignorar
                </button>
            </div>
        </div>
    );
};

export default SessionExpiryWarning;
