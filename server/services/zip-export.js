import archiver from 'archiver';

function slugify(str) {
    return String(str || 'sem-nome')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function dateToFilename(dateStr) {
    if (!dateStr) return 'sem-data';
    const d = new Date(dateStr);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function mimeToExt(mime) {
    const map = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
    };
    return map[mime] || 'bin';
}

export function generateZIP(receipts, filtros) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 6 } });
        const chunks  = [];
        archive.on('data',  chunk => chunks.push(chunk));
        archive.on('end',   ()    => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);

        // resumo.txt
        const now          = new Date().toLocaleString('pt-BR');
        const totalValue   = receipts.reduce((s, r) => s + parseFloat(r.valor || 0), 0);
        const valFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue);
        const withFiles    = receipts.filter(r => r.arquivo_data);
        const withoutFiles = receipts.filter(r => !r.arquivo_data);

        let resumo = `ReceipTV — Exportação de Comprovantes\n`;
        resumo    += `Gerado em: ${now}\n\n`;
        resumo    += `FILTROS APLICADOS\n`;
        if (filtros.startDate || filtros.endDate)
            resumo += `Período: ${filtros.startDate || ''} – ${filtros.endDate || ''}\n`;
        if (filtros.nome)          resumo += `Nome: ${filtros.nome}\n`;
        if (filtros.banco)         resumo += `Banco: ${filtros.banco}\n`;
        if (filtros.tipoPagamento) resumo += `Tipo: ${filtros.tipoPagamento}\n`;
        resumo += `\nTotal: ${receipts.length} registro(s)\nValor total: ${valFormatted}\n`;

        if (withoutFiles.length > 0) {
            resumo += `\nRegistros sem arquivo (omitidos do ZIP):\n`;
            withoutFiles.forEach(r => { resumo += `  - ${r.nome} (${r.data_pagamento})\n`; });
        }

        archive.append(resumo, { name: 'resumo.txt' });

        withFiles.forEach((r, idx) => {
            const seq      = String(idx + 1).padStart(3, '0');
            const dateStr  = dateToFilename(r.data_pagamento);
            const nameSlug = slugify(r.nome);
            const ext      = mimeToExt(r.arquivo_mimetype);
            archive.append(Buffer.from(r.arquivo_data), { name: `${seq}_${dateStr}_${nameSlug}.${ext}` });
        });

        archive.finalize();
    });
}
