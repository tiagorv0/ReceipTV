import express from 'express';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /reports/summary:
 *   get:
 *     summary: Obtém resumo geral dos gastos
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Totais por banco e tipo
 */
router.get('/summary', auth, async (req, res) => {
    try {
        const totalResult = await pool.query('SELECT SUM(valor) as total, COUNT(*) as count FROM receipts WHERE user_id = $1', [req.user.id]);
        const byBankResult = await pool.query('SELECT banco, SUM(valor) as total FROM receipts WHERE user_id = $1 GROUP BY banco', [req.user.id]);
        const byTypeResult = await pool.query('SELECT tipo_pagamento, SUM(valor) as total FROM receipts WHERE user_id = $1 GROUP BY tipo_pagamento', [req.user.id]);

        res.json({
            total: Number(totalResult.rows[0].total) || 0,
            count: totalResult.rows[0].count,
            byBank: byBankResult.rows.map(b => ({ ...b, total: Number(b.total) })),
            byType: byTypeResult.rows.map(t => ({ ...t, total: Number(t.total) }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /reports/monthly:
 *   get:
 *     summary: Obtém gastos mensais
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gastos agrupados por mês
 */
router.get('/monthly', auth, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT TO_CHAR(data_pagamento, 'YYYY-MM') as month, SUM(valor) as total FROM receipts WHERE user_id = $1 GROUP BY month ORDER BY month",
            [req.user.id]
        );
        res.json(result.rows.map(r => ({ ...r, total: Number(r.total) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
