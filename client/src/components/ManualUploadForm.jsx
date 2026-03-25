import { useState, useRef } from 'react';
import { CheckCircle, Loader2, Paperclip } from 'lucide-react';
import { createManualReceipt } from '../api/services';
import FilePreview from './FilePreview';
import { BANKS } from '../utils/banks';

const PAYMENT_TYPES = ['PIX', 'TED', 'DOC', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Outro'];

const inputClass =
    'w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-white placeholder-zinc-500 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500/30 transition-all';

const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

const ManualUploadForm = ({ onSuccess }) => {
    const fileInputRef = useRef();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        nome: '',
        valor: '',
        data_pagamento: new Date().toISOString().split('T')[0],
        tipo_pagamento: '',
        banco: 'outro',
        descricao: '',
    });

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0] || null);
    };

    const handleReset = () => {
        setForm({
            nome: '',
            valor: '',
            data_pagamento: new Date().toISOString().split('T')[0],
            tipo_pagamento: '',
            banco: 'outro',
            descricao: '',
        });
        setFile(null);
        setError('');
        setSuccess(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.nome.trim() || !form.valor || !form.data_pagamento || !form.tipo_pagamento) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        const formData = new FormData();
        Object.entries(form).forEach(([key, val]) => {
            if (val) formData.append(key, val);
        });
        if (file) formData.append('file', file);

        setLoading(true);
        try {
            await createManualReceipt(formData);
            setSuccess(true);
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao registrar comprovante.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <CheckCircle className="w-14 h-14 text-green-400" />
                <h3 className="text-xl font-bold text-white">Comprovante registrado!</h3>
                <p className="text-zinc-400 text-sm">O comprovante foi salvo com sucesso.</p>
                <button
                    onClick={handleReset}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                >
                    Registrar outro
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 w-full">
            {/* Formulário */}
            <form onSubmit={handleSubmit} className="flex-1 space-y-4 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-1">Lançamento Manual de Comprovante</h3>

                {/* Arquivo */}
                <div>
                    <label className={labelClass}>Arquivo do Comprovante</label>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-zinc-400 px-4 py-3 text-sm flex items-center gap-2 hover:border-green-600 transition-all"
                    >
                        <Paperclip className="w-4 h-4 shrink-0" />
                        <span className="truncate">{file ? file.name : 'Nenhum arquivo selecionado'}</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>

                {/* Data de pagamento */}
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
                    {/* Tipo de pagamento */}
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

                {/* Valor e Banco */}
                <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                        <label className={labelClass}>Valor <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                            <input
                                type="number"
                                name="valor"
                                value={form.valor}
                                onChange={handleChange}
                                placeholder="0,00"
                                min="0.01"
                                step="0.01"
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
                        className={inputClass + ' h-20 '}
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                        {error}
                    </p>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-700 border border-green-700 hover:bg-green-600 disabled:opacity-60 text-green-600 hover:text-white font-medium py-3 text-sm transition-colors"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loading ? 'Salvando...' : 'Salvar Comprovante'}
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </form>

            {/* Visualizador */}
            <div className="w-full md:w-72 lg:w-80 shrink-0 rounded-2xl bg-zinc-800 border border-green-500/30 overflow-hidden min-h-[420px] flex items-center justify-center">
                <FilePreview file={file} />
            </div>
        </div>
    );
};

export default ManualUploadForm;
