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
        const [total] = await pool.execute('SELECT SUM(valor) as total, COUNT(*) as count FROM receipts WHERE user_id = ?', [req.user.id]);
        const [byBank] = await pool.execute('SELECT banco, SUM(valor) as total FROM receipts WHERE user_id = ? GROUP BY banco', [req.user.id]);
        const [byType] = await pool.execute('SELECT tipo_pagamento, SUM(valor) as total FROM receipts WHERE user_id = ? GROUP BY tipo_pagamento', [req.user.id]);

        res.json({
            total: Number(total[0].total) || 0,
            count: total[0].count,
            byBank: byBank.map(b => ({ ...b, total: Number(b.total) })),
            byType: byType.map(t => ({ ...t, total: Number(t.total) }))
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
        const [rows] = await pool.execute(
            "SELECT DATE_FORMAT(data_pagamento, '%Y-%m') as month, SUM(valor) as total FROM receipts WHERE user_id = ? GROUP BY month ORDER BY month",
            [req.user.id]
        );
        res.json(rows.map(r => ({ ...r, total: Number(r.total) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
