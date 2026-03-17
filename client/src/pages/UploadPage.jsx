import { useState, useRef } from 'react';
import { Upload as UploadIcon, CheckCircle, Smartphone, UploadCloud, Loader2 } from 'lucide-react';
import { analyzeReceipt } from '../api/services';
import PageHeader from '../components/PageHeader';
import BankTag from '../components/BankTag';
import { BANKS } from '../utils/banks';
import { formatDateToUTC_DDMMYYYY } from '../utils/date-utils';

const UploadPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef();

    const handleFiles = async (files) => {
        const file = files[0];
        if (!file) return;

        setLoading(true);
        setError("");
        setResult(null);

        setSelectedFile(file);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await analyzeReceipt(formData);
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message || "Erro ao analisar o comprovante.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const openWhatsApp = async () => {
        const msg = `Comprovante Processado ✅\n\n💰 Valor: R$ ${result.valor.toFixed(2)}\n📅 Data: ${formatDateToUTC_DDMMYYYY(new Date(result.data))}\n🏦 Banco: ${BANKS[result.banco?.toLowerCase()]?.name || result.banco || 'Outro'}\n👤 Nome: ${result.nome}\n📋 Tipo: ${result.tipo_pagamento}\n\n_Enviado via ReceipTV_`;

        // Tenta usar a Web Share API para compartilhar o arquivo (funciona melhor em mobile)
        if (navigator.canShare && selectedFile && navigator.canShare({ files: [selectedFile] })) {
            try {
                await navigator.share({
                    files: [selectedFile],
                    title: 'Comprovante de Pagamento',
                    text: msg,
                });
                return;
            } catch (err) {
                console.error("Erro ao compartilhar via Web Share API:", err);
                // Fallback para o link wa.me se o usuário cancelar ou der erro
            }
        }

        // Fallback: Abre o link direto do WhatsApp (apenas texto)
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <header className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Leitor de Comprovantes</h2>
                <p className="text-zinc-400">Faça o upload do seu comprovante. Nossa IA extrairá os dados automaticamente.</p>
            </header>

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
                    accept='.jpg, .jpeg, .png, .pdf'
                />
                {loading ? (
                    <div className="bg-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[350px]">
                        <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2 animate-pulse">Lendo comprovante...</h3>
                        <p className="text-zinc-500">Extraindo valor, data, banco e tipo de pagamento.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="bg-zinc-800 p-4 rounded-full mb-4 shadow-lg">
                            <UploadCloud className="w-12 h-12 text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-200 mb-2">Arraste seu arquivo aqui</h3>
                        <p className="text-zinc-500 mb-6">ou clique para selecionar (JPEG, JPG, PNG, PDF)</p>
                    </div>
                )}
            </form>

            {error && (
                <div className="upload-error">
                    {error}
                </div>
            )}

            {result && (
                <div className="bg-zinc-800 border border-green-500/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(34,197,94,0.05)]">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-800">
                        <CheckCircle className="text-green-400 w-8 h-8" />
                        <div>
                            <h3 className="text-2xl sm:text-xl font-bold text-white">Dados Extraídos com Sucesso</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className='flex items-center gap-4 flex-1'>
                        <div className="upload-result-item">
                            <p className="upload-result-label">Nome</p>
                            <p className="upload-result-value">{result.nome}</p>
                        </div>
                        </div>
                        <div className='flex items-center justify-between w-full md:w-auto gap-6 md:gap-8'>
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
        </div>
    );
};

export default UploadPage;
