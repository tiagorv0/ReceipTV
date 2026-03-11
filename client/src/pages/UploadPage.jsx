import { useState, useRef } from 'react';
import { Upload as UploadIcon, CheckCircle, Smartphone } from 'lucide-react';
import { analyzeReceipt } from '../api/services';
import PageHeader from '../components/PageHeader';
import BankTag from '../components/BankTag';
import { BANKS } from '../utils/banks';

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
        const msg = `Comprovante Processado ✅\n\n💰 Valor: R$ ${result.valor}\n📅 Data: ${result.data}\n🏦 Banco: ${BANKS[result.banco?.toLowerCase()]?.name || result.banco || 'Outro'}\n👤 Nome: ${result.nome}\n📋 Tipo: ${result.tipo_pagamento}\n\n_Enviado via ReceipTV_`;

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
        <div className="upload-page">
            <PageHeader
                title="Enviar Comprovante"
                subtitle="Arraste seu arquivo para análise instantânea"
            />

            <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                />
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Analisando dados...</p>
                    </div>
                ) : (
                    <div className="upload-idle-state">
                        <UploadIcon size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
                        <p className="upload-idle-title">Clique para fazer upload</p>
                        <p className="upload-idle-subtitle">PNG, JPG ou JPEG</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="upload-error">
                    {error}
                </div>
            )}

            {result && (
                <div className="upload-result-card">
                    <div className="upload-result-header">
                        <CheckCircle size={20} />
                        <span>Processado com sucesso</span>
                    </div>

                    <div className="upload-result-grid">
                        <div className="upload-result-item">
                            <p className="upload-result-label">Nome</p>
                            <p className="upload-result-value">{result.nome}</p>
                        </div>
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
