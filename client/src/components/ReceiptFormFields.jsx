import { Paperclip } from 'lucide-react';
import { BANKS } from '../utils/banks';

const PAYMENT_TYPES = ['PIX', 'TED', 'DOC', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Outro'];

const inputClass =
    'w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-white placeholder-zinc-500 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500/30 transition-all';

const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

/**
 * Campos reutilizáveis do formulário de comprovante.
 * Usado tanto em ManualUploadForm (criação) quanto em EditReceiptModal (edição).
 *
 * @param {{ form, onChange, file, onFileChange, existingFileName, fileInputRef }} props
 */
const ReceiptFormFields = ({ form, onChange, file, onFileChange, existingFileName, fileInputRef }) => {
    const handleChange = (e) => onChange(e.target.name, e.target.value);

    const handleValorChange = (e) => {
        const raw = e.target.value.replace(/[^0-9,.]/g, '');
        onChange('valor', raw);
    };

    const handleValorBlur = () => {
        const num = parseFloat(form.valor.replace(',', '.'));
        if (!isNaN(num)) {
            onChange('valor', num.toFixed(2).replace('.', ','));
        }
    };

    const handleFileChange = (e) => {
        onFileChange(e.target.files[0] || null);
    };

    const fileLabel = file
        ? file.name
        : existingFileName
            ? existingFileName
            : 'Nenhum arquivo selecionado';

    return (
        <div className="space-y-4">
            {/* Arquivo */}
            <div>
                <label className={labelClass}>Arquivo do Comprovante</label>
                <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-zinc-400 px-4 py-3 text-sm flex items-center gap-2 hover:border-green-600 transition-all"
                >
                    <Paperclip className="w-4 h-4 shrink-0" />
                    <span className="truncate">{fileLabel}</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {/* Data + Tipo */}
            <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                    <label className={labelClass}>Data de Pagamento <span className="text-red-400">*</span></label>
                    <input
                        type="date"
                        name="data_pagamento"
                        value={form.data_pagamento}
                        onChange={handleChange}
                        className={inputClass + ' [color-scheme:dark]'}
                        required
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <label className={labelClass}>Tipo de Pagamento <span className="text-red-400">*</span></label>
                    <select
                        name="tipo_pagamento"
                        value={form.tipo_pagamento}
                        onChange={handleChange}
                        className={inputClass + ' cursor-pointer'}
                        required
                    >
                        <option value="" disabled>Selecione</option>
                        {PAYMENT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Nome */}
            <div>
                <label className={labelClass}>Nome de quem recebeu o pagamento <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    placeholder="Ex: Supermercado XYZ"
                    className={inputClass}
                    required
                />
            </div>

            {/* Valor + Banco */}
            <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                    <label className={labelClass}>Valor <span className="text-red-400">*</span></label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            name="valor"
                            value={form.valor}
                            onChange={handleValorChange}
                            onBlur={handleValorBlur}
                            placeholder="0,00"
                            className={inputClass + ' pl-9'}
                            required
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <label className={labelClass}>Banco</label>
                    <select
                        name="banco"
                        value={form.banco}
                        onChange={handleChange}
                        className={inputClass + ' cursor-pointer'}
                    >
                        {Object.entries(BANKS).map(([key, { name }]) => (
                            <option key={key} value={key}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Descrição */}
            <div>
                <label className={labelClass}>Descrição</label>
                <textarea
                    name="descricao"
                    value={form.descricao}
                    onChange={handleChange}
                    placeholder="Observações opcionais"
                    className={inputClass + ' h-20'}
                />
            </div>
        </div>
    );
};

export default ReceiptFormFields;
