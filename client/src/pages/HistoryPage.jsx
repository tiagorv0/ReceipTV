import { useState, useEffect, useMemo } from 'react';
import { getReceipts, deleteReceipt, getReceiptFile } from '../api/services';
import { BANKS } from '../utils/banks';
import { formatDateToUTC_DDMMYYYY } from '../utils/date-utils';
import { List, Calendar, Smartphone, Trash2, CircleDollarSign } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '../utils/currency-utils';
import BankTag from '../components/BankTag';
import ConfirmModal from '../components/ConfirmModal';

const HistoryPage = () => {
    const date = new Date(), y = date.getFullYear(), m = date.getMonth();
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(y, m, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(y, m + 1, 0).toISOString().split('T')[0]);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

    useEffect(() => {
        fetchReceipts();
    }, [startDate, endDate]);

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

    const handleDelete = (e, id) => {
        e.preventDefault();
        setDeleteModal({ open: true, id });
    };

    const confirmDelete = async () => {
        try {
            await deleteReceipt(deleteModal.id);
            setReceipts(receipts.filter(r => r.id !== deleteModal.id));
        } catch (err) {
            alert('Erro ao excluir');
        } finally {
            setDeleteModal({ open: false, id: null });
        }
    };

    const cancelDelete = () => setDeleteModal({ open: false, id: null });
    

    const shareWA = async (r) => {
        const msg = `Comprovante Processado ✅\n\n💰 Valor: ${formatCurrency(r.valor)}\n📅 Data: ${formatDateToUTC_DDMMYYYY(new Date(r.data_pagamento))}\n🏦 Banco: ${BANKS[r.banco?.toLowerCase()]?.name || r.banco || 'Outro'}\n👤 Nome: ${r.nome}\n📋 Tipo: ${r.tipo_pagamento || 'Outro'}\n\n_Enviado via ReceipTV_`;

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
            let rDate = '';
            try {
                const dateObj = new Date(r.data_pagamento);
                if (isNaN(dateObj.getTime())) return true;
                
                const year = dateObj.getUTCFullYear();
                const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getUTCDate()).padStart(2, '0');
                rDate = `${year}-${month}-${day}`;
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
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <PageHeader
          title="Histórico"
          subtitle="Gerencie todos os seus comprovantes salvos."
          actions={
            <div className="bg-zinc-800 border border-green-500/30 rounded-lg px-4 py-2 text-sm text-zinc-300">
              Total de <span className="text-green-400 font-bold">{filteredReceipts.length}</span> registros
            </div>
          }
        />

        <div className="flex flex-col sm:flex-row w-full bg-zinc-900 gap-4 sm:items-end p-4 rounded-xl border border-green-500/30">
                <div className="flex flex-col gap-1.5 flex-1 w-full sm:max-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Inicial</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors [color-scheme:dark]"
                    />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 w-full sm:max-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Final</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors [color-scheme:dark]"
                    />
                </div>
                {(startDate || endDate) && (
                  <div className="flex flex-col gap-1.5 flex-1 w-full sm:max-w-[200px]">
                    <button 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="flex items-center justify-center h-10 px-4 py-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md text-sm font-medium transition-colors border"
                    >
                        Limpar Filtro
                    </button>
                  </div>
                )}
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="text-center py-20 bg-zinc-800 border border-green-500/30 rounded-2xl">
            <List className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-zinc-300">Nenhum comprovante salvo</h3>
            <p className="text-zinc-500">Faça o upload do seu primeiro comprovante.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReceipts.map(receipt => (
              <div key={receipt.id} className="bg-zinc-800 border border-green-500/30 rounded-xl p-4 md:p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-zinc-700 transition-colors group ">
                
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center shrink-0 border border-green-500/30">
                    <CircleDollarSign className="text-green-400" size={25} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      {receipt.nome}
                      <span className="text-xs px-2 py-0.5 bg-zinc-800 text-green-400 rounded-full border border-green-500/30 font-normal">
                        {receipt.tipo_pagamento}
                      </span>
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={14}/> {formatDateToUTC_DDMMYYYY(new Date(receipt.data_pagamento))}</span>
                      <BankTag bank={receipt.banco} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-8">
                  <div className="text-xl font-bold text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                    {formatCurrency(receipt.valor)}
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => shareWA(receipt)}
                      className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors border border-[#25D366]/30"
                      title="Enviar por WhatsApp"
                      type='button'
                    >
                      <Smartphone size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, receipt.id)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30"
                      title="Excluir"
                      type='button'
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
