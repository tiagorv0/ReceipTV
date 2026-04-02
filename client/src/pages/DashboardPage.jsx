import { useState, useEffect } from 'react';
import { getSummary, getProfile } from '../api/services';
import ChartCard2 from '../components/ChartCard2';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '@/utils/currency-utils';
import { DollarSign, FileText, Calendar, Landmark, BanknoteArrowDown, Download, Loader2 } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import SimpleBarChart from '../components/SimpleBarChart';

const DashboardPage = () => {
    const [summary, setSummary]           = useState(null);
    const [monthly, setMonthly]           = useState([]);
    const [userName, setUserName]         = useState('');
    const [loading, setLoading]           = useState(true);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sumRes, profileRes] = await Promise.all([
                    getSummary(),
                    getProfile(),
                ]);
                setSummary(sumRes.data);
                setMonthly(sumRes.data.monthly || []);
                setUserName(profileRes.data?.name || '');
            } catch (err) {
                console.error(err);
                setMonthly([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExportDashboard = async () => {
        setExportLoading(true);
        try {
            const [{ pdf }, { default: DashboardPDFDocument }] = await Promise.all([
                import('@react-pdf/renderer'),
                import('../utils/DashboardPDFDocument'),
            ]);

            const blob = await pdf(
                <DashboardPDFDocument summary={summary} monthly={monthly} userName={userName} />
            ).toBlob();

            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `receiptv-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao exportar dashboard:', err);
            alert('Erro ao gerar PDF. Tente novamente.');
        } finally {
            setExportLoading(false);
        }
    };

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
            <div className="flex items-start justify-between gap-4">
                <PageHeader title="Visão Geral" subtitle="Acompanhe as métricas dos seus comprovantes lidos." />
                <button
                    type="button"
                    disabled={loading || exportLoading}
                    onClick={handleExportDashboard}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                >
                    {exportLoading
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Download size={15} />}
                    <span className="hidden sm:inline">Exportar PDF</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <KpiCard icon={<DollarSign />} title="Volume Total" value={formatCurrency(summary?.total || 0)} glow />
                <KpiCard icon={<FileText />} title="Comprovantes Lidos" value={summary?.count || 0} glow />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="chart-por-banco">
                    <ChartCard2 title="Gastos por Banco" icon={<Landmark size={18} />}>
                        <SimpleBarChart data={summary.byBank} />
                    </ChartCard2>
                </div>

                <div id="chart-por-tipo">
                    <ChartCard2 title="Gastos por Tipo (Pix, Boleto, etc)" icon={<BanknoteArrowDown size={18} />}>
                        <SimpleBarChart data={summary.byType} />
                    </ChartCard2>
                </div>

                <div id="chart-volume-mensal" className="lg:col-span-2">
                    <ChartCard2 title="Volume Mensal" icon={<Calendar size={18} />}>
                        <SimpleBarChart data={monthly} layout="horizontal" />
                    </ChartCard2>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
