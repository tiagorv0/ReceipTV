import { useState, useEffect } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAPrompts = () => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstall, setShowInstall] = useState(false);
    const [installDismissed, setInstallDismissed] = useState(
        () => sessionStorage.getItem('pwa-install-dismissed') === 'true'
    );

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            if (!installDismissed) setShowInstall(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [installDismissed]);

    const handleInstall = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstall(false);
            setInstallPrompt(null);
        }
    };

    const handleDismissInstall = () => {
        setShowInstall(false);
        setInstallDismissed(true);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    const handleUpdate = () => {
        updateServiceWorker(true);
        setNeedRefresh(false);
    };

    const handleDismissUpdate = () => {
        setNeedRefresh(false);
    };

    return (
        <>
            {needRefresh && (
                <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 bg-zinc-800 border-b border-green-500/30 px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <RefreshCw size={15} className="text-green-400 shrink-0" />
                        <span>Nova versão disponível.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleUpdate}
                            className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors px-2 py-1 rounded-lg hover:bg-green-500/10"
                        >
                            Atualizar
                        </button>
                        <button
                            onClick={handleDismissUpdate}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}

            {showInstall && !needRefresh && (
                <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-80 flex items-start gap-3 bg-zinc-800 border border-green-500/25 rounded-xl px-4 py-3 shadow-xl shadow-black/40">
                    <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20 shrink-0 mt-0.5">
                        <Download size={16} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200">Instalar ReceipTV</p>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                            Adicione à tela inicial para acesso rápido.
                        </p>
                        <div className="flex items-center gap-3 mt-2.5">
                            <button
                                onClick={handleInstall}
                                className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20"
                            >
                                Instalar
                            </button>
                            <button
                                onClick={handleDismissInstall}
                                className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismissInstall}
                        className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 -mt-0.5"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}
        </>
    );
};

export default PWAPrompts;
