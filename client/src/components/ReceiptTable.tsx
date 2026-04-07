import { useState } from 'react';
import BankTag from './BankTag';
import { Smartphone, Trash2 } from 'lucide-react';
import { formatDateToUTC_DDMMYYYY } from '../utils/date-utils';
import type { Receipt } from '@/types/receipt';

interface ReceiptTableProps {
    receipts: Receipt[];
    onShare: (receipt: Receipt) => void;
    onDelete: (id: number) => void;
}

const ReceiptTable = ({ receipts, onShare, onDelete }: ReceiptTableProps) => {
    const [_pendingDeleteId, _setPendingDeleteId] = useState<number | null>(null);

    if (!receipts || receipts.length === 0) {
        return (
            <div className="table-container">
                <div className="table-empty">
                    Nenhum comprovante salvo ainda. Envie o primeiro na aba de Upload.
                </div>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>DATA</th>
                        <th>NOME</th>
                        <th>BANCO</th>
                        <th>TIPO</th>
                        <th className="table-cell-right">VALOR</th>
                        <th className="table-cell-right">AÇÕES</th>
                    </tr>
                </thead>
                <tbody>
                    {receipts.map((r) => (
                        <tr key={r.id}>
                            <td style={{ color: 'var(--text-dim)' }}>
                                {formatDateToUTC_DDMMYYYY(new Date(r.data_pagamento))}
                            </td>
                            <td>{r.nome}</td>
                            <td>
                                <BankTag bank={r.banco} />
                            </td>
                            <td>{r.tipo_pagamento}</td>
                            <td className="table-cell-right">
                                R$ {Number(r.valor).toFixed(2)}
                            </td>
                            <td className="table-cell-right">
                                <div className="table-actions relative">
                                    <button
                                        type="button"
                                        onClick={() => onShare(r)}
                                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                                    >
                                        <Smartphone size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(r.id)}
                                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px' }}>Total:</td>
                        <td className="table-cell-right" style={{ fontWeight: 'bold', padding: '12px', color: 'var(--text-bright)' }}>
                            R$ {receipts.reduce((acc, r) => acc + (Number(r.valor) || 0), 0).toFixed(2)}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default ReceiptTable;
