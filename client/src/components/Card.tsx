import type { ReactNode } from 'react';

interface CardProps {
    title?: string;
    subtitle?: string;
    children?: ReactNode;
    variant?: 'default' | 'highlight';
    compact?: boolean;
    className?: string;
    headerRight?: ReactNode;
}

const Card = ({ title, subtitle, children, variant = 'default', compact = false, className = '', headerRight }: CardProps) => {
    const classes = [
        'card',
        compact ? 'card--compact' : '',
        variant === 'highlight' ? 'card--highlight' : '',
        className
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section className={classes}>
            {(title || subtitle || headerRight) && (
                <header className="card-header">
                    <div>
                        {title && <p className="card-title">{title}</p>}
                        {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    </div>
                    {headerRight && <div>{headerRight}</div>}
                </header>
            )}
            {children}
        </section>
    );
};

export default Card;
