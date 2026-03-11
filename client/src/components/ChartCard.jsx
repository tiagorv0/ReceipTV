import Card from './Card';

const ChartCard = ({ title, subtitle, children }) => {
    return (
        <Card title={title} subtitle={subtitle} className="chart-card">
            <div className="chart-card-inner">
                {children}
            </div>
        </Card>
    );
};

export default ChartCard;

