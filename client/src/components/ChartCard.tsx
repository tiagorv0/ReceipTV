import type { ReactNode } from 'react';
import Card from './Card';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

const ChartCard = ({ title, subtitle, children }: ChartCardProps) => {
    return (
        <Card title={title} subtitle={subtitle} className="chart-card">
            <div className="chart-card-inner">
                {children}
            </div>
        </Card>
    );
};

export default ChartCard;
