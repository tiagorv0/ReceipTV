import { useState, useEffect } from 'react';
import { getSummary } from '../api/services';
import ChartCard2 from '../components/ChartCard2';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '@/utils/currency-utils';
import { DollarSign, FileText, Building2, CreditCard, Calendar, Landmark, BanknoteArrowDown } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import SimpleBarChart from '../components/SimpleBarChart';


const DashboardPage = () => {
    const [summary, setSummary] = useState(null);
    const [monthly, setMonthly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sumRes = await getSummary();
                setSummary(sumRes.data);
                setMonthly(sumRes.data.monthly || []);
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader title="Visão Geral" subtitle="Acompanhe as métricas dos seus comprovantes lidos." />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <KpiCard icon={<DollarSign />} title="Volume Total" value={formatCurrency(summary?.total || 0)} glow />
                <KpiCard icon={<FileText />} title="Comprovantes Lidos" value={summary?.count || 0} glow/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard2 title="Gastos por Banco" icon={<Landmark size={18} />}>
                    <SimpleBarChart data={summary.byBank} />
                </ChartCard2>
                
                <ChartCard2 title="Gastos por Tipo (Pix, Boleto, etc)" icon={<BanknoteArrowDown size={18} />}>
                    <SimpleBarChart data={summary.byType} />
                </ChartCard2>

                <ChartCard2 title="Volume Mensal" icon={<Calendar size={18} />} className="lg:col-span-2">
                    <SimpleBarChart data={monthly} layout="horizontal" />
                </ChartCard2>
            </div>
        </div>
    );
};

export default DashboardPage;
