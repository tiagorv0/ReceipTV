import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary, getProfile } from '../api/services';
import ChartCard2 from '../components/ChartCard2';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '@/utils/currency-utils';
import { detectBank } from '@/utils/banks';
import { DollarSign, FileText, Calendar, Landmark, BanknoteArrowDown, Download, Loader2, CalendarDays, ArrowRight } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import SimpleBarChart from '../components/SimpleBarChart';
import type { SummaryResponse, ChartItem } from '@/types/api';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [summary, setSummary]           = useState<SummaryResponse | null>(null);
    const [monthly, setMonthly]           = useState<ChartItem[]>([]);
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
                setUserName(profileRes.data?.username || '');
            } catch (err) {
                console.error(err);
                setMonthly([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExportDashboard = async (): Promise<void> => {
        if (!summary) return;
        setExportLoading(true);
        try {
            const [pdfRenderer, { default: DashboardPDFDocument }] = await Promise.all([
                import('@react-pdf/renderer'),
                import('../utils/DashboardPDFDocument'),
            ]);
            const { pdf } = pdfRenderer;

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

    const handleBankClick = (item: { label: string; total: number }) => {
        const bankKey = detectBank(item.label);
        navigate(`/history?banco=${encodeURIComponent(bankKey)}`);
    };

    const handleTypeClick = (item: { label: string; total: number }) => {
        if (!item.label) return;
        navigate(`/history?tipo=${encodeURIComponent(item.label)}`);
    };

    const handleMonthClick = (item: { label: string; total: number }) => {
        // label no formato "MM-YYYY"
        const parts = item.label.split('-');
        if (parts.length !== 2) return;
        const [mm, yyyy] = parts;
        const year = parseInt(yyyy, 10);
        const month = parseInt(mm, 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return;
        const mmPadded = mm.padStart(2, '0');
        const start = `${yyyy}-${mmPadded}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${yyyy}-${mmPadded}-${String(lastDay).padStart(2, '0')}`;
        navigate(`/history?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
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

            {/* Card: Calendário de Gastos */}
            <button
                type="button"
                onClick={() => navigate('/reports')}
                className="w-full flex items-center justify-between gap-4 bg-zinc-800 border border-zinc-700 hover:border-green-500/40 hover:bg-zinc-700 rounded-2xl p-5 transition-all group text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors">
                        <CalendarDays size={22} />
                    </div>
                    <div>
                        <p className="text-white font-semibold">Calendário de Gastos</p>
                        <p className="text-zinc-400 text-sm">Veja seus recibos distribuídos por dia no mês</p>
                    </div>
                </div>
                <ArrowRight size={20} className="text-zinc-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="chart-por-banco">
                    <ChartCard2 title="Gastos por Banco" icon={<Landmark size={18} />}>
                        <SimpleBarChart data={summary?.byBank ?? []} onBarClick={handleBankClick} />
                    </ChartCard2>
                </div>

                <div id="chart-por-tipo">
                    <ChartCard2 title="Gastos por Tipo (Pix, Boleto, etc)" icon={<BanknoteArrowDown size={18} />}>
                        <SimpleBarChart data={summary?.byType ?? []} onBarClick={handleTypeClick} />
                    </ChartCard2>
                </div>

                <div id="chart-volume-mensal" className="lg:col-span-2">
                    <ChartCard2 title="Volume Mensal" icon={<Calendar size={18} />}>
                        <SimpleBarChart data={monthly} layout="horizontal" onBarClick={handleMonthClick} />
                    </ChartCard2>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
