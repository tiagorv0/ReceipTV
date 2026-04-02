import express from 'express';
import multer from 'multer';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import { analyzeReceipt } from '../services/ai.js';
import logger from '../config/logger.js';
import titleCase from '../utils/title-case.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /receipts/analyze:
 *   post:
 *     summary: Analisa um comprovante de pagamento
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Comprovante analisado com sucesso
 *       400:
 *         description: Nenhum arquivo enviado
 *       500:
 *         description: Erro no servidor
 */
router.post('/analyze', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        const analysis = await analyzeReceipt(req.file.buffer, req.file.mimetype);

        let bancoCapitalizado = titleCase(analysis.banco);
        let nomeCapitalizado = titleCase(analysis.nome);

        const result = await pool.query(
            'INSERT INTO receipts (user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data, arquivo_mimetype, arquivo_nome) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [req.user.id, nomeCapitalizado, analysis.valor, analysis.data, bancoCapitalizado, analysis.tipo_pagamento, analysis.descricao, req.file.buffer, req.file.mimetype, req.file.originalname]
        );

        res.json({ id: result.rows[0].id, ...analysis, banco: bancoCapitalizado, nome: nomeCapitalizado });
    } catch (err) {
        logger.error("Failed to process receipt:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /receipts/{id}/file:
 *   get:
 *     summary: Recupera o arquivo original do comprovante
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Arquivo retornado com sucesso
 *       404:
 *         description: Arquivo não encontrado
 *       500:
 *         description: Erro no servidor
 */
router.get('/:id/file', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT arquivo_data, arquivo_mimetype FROM receipts WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].arquivo_data) {
            return res.status(404).json({ error: "Arquivo não encontrado." });
        }

        res.setHeader('Content-Type', result.rows[0].arquivo_mimetype);
        res.send(result.rows[0].arquivo_data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /receipts:
 *   get:
 *     summary: Lista todos os comprovantes do usuário
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de comprovantes
 *       500:
 *         description: Erro no servidor
 */
router.get('/', auth, async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        let query = 'SELECT id, user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_mimetype, arquivo_nome, created_at FROM receipts WHERE user_id = $1';
        let params = [req.user.id];

        if (startDate && endDate) {
            params.push(startDate, endDate);
            query += ` AND data_pagamento BETWEEN $${params.length - 1} AND $${params.length}`;
        } else if (startDate) {
            params.push(startDate);
            query += ` AND data_pagamento >= $${params.length}`;
        } else if (endDate) {
            params.push(endDate);
            query += ` AND data_pagamento <= $${params.length}`;
        }
        
        query += ' ORDER BY data_pagamento DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /receipts/{id}:
 *   delete:
 *     summary: Remove um comprovante
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comprovante removido
 *       500:
 *         description: Erro no servidor
 */
/**
 * @swagger
 * /receipts/manual:
 *   post:
 *     summary: Registra um comprovante manualmente (sem análise por IA)
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - valor
 *               - data_pagamento
 *               - tipo_pagamento
 *             properties:
 *               nome:
 *                 type: string
 *               valor:
 *                 type: number
 *               data_pagamento:
 *                 type: string
 *                 format: date
 *               tipo_pagamento:
 *                 type: string
 *               banco:
 *                 type: string
 *               descricao:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Comprovante registrado com sucesso
 *       400:
 *         description: Campos obrigatórios ausentes ou inválidos
 *       500:
 *         description: Erro no servidor
 */
router.post('/manual', auth, upload.single('file'), async (req, res) => {
    try {
        const { nome, valor, data_pagamento, tipo_pagamento, banco, descricao } = req.body;

        if (!nome || !valor || !data_pagamento || !tipo_pagamento) {
            return res.status(400).json({ message: 'Campos obrigatórios: nome, valor, data_pagamento, tipo_pagamento.' });
        }

        const valorNum = parseFloat(valor);
        if (isNaN(valorNum) || valorNum <= 0) {
            return res.status(400).json({ message: 'Valor inválido. Deve ser um número positivo.' });
        }

        const nomeCapitalizado = titleCase(nome);
        const bancoCapitalizado = banco ? titleCase(banco) : null;

        const result = await pool.query(
            `INSERT INTO receipts
                (user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data, arquivo_mimetype, arquivo_nome)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao`,
            [
                req.user.id,
                nomeCapitalizado,
                valorNum,
                data_pagamento,
                bancoCapitalizado,
                tipo_pagamento,
                descricao || null,
                req.file?.buffer || null,
                req.file?.mimetype || null,
                req.file?.originalname || null,
            ]
        );

        logger.info(`Comprovante manual registrado: id=${result.rows[0].id} user=${req.user.id}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Erro ao registrar comprovante manual:', err.message);
        res.status(500).json({ message: 'Erro ao registrar comprovante.' });
    }
});

/**
 * @swagger
 * /receipts/export:
 *   post:
 *     summary: Exporta comprovantes filtrados como PDF ou ZIP
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formato
 *               - delivery
 *             properties:
 *               formato:
 *                 type: string
 *                 enum: [pdf, zip]
 *               delivery:
 *                 type: string
 *                 enum: [download, whatsapp, email]
 *               email:
 *                 type: string
 *               filtros:
 *                 type: object
 *     responses:
 *       200:
 *         description: PDF ou ZIP gerado com sucesso
 *       422:
 *         description: Nenhum comprovante encontrado para os filtros
 *       503:
 *         description: SMTP não configurado
 */
router.post('/export', auth, async (req, res) => {
    const { formato, delivery, email, filtros = {} } = req.body;

    if (!formato || !['pdf', 'zip'].includes(formato)) {
        return res.status(400).json({ error: 'formato deve ser "pdf" ou "zip".' });
    }
    if (!delivery || !['download', 'whatsapp', 'email'].includes(delivery)) {
        return res.status(400).json({ error: 'delivery deve ser "download", "whatsapp" ou "email".' });
    }
    if (delivery === 'email' && !email) {
        return res.status(400).json({ error: 'E-mail obrigatório quando delivery é "email".' });
    }

    try {
        const conditions = ['user_id = $1'];
        const params     = [req.user.id];

        if (filtros.startDate) { params.push(filtros.startDate); conditions.push(`data_pagamento >= $${params.length}`); }
        if (filtros.endDate)   { params.push(filtros.endDate);   conditions.push(`data_pagamento <= $${params.length}`); }
        if (filtros.nome) {
            params.push(`%${filtros.nome.toLowerCase()}%`);
            conditions.push(`LOWER(nome) LIKE $${params.length}`);
        }
        if (filtros.banco) {
            params.push(filtros.banco.toLowerCase());
            conditions.push(`LOWER(banco) = $${params.length}`);
        }
        if (filtros.tipoPagamento) {
            params.push(filtros.tipoPagamento.toLowerCase());
            conditions.push(`LOWER(tipo_pagamento) = $${params.length}`);
        }
        if (filtros.valorMin) { params.push(parseFloat(filtros.valorMin)); conditions.push(`valor >= $${params.length}`); }
        if (filtros.valorMax) { params.push(parseFloat(filtros.valorMax)); conditions.push(`valor <= $${params.length}`); }

        const sortMap = {
            date_desc:  'data_pagamento DESC',
            date_asc:   'data_pagamento ASC',
            value_desc: 'valor DESC',
            value_asc:  'valor ASC',
            name_asc:   'nome ASC',
            name_desc:  'nome DESC',
        };
        const orderBy = sortMap[filtros.sortBy] || 'data_pagamento DESC';

        const selectCols = formato === 'zip'
            ? 'id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data, arquivo_mimetype'
            : 'id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao';

        const query  = `SELECT ${selectCols} FROM receipts WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT 500`;
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(422).json({ error: 'Nenhum comprovante encontrado para os filtros informados.' });
        }

        const dateTag  = new Date().toISOString().split('T')[0];

        if (formato === 'pdf') {
            const { generateHistoryPDF } = await import('../services/pdf-export.js');
            const pdfBuffer = await generateHistoryPDF(result.rows, filtros);

            if (delivery === 'email') {
                const { sendExportEmail } = await import('../services/mailer.js');
                const filename = `receiptv-historico-${dateTag}.pdf`;
                await sendExportEmail(email, pdfBuffer, filename);
                return res.json({ message: `Relatório enviado para ${email}` });
            }

            const filename = `receiptv-historico-${dateTag}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            logger.info(`PDF exportado: user=${req.user.id} registros=${result.rows.length}`);
            return res.send(pdfBuffer);
        }

        // formato === 'zip'
        const { generateZIP } = await import('../services/zip-export.js');
        const zipBuffer = await generateZIP(result.rows, filtros);
        const filename  = `receiptv-historico-${dateTag}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        logger.info(`ZIP exportado: user=${req.user.id} registros=${result.rows.length}`);
        return res.send(zipBuffer);

    } catch (err) {
        logger.error('Erro ao exportar comprovantes:', err.message);
        if (err.message.startsWith('SMTP')) {
            return res.status(503).json({ error: err.message });
        }
        res.status(500).json({ error: 'Erro ao gerar exportação.' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM receipts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: 'Receipt deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
