import type { ReactNode } from 'react';
import Card from './Card';

interface StatCardProps {
    label: string;
    value: ReactNode;
    secondary?: ReactNode;
    highlight?: boolean;
}

const StatCard = ({ label, value, secondary, highlight = false }: StatCardProps) => {
    return (
        <Card
            compact
            variant={highlight ? 'highlight' : 'default'}
            title={label}
            className="stat-card"
        >
            <div>
                <div className="stat-value">{value}</div>
                {secondary && <div className="stat-secondary">{secondary}</div>}
            </div>
        </Card>
    );
};

export default StatCard;
