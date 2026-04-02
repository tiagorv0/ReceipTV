import nodemailer from 'nodemailer';

function createTransport() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST) {
        throw new Error('SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS no .env do servidor.');
    }
    return nodemailer.createTransport({
        host:   SMTP_HOST,
        port:   parseInt(SMTP_PORT || '587'),
        secure: parseInt(SMTP_PORT || '587') === 465,
        auth:   { user: SMTP_USER, pass: SMTP_PASS },
    });
}

export async function sendExportEmail(to, pdfBuffer, filename) {
    const transport = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transport.sendMail({
        from,
        to,
        subject: 'ReceipTV — Relatório de Comprovantes',
        text: 'Segue em anexo o relatório de comprovantes exportado do ReceipTV.',
        attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
    });
}
