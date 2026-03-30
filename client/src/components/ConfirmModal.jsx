import { Loader2 } from 'lucide-react';

const ConfirmModal = ({
    open,
    onClose,
    onConfirm,
    title,
    description,
    icon,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    loading = false,
    children,
}) => {
    if (!open) return null;

    const borderColor = variant === 'danger' ? 'border-red-500/30' : 'border-zinc-700';
    const confirmClass = variant === 'danger'
        ? 'flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2'
        : 'flex-1 h-10 rounded-lg bg-green-500/30 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className={`relative bg-zinc-900 border ${borderColor} rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200`}
                onClick={e => e.stopPropagation()}
            >
                {icon && (
                    <div className="flex items-center justify-center mb-4">
                        {icon}
                    </div>
                )}
                <h3 className="text-lg font-bold text-white text-center mb-1">{title}</h3>
                <p className="text-sm text-zinc-400 text-center mb-5">{description}</p>

                {children && <div className="mb-4">{children}</div>}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={confirmClass}
                    >
                        {loading
                            ? <><Loader2 size={14} className="animate-spin" /> Processando...</>
                            : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
