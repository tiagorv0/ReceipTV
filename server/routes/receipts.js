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
        let query = 'SELECT * FROM receipts WHERE user_id = $1';
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
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM receipts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: 'Receipt deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
