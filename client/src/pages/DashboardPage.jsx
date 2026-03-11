import { useState, useEffect } from 'react';
import { getSummary, getMonthly } from '../api/services';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell as PieCell, Tooltip as PieTooltip } from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { BANKS, detectBank } from '@/utils/banks';

const DashboardPage = () => {
    const [summary, setSummary] = useState(null);
    const [monthly, setMonthly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sumRes, monRes] = await Promise.all([getSummary(), getMonthly()]);
                setSummary(sumRes.data);
                setMonthly(monRes.data || []);
            } catch (err) {
                console.error(err);
                setMonthly([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="page-loading">
                <span className="page-loading-dot" />
                <span>Carregando visão geral...</span>
            </div>
        );
    }

    const totalFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(summary?.total || 0);

    return (
        <div className="dashboard-page">
            <PageHeader
                title="Dashboard"
                subtitle="Visão geral das suas finanças"
            />

            <div className="dashboard-grid">
                <StatCard label="Total geral" value={totalFormatted} highlight />
                <StatCard label="Comprovantes" value={summary?.count || 0} />
            </div>

            <div className="charts-grid">
                <ChartCard title="Gastos mensais">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthly}>
                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 12,
                                    fontSize: 12
                                }}
                                labelStyle={{ color: 'var(--text-main)', marginBottom: 4 }}
                                itemStyle={{ color: 'var(--text-main)', padding: 0 }}
                                formatter={(value) =>
                                    new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(value)
                                }
                            />
                            <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Por banco">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={summary?.byBank}
                                dataKey="total"
                                nameKey="banco"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                stroke="none"
                            >
                                {summary?.byBank?.map((entry, index) => (
                                    <PieCell key={`cell-${index}`} fill={BANKS[detectBank(entry.banco)]?.bg} />
                                ))}
                            </Pie>
                            <PieTooltip
                                contentStyle={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 12,
                                    fontSize: 12
                                }}
                                labelStyle={{ color: 'var(--text-main)', marginBottom: 4 }}
                                itemStyle={{ color: 'var(--text-main)', padding: 0 }}
                                formatter={(value) =>
                                    new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(value)
                                }
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {!summary?.byBank || summary.byBank.length === 0 ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
                            Sem dados por banco ainda.
                        </div>
                    ) : null}
                </ChartCard>
            </div>
        </div>
    );
};

export default DashboardPage;
