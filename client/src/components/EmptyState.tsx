import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
    <div className="text-center py-20 bg-zinc-800 border border-green-500/30 rounded-2xl">
        {icon && <div className="flex justify-center mb-4 text-green-400">{icon}</div>}
        <h3 className="text-xl font-medium text-zinc-300">{title}</h3>
        {description && <p className="text-zinc-500 mt-1">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);

export default EmptyState;
