import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'status';
    className?: string;
}

const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
    const variants = {
        default: 'bg-zinc-800 text-green-400 border-green-500/30',
        status: 'bg-zinc-800 text-zinc-300 border-zinc-600',
    };

    return (
        <span className={cn(
            'inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-normal',
            variants[variant] ?? variants.default,
            className
        )}>
            {children}
        </span>
    );
};

export default Badge;
