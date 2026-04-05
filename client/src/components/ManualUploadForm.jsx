import { useState, useRef } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { createManualReceipt } from '../api/services';
import FilePreview from './FilePreview';
import ReceiptFormFields from './ReceiptFormFields';
import Error from './Error';

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

    const handleChange = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
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

        const valorNum = parseFloat(form.valor.replace(',', '.'));
        if (!form.nome.trim() || isNaN(valorNum) || valorNum <= 0 || !form.data_pagamento || !form.tipo_pagamento) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        const formData = new FormData();
        Object.entries(form).forEach(([key, val]) => {
            if (val) {
                const finalVal = key === 'valor'
                    ? parseFloat(val.replace(',', '.'))
                    : val;
                formData.append(key, finalVal);
            }
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

                <ReceiptFormFields
                    form={form}
                    onChange={handleChange}
                    file={file}
                    onFileChange={setFile}
                    existingFileName={null}
                    fileInputRef={fileInputRef}
                />

                {error && <Error message={error} />}

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500/30 hover:bg-green-600 disabled:opacity-60 text-white hover:text-white font-medium py-3 text-sm transition-colors"
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
