import { useState, useRef, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Upload as UploadIcon, CheckCircle, Smartphone, UploadCloud, Loader2} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { analyzeReceipt } from '../api/services';
import BankTag from '../components/BankTag';
import ManualUploadForm from '../components/ManualUploadForm';
import { BANKS } from '../utils/banks';
import { formatDateToUTC_DDMMYYYY } from '../utils/date-utils';
import Error from '../components/Error';

const SHARE_ERROR_MESSAGES = {
    size: 'O arquivo é muito grande (limite: 10MB).',
    type: 'Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou PDF.',
    storage: 'Erro ao salvar o arquivo temporariamente. Tente novamente.',
    nofile: 'Nenhum arquivo foi recebido.',
    parse: 'Erro ao ler o arquivo compartilhado.',
};

const UploadPage = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState('ia'); // 'ia' | 'manual'

    // Estado do modo IA
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef();

    // Recebe arquivo pré-selecionado ou erros vindos do fluxo de Share Target
    useEffect(() => {
        const shareError = searchParams.get('share_error');
        if (shareError) {
            setError(SHARE_ERROR_MESSAGES[shareError] ?? 'Erro ao receber o arquivo compartilhado.');
        }

        const stateError = location.state?.shareError;
        if (stateError) {
            setError(stateError);
        }

        const sharedFile = location.state?.sharedFile;
        if (sharedFile instanceof File) {
            handleFiles([sharedFile]);
        }
    }, []);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        setError('');
        setResult(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFiles = async (files) => {
        const file = files[0];
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);
        setSelectedFile(file);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await analyzeReceipt(formData);
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao analisar o comprovante. Tente Novamente. Caso persista, utilize o modo manual.');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openWhatsApp = async () => {
        const msg = `Comprovante Processado ✅\n\n💰 Valor: R$ ${result.valor.toFixed(2)}\n📅 Data: ${formatDateToUTC_DDMMYYYY(new Date(result.data))}\n🏦 Banco: ${BANKS[result.banco?.toLowerCase()]?.name || result.banco || 'Outro'}\n👤 Nome: ${result.nome}\n📋 Tipo: ${result.tipo_pagamento}\n\n_Enviado via ReceipTV_`;

        if (navigator.canShare && selectedFile && navigator.canShare({ files: [selectedFile] })) {
            try {
                await navigator.share({ files: [selectedFile], title: 'Comprovante de Pagamento', text: msg });
                return;
            } catch (err) {
                console.error('Erro ao compartilhar via Web Share API:', err);
            }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <PageHeader
                title="Leitor de Comprovantes"
                subtitle={mode === 'ia'
                    ? 'Faça o upload do seu comprovante. Nossa IA extrairá os dados automaticamente.'
                    : 'Preencha os dados do comprovante manualmente.'}
                centered
            />

            {/* Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex bg-zinc-800 border border-green-500/30 rounded-xl p-1 gap-1">
                    <button
                        onClick={() => handleModeChange('ia')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            mode === 'ia'
                                ? 'bg-green-500/30 text-white shadow'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Analisar por IA
                    </button>
                    <button
                        onClick={() => handleModeChange('manual')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            mode === 'manual'
                                ? 'bg-green-500/30 text-white shadow'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Lançar Manualmente
                    </button>
                </div>
            </div>

            {/* Modo IA */}
            {mode === 'ia' && (
                <>
                    <form
                        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[350px] ${dragOver ? 'border-green-400 bg-green-500/5 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.15)]' : 'border-green-400/50 bg-zinc-800 hover:border-green-500/50 hover:bg-zinc-800'}`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.target.files); }}
                            accept=".jpg, .jpeg, .png, .pdf"
                        />
                        {loading ? (
                            <div className="bg-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[350px]">
                                <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                                <h3 className="text-xl font-medium text-white mb-2 animate-pulse">Lendo comprovante...</h3>
                                <p className="text-zinc-500">Extraindo valor, data, banco e tipo de pagamento.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="bg-zinc-700 p-4 rounded-full mb-4 shadow-lg">
                                    <UploadCloud className="w-12 h-12 text-green-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-zinc-200 mb-2">Arraste seu arquivo aqui</h3>
                                <p className="text-zinc-500 mb-6">ou clique para selecionar (JPEG, JPG, PNG, PDF)</p>
                            </div>
                        )}
                    </form>

                    {error && <Error message={error} />}

                    {result && (
                        <div className="bg-zinc-800 border border-green-500/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(34,197,94,0.05)]">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-800">
                                <CheckCircle className="text-green-400 w-8 h-8" />
                                <div>
                                    <h3 className="text-2xl sm:text-xl font-bold text-white">Dados Extraídos com Sucesso</h3>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="upload-result-item">
                                        <p className="upload-result-label">Nome</p>
                                        <p className="upload-result-value">{result.nome}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-8">
                                    <div className="upload-result-item">
                                        <p className="upload-result-label">Valor</p>
                                        <p className="upload-result-value upload-result-value--highlight">R$ {Number(result.valor).toFixed(2)}</p>
                                    </div>
                                    <div className="upload-result-item">
                                        <p className="upload-result-label">Tipo</p>
                                        <p className="upload-result-value">{result.tipo_pagamento}</p>
                                    </div>
                                    <div className="upload-result-item">
                                        <p className="upload-result-label">Banco</p>
                                        <BankTag bank={result.banco} />
                                    </div>
                                </div>
                            </div>
                            <button className="wa-share-btn" onClick={openWhatsApp}>
                                <Smartphone size={20} />
                                Compartilhar no WhatsApp
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modo Manual */}
            {mode === 'manual' && (
                <div className="bg-zinc-800 border border-green-500/30 rounded-3xl p-6 md:p-8">
                    <ManualUploadForm />
                </div>
            )}
        </div>
    );
};

export default UploadPage;
