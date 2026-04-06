import { useState, useRef, useEffect } from 'react';
import { Loader2, Pencil, FileText } from 'lucide-react';
import { updateReceipt, getReceiptFile } from '../api/services';
import { detectBank } from '../utils/banks';
import ReceiptFormFields from './ReceiptFormFields';
import Error from './Error';

/**
 * Converte data ISO (ex: "2026-03-15T00:00:00.000Z") para "YYYY-MM-DD".
 */
function toDateInput(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    } catch { return ''; }
}

/**
 * Converte valor numérico/string de banco de dados para formato de formulário "150,00".
 */
function toValorInput(valor) {
    if (!valor) return '';
    const num = parseFloat(valor);
    if (isNaN(num)) return '';
    return num.toFixed(2).replace('.', ',');
}

/**
 * Exibe preview do arquivo: imagem inline ou PDF em iframe.
 * Prioriza o novo arquivo selecionado; cai para o preview buscado da API.
 */
const FilePreview = ({ file, fetchedPreview }) => {
    const [localUrl, setLocalUrl] = useState(null);

    useEffect(() => {
        if (!file) { setLocalUrl(null); return; }
        const url = URL.createObjectURL(file);
        setLocalUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const src  = localUrl ?? fetchedPreview?.url ?? null;
    const type = file ? file.type : fetchedPreview?.type ?? '';

    if (!src) return null;

    const isImage = type.startsWith('image/');
    const isPdf   = type === 'application/pdf';

    return (
        <div className="mx-6 mt-2 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
            {isImage && (
                <img
                    src={src}
                    alt="Preview do comprovante"
                    className="w-full max-h-64 object-contain"
                />
            )}
            {isPdf && (
                <iframe
                    src={src}
                    title="Preview do comprovante"
                    className="w-full h-64"
                />
            )}
            {!isImage && !isPdf && (
                <div className="flex items-center gap-2 px-4 py-3 text-zinc-400 text-sm">
                    <FileText size={16} />
                    <span className="truncate">{file?.name ?? fetchedPreview?.type}</span>
                </div>
            )}
        </div>
    );
};

const EditReceiptModal = ({ open, receipt, onClose, onSave }) => {
    const fileInputRef = useRef();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fetchedPreview, setFetchedPreview] = useState(null); // { url, type }
    const fetchedUrlRef = useRef(null);
    const [form, setForm] = useState({
        nome: '',
        valor: '',
        data_pagamento: '',
        tipo_pagamento: '',
        banco: 'outro',
        descricao: '',
    });

    // Pré-preenche o formulário e busca preview do arquivo ao abrir
    useEffect(() => {
        if (open && receipt) {
            setForm({
                nome: receipt.nome ?? '',
                valor: toValorInput(receipt.valor),
                data_pagamento: toDateInput(receipt.data_pagamento),
                tipo_pagamento: receipt.tipo_pagamento ?? '',
                banco: detectBank(receipt.banco),
                descricao: receipt.descricao ?? '',
            });
            setFile(null);
            setError('');
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Busca o arquivo existente para preview
            if (receipt.arquivo_nome) {
                getReceiptFile(receipt.id)
                    .then(({ data: blob }) => {
                        if (fetchedUrlRef.current) URL.revokeObjectURL(fetchedUrlRef.current);
                        const url = URL.createObjectURL(blob);
                        fetchedUrlRef.current = url;
                        setFetchedPreview({ url, type: blob.type });
                    })
                    .catch(() => setFetchedPreview(null));
            } else {
                setFetchedPreview(null);
            }
        }

        if (!open) {
            if (fetchedUrlRef.current) {
                URL.revokeObjectURL(fetchedUrlRef.current);
                fetchedUrlRef.current = null;
            }
            setFetchedPreview(null);
        }
    }, [open, receipt]);

    if (!open) return null;

    const handleChange = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const valorNum = parseFloat(form.valor.replace(',', '.'));
        if (!form.nome.trim() || isNaN(valorNum) || valorNum <= 0 || !form.data_pagamento || !form.tipo_pagamento) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        const formData = new FormData();
        Object.entries(form).forEach(([key, val]) => {
            if (val !== null && val !== undefined && val !== '') {
                const finalVal = key === 'valor' ? parseFloat(val.replace(',', '.')) : val;
                formData.append(key, finalVal);
            }
        });
        if (file) formData.append('file', file);

        setLoading(true);
        try {
            const { data } = await updateReceipt(receipt.id, formData);
            onSave(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao salvar alterações.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[calc(100dvh-7rem)] md:max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-6 pb-4 border-b border-zinc-800">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <Pencil className="text-blue-400" size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Editar Comprovante</h3>
                </div>

                {/* Preview do documento */}
                <FilePreview file={file} fetchedPreview={fetchedPreview} />

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <ReceiptFormFields
                        form={form}
                        onChange={handleChange}
                        file={file}
                        onFileChange={setFile}
                        existingFileName={receipt?.arquivo_nome ?? null}
                        fileInputRef={fileInputRef}
                    />

                    {error && <Error message={error} />}

                    {/* Ações */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-10 rounded-lg bg-green-500/30 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                                : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditReceiptModal;
