import Card from './Card';

const StatCard = ({ label, value, secondary, highlight = false }) => {
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

