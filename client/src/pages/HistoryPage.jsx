import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReceipts, deleteReceipt, getReceiptFile } from '../api/services';
import { BANKS } from '../utils/banks';
import { formatDateToUTC_DDMMYYYY } from '../utils/date-utils';
import {
    List, Smartphone, Trash2, CircleDollarSign, Banknote, ScrollText,
    ChevronDown, ChevronUp, X, Search, SlidersHorizontal,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '../utils/currency-utils';
import ConfirmModal from '../components/ConfirmModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const _today = new Date();
const FIRST_DAY = new Date(_today.getFullYear(), _today.getMonth(), 1).toISOString().split('T')[0];
const LAST_DAY  = new Date(_today.getFullYear(), _today.getMonth() + 1, 0).toISOString().split('T')[0];

const STATIC_PAYMENT_TYPES = ['PIX', 'TED', 'DOC', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Outro'];

const DEFAULT_FILTERS = {
    nome:           '',
    banco:          '',
    tipoPagamento:  '',
    valorMin:       '',
    valorMax:       '',
    startDate:      FIRST_DAY,
    endDate:        LAST_DAY,
};

const SORT_OPTIONS = [
    { value: 'date_desc',  label: 'Data (mais recente)' },
    { value: 'date_asc',   label: 'Data (mais antiga)'  },
    { value: 'value_desc', label: 'Valor (maior)'        },
    { value: 'value_asc',  label: 'Valor (menor)'        },
    { value: 'name_asc',   label: 'Nome (A→Z)'           },
    { value: 'name_desc',  label: 'Nome (Z→A)'           },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readFiltersFromURL(sp) {
    return {
        nome:          sp.get('nome')      ?? '',
        banco:         sp.get('banco')     ?? '',
        tipoPagamento: sp.get('tipo')      ?? '',
        valorMin:      sp.get('valorMin')  ?? '',
        valorMax:      sp.get('valorMax')  ?? '',
        startDate:     sp.get('startDate') ?? FIRST_DAY,
        endDate:       sp.get('endDate')   ?? LAST_DAY,
    };
}

function filtersToParams(filters) {
    const p = {};
    if (filters.nome)          p.nome     = filters.nome;
    if (filters.banco)         p.banco    = filters.banco;
    if (filters.tipoPagamento) p.tipo     = filters.tipoPagamento;
    if (filters.valorMin)      p.valorMin = filters.valorMin;
    if (filters.valorMax)      p.valorMax = filters.valorMax;
    if (filters.startDate !== FIRST_DAY) p.startDate = filters.startDate;
    if (filters.endDate   !== LAST_DAY)  p.endDate   = filters.endDate;
    return p;
}

function buildParams(filters, sort) {
    return { ...filtersToParams(filters), ...(sort !== 'date_desc' ? { sort } : {}) };
}

function receiptDateStr(r) {
    try {
        const d = new Date(r.data_pagamento);
        if (isNaN(d.getTime())) return null;
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    } catch { return null; }
}

const INPUT_CLS = 'h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 transition-colors';

// ─── Component ────────────────────────────────────────────────────────────────
const HistoryPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [receipts, setReceipts]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [deleteModal, setDeleteModal]   = useState({ open: false, id: null });
    const [filtersOpen, setFiltersOpen]   = useState(false);
    const [sortBy, setSortBy]             = useState(searchParams.get('sort') ?? 'date_desc');
    const [visibleCount, setVisibleCount] = useState(10);
    const [pendingFilters, setPendingFilters] = useState(() => readFiltersFromURL(searchParams));
    const [appliedFilters, setAppliedFilters] = useState(() => readFiltersFromURL(searchParams));
    const sentinelRef = useRef(null);
    const debounceRef = useRef(null);

    // ─── Fetch (triggered only by date range) ────────────────────────────────
    const { startDate: appliedStart, endDate: appliedEnd } = appliedFilters;
    useEffect(() => {
        setLoading(true);
        getReceipts(appliedStart, appliedEnd)
            .then(({ data }) => setReceipts(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [appliedStart, appliedEnd]);

    // ─── Payment types (dynamic + static fallback) ────────────────────────────
    const paymentTypes = useMemo(() => {
        const dynamic = receipts.map(r => r.tipo_pagamento).filter(Boolean);
        return [...new Set([...dynamic, ...STATIC_PAYMENT_TYPES])];
    }, [receipts]);

    // ─── Filter → Sort → Slice pipeline ──────────────────────────────────────
    const filteredSorted = useMemo(() => {
        const { nome, banco, tipoPagamento, valorMin, valorMax, startDate, endDate } = appliedFilters;
        const minVal = valorMin ? parseFloat(valorMin.replace(',', '.')) : null;
        const maxVal = valorMax ? parseFloat(valorMax.replace(',', '.')) : null;

        const filtered = receipts.filter(r => {
            if (nome && !r.nome?.toLowerCase().includes(nome.toLowerCase())) return false;
            if (banco && r.banco?.toLowerCase() !== banco.toLowerCase()) return false;
            if (tipoPagamento && r.tipo_pagamento?.toLowerCase() !== tipoPagamento.toLowerCase()) return false;
            if (minVal !== null && !isNaN(minVal) && parseFloat(r.valor) < minVal) return false;
            if (maxVal !== null && !isNaN(maxVal) && parseFloat(r.valor) > maxVal) return false;
            const rDate = receiptDateStr(r);
            if (rDate) {
                if (startDate && rDate < startDate) return false;
                if (endDate   && rDate > endDate)   return false;
            }
            return true;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'date_asc':   return new Date(a.data_pagamento) - new Date(b.data_pagamento);
                case 'date_desc':  return new Date(b.data_pagamento) - new Date(a.data_pagamento);
                case 'value_asc':  return parseFloat(a.valor) - parseFloat(b.valor);
                case 'value_desc': return parseFloat(b.valor) - parseFloat(a.valor);
                case 'name_asc':   return (a.nome ?? '').localeCompare(b.nome ?? '');
                case 'name_desc':  return (b.nome ?? '').localeCompare(a.nome ?? '');
                default: return 0;
            }
        });
    }, [receipts, appliedFilters, sortBy]);

    const total          = filteredSorted.length;
    const visibleReceipts = filteredSorted.slice(0, visibleCount);

    // ─── Active filter badges ─────────────────────────────────────────────────
    const activeFilterBadges = useMemo(() => {
        const badges = [];
        if (appliedFilters.nome)
            badges.push({ key: 'nome', label: `Nome: ${appliedFilters.nome}` });
        if (appliedFilters.banco)
            badges.push({ key: 'banco', label: `Banco: ${BANKS[appliedFilters.banco]?.name ?? appliedFilters.banco}` });
        if (appliedFilters.tipoPagamento)
            badges.push({ key: 'tipoPagamento', label: `Tipo: ${appliedFilters.tipoPagamento}` });
        if (appliedFilters.valorMin || appliedFilters.valorMax) {
            const min = appliedFilters.valorMin ? `R$ ${appliedFilters.valorMin}` : '';
            const max = appliedFilters.valorMax ? `R$ ${appliedFilters.valorMax}` : '';
            badges.push({ key: 'valor', label: min && max ? `Valor: ${min} – ${max}` : min ? `Mín: ${min}` : `Máx: ${max}` });
        }
        if (appliedFilters.startDate !== FIRST_DAY || appliedFilters.endDate !== LAST_DAY)
            badges.push({ key: 'date', label: `Data: ${appliedFilters.startDate} – ${appliedFilters.endDate}` });
        return badges;
    }, [appliedFilters]);

    // ─── Reset visible count on filter/sort change ────────────────────────────
    useEffect(() => { setVisibleCount(10); }, [appliedFilters, sortBy]);

    // ─── Infinite scroll ──────────────────────────────────────────────────────
    useEffect(() => {
        if (visibleCount >= total || !sentinelRef.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) setVisibleCount(c => c + 10);
        });
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [visibleCount, total]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    function handleApply() {
        setAppliedFilters(pendingFilters);
        setSearchParams(buildParams(pendingFilters, sortBy));
    }

    function handleClear() {
        setAppliedFilters(DEFAULT_FILTERS);
        setPendingFilters(DEFAULT_FILTERS);
        setSearchParams({});
    }

    function removeFilter(key) {
        const updates =
            key === 'valor' ? { valorMin: '', valorMax: '' } :
            key === 'date'  ? { startDate: FIRST_DAY, endDate: LAST_DAY } :
                              { [key]: DEFAULT_FILTERS[key] };
        const novo = { ...appliedFilters, ...updates };
        setAppliedFilters(novo);
        setPendingFilters(novo);
        setSearchParams(buildParams(novo, sortBy));
    }

    function handleSortChange(valor) {
        setSortBy(valor);
        setSearchParams(prev => {
            const p = Object.fromEntries(prev);
            if (valor !== 'date_desc') p.sort = valor;
            else delete p.sort;
            return p;
        });
    }

    function handleNomeChange(value) {
        setPendingFilters(prev => ({ ...prev, nome: value }));
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setAppliedFilters(prev => ({ ...prev, nome: value }));
            setSearchParams(prev => {
                const p = Object.fromEntries(prev);
                if (value) p.nome = value;
                else delete p.nome;
                return p;
            });
        }, 300);
    }

    // ─── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = (e, id) => { e.preventDefault(); setDeleteModal({ open: true, id }); };
    const cancelDelete = () => setDeleteModal({ open: false, id: null });
    const confirmDelete = async () => {
        try {
            await deleteReceipt(deleteModal.id);
            setReceipts(prev => prev.filter(r => r.id !== deleteModal.id));
        } catch { alert('Erro ao excluir'); }
        finally { setDeleteModal({ open: false, id: null }); }
    };

    // ─── WhatsApp share ───────────────────────────────────────────────────────
    const shareWA = async (r) => {
        const msg = `Comprovante Processado ✅\n\n💰 Valor: ${formatCurrency(r.valor)}\n📅 Data: ${formatDateToUTC_DDMMYYYY(new Date(r.data_pagamento))}\n🏦 Banco: ${BANKS[r.banco?.toLowerCase()]?.name || r.banco || 'Outro'}\n👤 Nome: ${r.nome}\n📋 Tipo: ${r.tipo_pagamento || 'Outro'}\n\n_Enviado via ReceipTV_`;
        try {
            const response = await getReceiptFile(r.id);
            const blob = response.data;
            const extension = blob.type.split('/')[1] || 'jpg';
            const file = new File([blob], `comprovante_${r.id}.${extension}`, { type: blob.type });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Comprovante de Pagamento', text: msg });
                return;
            }
        } catch (err) { console.error('Erro ao compartilhar arquivo:', err); }
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // ─── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-[240px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="size-3 rounded-full bg-primary animate-pulse" />
                <span className="text-xs">Carregando histórico...</span>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Histórico"
                subtitle="Gerencie todos os seus comprovantes salvos."
            />

            {/* Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-600/10 p-8 rounded-xl border border-green-500/30 relative overflow-hidden group transition-all hover:bg-green-500/10">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ScrollText className="w-30 h-30" />
                    </div>
                    <p className="text-on-surface-variant font-headline text-xs uppercase tracking-[0.2em] mb-2">Total Registros</p>
                    <h3 className="text-4xl font-headline font-extrabold text-green-500 tracking-tight">{total}</h3>
                </div>
                <div className="bg-green-600/10 p-8 rounded-xl border border-green-500/30 relative overflow-hidden group transition-all hover:bg-green-500/10">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Banknote className="w-30 h-30" />
                    </div>
                    <p className="text-on-surface-variant font-headline text-xs uppercase tracking-[0.2em] mb-2">Valor Total</p>
                    <h3 className="text-4xl font-headline font-extrabold text-green-500 tracking-tight">
                        {formatCurrency(filteredSorted.reduce((acc, r) => acc + parseFloat(r.valor), 0))}
                    </h3>
                </div>
            </section>

            {/* Filter Panel */}
            <div className="bg-zinc-800 rounded-xl overflow-hidden">
                {/* Header — always visible */}
                <button
                    type="button"
                    onClick={() => setFiltersOpen(o => !o)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/50 transition-colors text-left"
                >
                    <SlidersHorizontal size={16} className="text-green-400 shrink-0" />
                    <span className="text-sm font-medium text-white">Filtros</span>
                    <div className="flex flex-wrap gap-1.5 flex-1 justify-start ml-2">
                        {activeFilterBadges.map(badge => (
                            <span
                                key={badge.key}
                                className="inline-flex items-center gap-1 bg-green-500/20 border border-green-500/40 text-green-300 text-xs px-2 py-0.5 rounded-full"
                                onClick={e => { e.stopPropagation(); removeFilter(badge.key); }}
                            >
                                {badge.label}
                                <X size={10} />
                            </span>
                        ))}
                    </div>
                    {filtersOpen
                        ? <ChevronUp size={16} className="text-zinc-400 shrink-0" />
                        : <ChevronDown size={16} className="text-zinc-400 shrink-0" />
                    }
                </button>

                {/* Body — animated collapse via CSS grid trick */}
                <div className={`grid transition-[grid-template-rows] duration-900 ease-in-out ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                        <div className="border-t border-zinc-700 p-4 space-y-4">
                            {/* Row 1: nome + date range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Buscar por nome</label>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Ex: João Silva..."
                                            value={pendingFilters.nome}
                                            onChange={e => handleNomeChange(e.target.value)}
                                            className={INPUT_CLS + ' pl-9'}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Período</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={pendingFilters.startDate}
                                            onChange={e => setPendingFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                            className={INPUT_CLS + ' [color-scheme:dark]'}
                                        />
                                        <input
                                            type="date"
                                            value={pendingFilters.endDate}
                                            onChange={e => setPendingFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                            className={INPUT_CLS + ' [color-scheme:dark]'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: tipo + banco + valorMin + valorMax */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Tipo de Pagamento</label>
                                    <select
                                        value={pendingFilters.tipoPagamento}
                                        onChange={e => setPendingFilters(prev => ({ ...prev, tipoPagamento: e.target.value }))}
                                        className={INPUT_CLS + ' cursor-pointer'}
                                    >
                                        <option value="">Todos</option>
                                        {paymentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Banco</label>
                                    <select
                                        value={pendingFilters.banco}
                                        onChange={e => setPendingFilters(prev => ({ ...prev, banco: e.target.value }))}
                                        className={INPUT_CLS + ' cursor-pointer'}
                                    >
                                        <option value="">Todos</option>
                                        {Object.entries(BANKS).map(([key, { name }]) => (
                                            <option key={key} value={key}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Valor Mín</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 50,00"
                                        value={pendingFilters.valorMin}
                                        onChange={e => setPendingFilters(prev => ({ ...prev, valorMin: e.target.value }))}
                                        className={INPUT_CLS}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Valor Máx</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 500,00"
                                        value={pendingFilters.valorMax}
                                        onChange={e => setPendingFilters(prev => ({ ...prev, valorMax: e.target.value }))}
                                        className={INPUT_CLS}
                                    />
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600 rounded-md transition-colors"
                                >
                                    Limpar Filtros
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-500/30 hover:bg-green-600 rounded-md transition-colors"
                                >
                                    Aplicar Filtros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sort bar + counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <span className="text-xs text-zinc-500">
                    Exibindo{' '}
                    <span className="text-zinc-300 font-medium">{Math.min(visibleCount, total)}</span>
                    {' '}de{' '}
                    <span className="text-zinc-300 font-medium">{total}</span>
                    {' '}registros
                </span>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500 whitespace-nowrap">Ordenar por</label>
                    <select
                        value={sortBy}
                        onChange={e => handleSortChange(e.target.value)}
                        className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 cursor-pointer transition-colors"
                    >
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Receipt list */}
            {total === 0 ? (
                <div className="text-center py-20 bg-zinc-800 rounded-2xl">
                    <List className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-zinc-300">
                        {receipts.length > 0 ? 'Nenhum resultado para os filtros aplicados' : 'Nenhum comprovante salvo'}
                    </h3>
                    <p className="text-zinc-500">
                        {receipts.length > 0 ? 'Tente ajustar ou limpar os filtros.' : 'Faça o upload do seu primeiro comprovante.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        {visibleReceipts.map(receipt => (
                            <div key={receipt.id} className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group">
                                {/* Row 1: icon + name + actions */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                                        <CircleDollarSign className="text-green-400" size={22} />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <h5 className="text-md font-bold text-white truncate">{receipt.nome}</h5>
                                        <p className="text-sm text-zinc-400 truncate">{receipt.descricao}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => shareWA(receipt)}
                                            className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors border border-[#25D366]/30"
                                            title="Enviar por WhatsApp"
                                            type="button"
                                        >
                                            <Smartphone size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, receipt.id)}
                                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30"
                                            title="Excluir"
                                            type="button"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                {/* Row 2: date + type + bank + value */}
                                <div className="grid grid-cols-4 gap-2 border-t border-zinc-700 pt-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium">Data</span>
                                        <span className="text-xs md:text-sm font-semibold text-white">{formatDateToUTC_DDMMYYYY(new Date(receipt.data_pagamento))}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium">Tipo</span>
                                        <span className="text-xs md:text-sm font-semibold text-white">{receipt.tipo_pagamento}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium">Banco</span>
                                        <span className="text-xs md:text-sm font-semibold text-white">{receipt.banco}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium">Valor</span>
                                        <span className="text-xs md:text-sm font-bold text-green-400">{formatCurrency(receipt.valor)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sentinel for IntersectionObserver */}
                    {visibleCount < total && (
                        <div ref={sentinelRef} className="flex justify-center py-6">
                            <span className="size-3 rounded-full bg-green-500/50 animate-pulse" />
                        </div>
                    )}
                </>
            )}

            <ConfirmModal
                open={deleteModal.open}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                title="Excluir comprovante?"
                description="Esta ação não pode ser desfeita."
                confirmLabel="Sim, excluir"
                icon={
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <Trash2 className="text-red-400" size={26} />
                    </div>
                }
            />
        </div>
    );
};

export default HistoryPage;
