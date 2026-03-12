import { useState, useEffect, useMemo } from 'react';
import { getReceipts, deleteReceipt, getReceiptFile } from '../api/services';
import PageHeader from '../components/PageHeader';
import ReceiptTable from '../components/ReceiptTable';
import { BANKS } from '../utils/banks';
import { formatDateToUTC_DDMMYYYY } from '../utils/date-utils';

const HistoryPage = () => {
    const date = new Date(), y = date.getFullYear(), m = date.getMonth();
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(y, m, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(y, m + 1, 0).toISOString().split('T')[0]);

    useEffect(() => {
        fetchReceipts();
    }, []);

    const fetchReceipts = async () => {
        try {
            const { data } = await getReceipts(startDate, endDate);
            setReceipts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        alert('Excluir este comprovante?');
        try {
            await deleteReceipt(id);
            setReceipts(receipts.filter(r => r.id !== id));
        } catch (err) {
            alert('Erro ao excluir');
        }
    }
    

    const shareWA = async (r) => {
        const msg = `Comprovante Processado ✅\n\n💰 Valor: R$ ${r.valor}\n📅 Data: ${formatDateToUTC_DDMMYYYY(new Date(r.data_pagamento))}\n🏦 Banco: ${BANKS[r.banco?.toLowerCase()]?.name || r.banco || 'Outro'}\n👤 Nome: ${r.nome}\n📋 Tipo: ${r.tipo_pagamento || 'Outro'}\n\n_Enviado via ReceipTV_`;

        try {
            // Tenta buscar o arquivo original do banco de dados
            const response = await getReceiptFile(r.id);
            const blob = response.data;

            // Cria um objeto File para compartilhar
            const extension = blob.type.split('/')[1] || 'jpg';
            const file = new File([blob], `comprovante_${r.id}.${extension}`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Comprovante de Pagamento',
                    text: msg,
                });
                return;
            }
        } catch (err) {
            console.error("Erro ao compartilhar arquivo:", err);
            // Fallback para o link wa.me se o compartilhamento falhar
        }

        // Fallback: Abre o link direto do WhatsApp (apenas texto)
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => {
            if (!startDate && !endDate) return true;
            // Parse r.data_pagamento safely
            let rDate = '';
            try {
                // To avoid timezone issues when converting to ISO string
                const d = formatDateToUTC_DDMMYYYY(new Date(r.data_pagamento));
                rDate = d.toISOString().split('T')[0];
            } catch (e) {
                return true;
            }

            if (startDate && rDate < startDate) return false;
            if (endDate && rDate > endDate) return false;
            return true;
        });
    }, [receipts, startDate, endDate]);

    if (loading) {
        return (
            <div className="min-h-[240px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="size-3 rounded-full bg-primary animate-pulse" />
                <span className="text-xs">Carregando histórico...</span>
            </div>
        );
    }

    return (
        <div className="history-page flex flex-col gap-6">
            <PageHeader
                title="Histórico"
                subtitle="Todos os seus comprovantes salvos"
            />
            <div className="flex gap-4 items-end bg-card p-4 rounded-xl border border-border/50">
                <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Inicial</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Final</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    />
                </div>
                {(startDate || endDate) && (
                    <button 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="h-10 px-4 py-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md text-sm font-medium transition-colors"
                    >
                        Limpar Filtro
                    </button>
                )}
            </div>

            <ReceiptTable
                receipts={filteredReceipts}
                onShare={shareWA}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default HistoryPage;
