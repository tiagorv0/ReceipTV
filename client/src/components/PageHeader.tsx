import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    centered?: boolean;
}

const PageHeader = ({ title, subtitle, actions, centered = false }: PageHeaderProps) => (
    <header className={`mb-8 ${centered ? 'text-center' : ''} ${actions ? 'flex flex-col md:flex-row md:items-center justify-between gap-4' : ''}`}>
        <div>
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-zinc-400">{subtitle}</p>}
        </div>
        {actions}
    </header>
);

export default PageHeader;
