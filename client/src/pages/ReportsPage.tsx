import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, parse, isValid } from 'date-fns';
import { CalendarDays, SlidersHorizontal } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CalendarView from '@/components/CalendarView';
import { getCalendarData } from '@/api/services';
import { BANKS } from '@/utils/banks';
import type { CalendarDayData } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATIC_PAYMENT_TYPES = ['PIX', 'TED', 'DOC', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Outro'];

const SELECT_CLS =
    'h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 transition-colors cursor-pointer';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMonthParam(monthParam: string | null): Date {
    if (!monthParam) return new Date();
    const parsed = parse(monthParam, 'yyyy-MM', new Date());
    return isValid(parsed) ? parsed : new Date();
}

// ─── Component ────────────────────────────────────────────────────────────────
const ReportsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // ─── Params (URL como source of truth) ───────────────────────────────────
    const monthParam = searchParams.get('month');
    const bancoParam = searchParams.get('banco') ?? '';
    const tipoParam = searchParams.get('tipo') ?? '';

    // Derivar currentMonth diretamente dos params — sem estado extra
    const currentMonth = useMemo(() => parseMonthParam(monthParam), [monthParam]);

    const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // ─── Buscar dados do calendário ───────────────────────────────────────────
    useEffect(() => {
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            // Sanitizar params contra allowlists antes de enviar à API
            const validBanco = Object.keys(BANKS).includes(bancoParam) ? bancoParam : '';
            const validTipo = STATIC_PAYMENT_TYPES.includes(tipoParam) ? tipoParam : '';
            try {
                const { data } = await getCalendarData({
                    startDate: start,
                    endDate: end,
                    ...(validBanco ? { banco: validBanco } : {}),
                    ...(validTipo ? { tipoPagamento: validTipo } : {}),
                });
                if (!cancelled) setCalendarData(data.days);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.error('Erro ao buscar dados do calendário:', err);
                }
                if (!cancelled) setCalendarData([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchData();

        return () => { cancelled = true; };
    }, [currentMonth, bancoParam, tipoParam]);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleMonthChange = useCallback(
        (date: Date) => {
            const monthStr = format(date, 'yyyy-MM');
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('month', monthStr);
                return next;
            });
        },
        [setSearchParams]
    );

    const handleBancoChange = useCallback(
        (value: string) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value) next.set('banco', value);
                else next.delete('banco');
                return next;
            });
        },
        [setSearchParams]
    );

    const handleTipoChange = useCallback(
        (value: string) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value) next.set('tipo', value);
                else next.delete('tipo');
                return next;
            });
        },
        [setSearchParams]
    );

    const handleDayClick = useCallback(
        (day: string) => {
            const params = new URLSearchParams();
            params.set('startDate', day);
            params.set('endDate', day);
            if (bancoParam) params.set('banco', bancoParam);
            if (tipoParam) params.set('tipo', tipoParam);
            navigate(`/history?${params.toString()}`);
        },
        [navigate, bancoParam, tipoParam]
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-900">
            <div className="flex items-start justify-between gap-4">
                <PageHeader
                    title="Relatórios"
                    subtitle="Visualize seus gastos por dia no calendário."
                />
                <button
                    type="button"
                    onClick={() => setFiltersOpen((o) => !o)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white hover:bg-zinc-700 transition-colors mt-1"
                    aria-expanded={filtersOpen}
                >
                    <SlidersHorizontal size={15} />
                    <span className="hidden sm:inline">Filtros</span>
                    {(bancoParam || tipoParam) && (
                        <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                    )}
                </button>
            </div>

            {/* Filtros ─────────────────────────────────────────────────────── */}
            <div
                className="grid transition-all duration-900"
                style={{
                    gridTemplateRows: filtersOpen ? '1fr' : '0fr',
                }}
            >
                <div className="overflow-hidden">
                    <div className="bg-zinc-800 rounded-2xl p-4 mb-2">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarDays size={16} className="text-green-400" />
                            <span className="text-sm font-medium text-zinc-300">Filtrar por</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Banco */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="filter-banco" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Banco
                                </label>
                                <select
                                    id="filter-banco"
                                    value={bancoParam}
                                    onChange={(e) => handleBancoChange(e.target.value)}
                                    className={SELECT_CLS}
                                >
                                    <option value="">Todos os bancos</option>
                                    {Object.entries(BANKS).map(([key, bank]) => (
                                        <option key={key} value={key}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tipo de pagamento */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="filter-tipo" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Tipo de pagamento
                                </label>
                                <select
                                    id="filter-tipo"
                                    value={tipoParam}
                                    onChange={(e) => handleTipoChange(e.target.value)}
                                    className={SELECT_CLS}
                                >
                                    <option value="">Todos os tipos</option>
                                    {STATIC_PAYMENT_TYPES.map((tipo) => (
                                        <option key={tipo} value={tipo}>
                                            {tipo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Badges de filtros ativos */}
                        {(bancoParam || tipoParam) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {bancoParam && (
                                    <button
                                        type="button"
                                        onClick={() => handleBancoChange('')}
                                        className="flex items-center gap-1.5 text-xs bg-green-500/15 text-green-400 border border-green-500/30 rounded-full px-2.5 py-1 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-colors"
                                    >
                                        {BANKS[bancoParam]?.name ?? bancoParam}
                                        <span aria-hidden>×</span>
                                    </button>
                                )}
                                {tipoParam && (
                                    <button
                                        type="button"
                                        onClick={() => handleTipoChange('')}
                                        className="flex items-center gap-1.5 text-xs bg-green-500/15 text-green-400 border border-green-500/30 rounded-full px-2.5 py-1 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-colors"
                                    >
                                        {tipoParam}
                                        <span aria-hidden>×</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Calendário ──────────────────────────────────────────────────── */}
            <CalendarView
                data={calendarData}
                currentMonth={currentMonth}
                onMonthChange={handleMonthChange}
                onDayClick={handleDayClick}
                loading={loading}
            />
        </div>
    );
};

export default ReportsPage;
