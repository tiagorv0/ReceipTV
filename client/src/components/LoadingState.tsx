import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    variant?: 'spinner' | 'dot';
    text?: string;
}

const LoadingState = ({ variant = 'spinner', text = 'Carregando...' }: LoadingStateProps) => {
    if (variant === 'dot') {
        return (
            <div className="min-h-[240px] flex flex-col items-center justify-center gap-2 text-zinc-400">
                <span className="size-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs">{text}</span>
            </div>
        );
    }

    return (
        <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            {text && <span className="text-sm">{text}</span>}
        </div>
    );
};

export default LoadingState;
