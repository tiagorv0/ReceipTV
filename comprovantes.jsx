import { useState, useRef, useCallback } from "react";

const BANKS = {
  itau: { name: "Itaú", color: "#EC7000", bg: "#FFF4EB" },
  bradesco: { name: "Bradesco", color: "#CC092F", bg: "#FFF0F3" },
  caixa: { name: "Caixa", color: "#005CA9", bg: "#EBF4FF" },
  sicoob: { name: "Sicoob", color: "#007A3E", bg: "#EBFAF3" },
  nubank: { name: "Nubank", color: "#820AD1", bg: "#F5EBFF" },
  inter: { name: "Inter", color: "#FF6A00", bg: "#FFF3EB" },
  santander: { name: "Santander", color: "#EC0000", bg: "#FFEBEB" },
  outro: { name: "Outro", color: "#6B7280", bg: "#F3F4F6" },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export default function App() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [phone, setPhone] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const fileInputRef = useRef();

  const openWhatsApp = (t) => {
    if (!phone) { setPhoneInput(""); setEditingPhone(true); return; }
    const num = phone.startsWith("55") ? phone : "55" + phone;
    const msg = `Transferência realizada ✅\n\n💰 Valor: ${formatCurrency(t.valor)}\n📅 Data: ${formatDate(t.data)}\n🏦 Banco: ${BANKS[t.banco]?.name || "Outro"}\n\n_Enviado pelo app de comprovantes_`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const analyzeFile = useCallback(async (file) => {
    setLoading(true);
    setError("");
    setLastResult(null);

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const isPdf = file.type === "application/pdf";
      const mediaType = isPdf ? "application/pdf" : file.type;
      const prompt = `Você é um extrator de dados de comprovantes bancários brasileiros.
Analise este comprovante e extraia:
1. Valor da transferência (número decimal, ex: 150.00)
2. Data da transferência (formato YYYY-MM-DD)
3. Banco identificado: escolha APENAS UM: itau, bradesco, caixa, sicoob, nubank, inter, santander, outro

Responda APENAS com JSON válido, sem markdown, sem explicações:
{"valor": 150.00, "data": "2024-01-15", "banco": "itau"}`;

      const contentItem = isPdf
        ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
        : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: [contentItem, { type: "text", text: prompt }] }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((i) => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const entry = {
        id: Date.now(),
        valor: parseFloat(parsed.valor),
        data: parsed.data,
        banco: parsed.banco || "outro",
        arquivo: file.name,
        criadoEm: new Date().toISOString(),
      };

      setTransfers((prev) => [entry, ...prev]);
      setLastResult(entry);
    } catch (err) {
      setError("Não foi possível analisar o comprovante. Tente novamente com uma imagem mais clara.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;
    const valid = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!valid.includes(file.type)) { setError("Formato não suportado. Use PNG, JPG, WEBP ou PDF."); return; }
    analyzeFile(file);
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  const total = transfers.reduce((s, t) => s + t.valor, 0);
  const byBank = transfers.reduce((acc, t) => { acc[t.banco] = (acc[t.banco] || 0) + t.valor; return acc; }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F13", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#F0EDE8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .upload-zone { transition: all 0.2s ease; }
        .upload-zone:hover { border-color: #6EE7B7 !important; background: rgba(110,231,183,0.04) !important; }
        .row-item { transition: background 0.15s; }
        .row-item:hover { background: rgba(255,255,255,0.03) !important; }
        .wabtn { transition: all 0.2s; border: none; cursor: pointer; background: #1A3A2A; color: #6EE7B7; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; }
        .wabtn:hover { background: #25D366 !important; color: #fff !important; }
        .wabtn-lg { padding: 10px 18px !important; font-size: 13px !important; border-radius: 10px !important; }
        .phone-save { transition: all 0.2s; border: none; cursor: pointer; background: #6EE7B7; color: #0F0F13; border-radius: 8px; padding: 7px 16px; font-size: 12px; font-weight: 700; font-family: inherit; }
        .phone-save:hover { background: #5CD6A8; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
        .slide-in { animation: slideIn 0.3s ease forwards; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6EE7B7, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💸</div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>Comprovantes do Pai</h1>
          </div>
          <p style={{ color: "#6B7280", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Envie o comprovante · a IA extrai os dados · envie no WhatsApp</p>
        </div>

        {/* Phone config */}
        <div style={{ background: "#141418", border: `1px solid ${editingPhone ? "#6EE7B7" : "#1E1E28"}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.2s" }}>
          <span style={{ fontSize: 20 }}>📱</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#6B7280", fontSize: 10, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>WhatsApp do seu pai</p>
            {editingPhone ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  autoFocus
                  type="tel"
                  placeholder="44999990000  (com DDD)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter" && phoneInput.length >= 10) { setPhone(phoneInput); setEditingPhone(false); } }}
                  style={{ background: "#0F0F13", border: "1px solid #6EE7B7", borderRadius: 8, padding: "6px 10px", color: "#F0EDE8", fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", width: 220 }}
                />
                <button className="phone-save" onClick={() => { if (phoneInput.length >= 10) { setPhone(phoneInput); setEditingPhone(false); } }}>Salvar</button>
                {phone && <button onClick={() => setEditingPhone(false)} style={{ background: "none", border: "none", color: "#4B5563", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>cancelar</button>}
              </div>
            ) : phone ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 14, fontFamily: "'DM Mono', monospace", color: "#F0EDE8" }}>
                  +55 {phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}
                </p>
                <button onClick={() => { setPhoneInput(phone); setEditingPhone(true); }} style={{ background: "none", border: "none", color: "#4B5563", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>editar</button>
              </div>
            ) : (
              <p onClick={() => { setPhoneInput(""); setEditingPhone(true); }} style={{ fontSize: 13, color: "#4B5563", cursor: "pointer", fontStyle: "italic" }}>
                Clique para adicionar o número ›
              </p>
            )}
          </div>
          {phone && !editingPhone && (
            <div style={{ padding: "4px 10px", borderRadius: 20, background: "#1A3A2A", color: "#6EE7B7", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>✓ configurado</div>
          )}
        </div>

        {/* Upload Zone */}
        <div
          className="upload-zone"
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !loading && fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? "#6EE7B7" : "#2A2A35"}`,
            borderRadius: 16, padding: "36px 24px", textAlign: "center",
            cursor: loading ? "default" : "pointer",
            background: dragOver ? "rgba(110,231,183,0.04)" : "#141418",
            marginBottom: 20,
          }}
        >
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
          {loading ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🔍</div>
              <p style={{ color: "#6EE7B7", fontSize: 14, fontWeight: 500 }}>Analisando comprovante...</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <p style={{ color: "#D1D5DB", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Arraste ou clique para enviar</p>
              <p style={{ color: "#4B5563", fontSize: 12 }}>PNG, JPG, WEBP ou PDF</p>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "#1F1218", border: "1px solid #4C1D2A", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#F87171", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div className="slide-in" style={{ background: "linear-gradient(135deg, rgba(110,231,183,0.08), rgba(59,130,246,0.06))", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
            <p style={{ color: "#6EE7B7", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>✓ Comprovante registrado</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                <div>
                  <p style={{ color: "#6B7280", fontSize: 11, marginBottom: 3 }}>Valor</p>
                  <p style={{ fontSize: 24, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{formatCurrency(lastResult.valor)}</p>
                </div>
                <div>
                  <p style={{ color: "#6B7280", fontSize: 11, marginBottom: 3 }}>Data</p>
                  <p style={{ fontSize: 16, fontWeight: 500, color: "#D1D5DB", marginTop: 3 }}>{formatDate(lastResult.data)}</p>
                </div>
                <div>
                  <p style={{ color: "#6B7280", fontSize: 11, marginBottom: 3 }}>Banco</p>
                  <span style={{ display: "inline-block", marginTop: 4, padding: "3px 10px", borderRadius: 20, background: BANKS[lastResult.banco]?.bg || "#F3F4F6", color: BANKS[lastResult.banco]?.color || "#6B7280", fontSize: 12, fontWeight: 600 }}>
                    {BANKS[lastResult.banco]?.name || "Outro"}
                  </span>
                </div>
              </div>
              <button className="wabtn wabtn-lg" onClick={() => openWhatsApp(lastResult)}>
                📲 Enviar no WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        {transfers.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#141418", borderRadius: 12, padding: "16px 18px", border: "1px solid #1E1E28" }}>
              <p style={{ color: "#6B7280", fontSize: 11, marginBottom: 6 }}>TOTAL ENVIADO</p>
              <p style={{ fontSize: 20, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#6EE7B7" }}>{formatCurrency(total)}</p>
            </div>
            <div style={{ background: "#141418", borderRadius: 12, padding: "16px 18px", border: "1px solid #1E1E28" }}>
              <p style={{ color: "#6B7280", fontSize: 11, marginBottom: 6 }}>TRANSFERÊNCIAS</p>
              <p style={{ fontSize: 20, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{transfers.length}</p>
            </div>
          </div>
        )}

        {/* Bank breakdown */}
        {Object.keys(byBank).length > 1 && (
          <div style={{ background: "#141418", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #1E1E28" }}>
            <p style={{ color: "#6B7280", fontSize: 10, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>Por banco</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(byBank).map(([banco, val]) => (
                <div key={banco} style={{ padding: "5px 12px", borderRadius: 20, background: BANKS[banco]?.bg || "#F3F4F6", color: BANKS[banco]?.color || "#6B7280", fontSize: 12, fontWeight: 500 }}>
                  {BANKS[banco]?.name} · {formatCurrency(val)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {transfers.length > 0 && (
          <div style={{ background: "#141418", borderRadius: 14, border: "1px solid #1E1E28", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #1E1E28" }}>
              <p style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" }}>Histórico</p>
            </div>
            {transfers.map((t, i) => (
              <div key={t.id} className="row-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: i < transfers.length - 1 ? "1px solid #1A1A22" : "none", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, background: BANKS[t.banco]?.bg || "#F3F4F6", color: BANKS[t.banco]?.color || "#6B7280", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {BANKS[t.banco]?.name || "Outro"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "'DM Mono', monospace" }}>{formatDate(t.data)}</p>
                    <p style={{ fontSize: 11, color: "#4B5563", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.arquivo}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{formatCurrency(t.valor)}</p>
                  <button className="wabtn" onClick={() => openWhatsApp(t)}>📲 WhatsApp</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {transfers.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#374151" }}>
            <p style={{ fontSize: 13 }}>Nenhuma transferência registrada ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
