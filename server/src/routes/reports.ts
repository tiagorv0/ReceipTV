import express, { Request, Response } from 'express';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

interface SummaryRow {
  label: string;
  total: string;
}

interface TotalRow {
  total: string;
  count: string;
}

interface CalendarRow {
  day: string;
  count: number;
  total: string;
}

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
router.get('/summary', auth, async (req: Request, res: Response) => {
  try {
    const [totalResult, byBankResult, byTypeResult, monthlyResult] = await Promise.all([
      pool.query<TotalRow>('SELECT SUM(valor) as total, COUNT(*) as count FROM receipts WHERE user_id = $1', [req.user!.id]),
      pool.query<SummaryRow>('SELECT banco as label, SUM(valor) as total FROM receipts WHERE user_id = $1 GROUP BY banco ORDER BY total DESC', [req.user!.id]),
      pool.query<SummaryRow>('SELECT tipo_pagamento as label, SUM(valor) as total FROM receipts WHERE user_id = $1 GROUP BY tipo_pagamento ORDER BY total DESC', [req.user!.id]),
      pool.query<SummaryRow>("SELECT TO_CHAR(data_pagamento, 'MM-YYYY') as label, SUM(valor) as total FROM receipts WHERE user_id = $1 GROUP BY label ORDER BY label", [req.user!.id]),
    ]);

    res.json({
      total: Number(totalResult.rows[0].total) || 0,
      count: totalResult.rows[0].count,
      byBank: byBankResult.rows.map(b => ({ ...b, total: Number(b.total) })),
      byType: byTypeResult.rows.map(t => ({ ...t, total: Number(t.total) })),
      monthly: monthlyResult.rows.map(r => ({ ...r, total: Number(r.total) })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /reports/calendar:
 *   get:
 *     summary: Retorna contagem e total de gastos por dia em um intervalo de datas
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-04-01"
 *         description: Data inicial no formato YYYY-MM-DD
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-04-30"
 *         description: Data final no formato YYYY-MM-DD
 *       - in: query
 *         name: banco
 *         required: false
 *         schema:
 *           type: string
 *           example: "Nubank"
 *         description: Filtrar por banco (case-insensitive)
 *       - in: query
 *         name: tipoPagamento
 *         required: false
 *         schema:
 *           type: string
 *           example: "Pix"
 *         description: Filtrar por tipo de pagamento (case-insensitive)
 *     responses:
 *       200:
 *         description: Array esparso de dias com recibos no intervalo solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 days:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         format: date
 *                         example: "2026-04-01"
 *                       count:
 *                         type: integer
 *                         example: 3
 *                       total:
 *                         type: number
 *                         example: 450.75
 *       400:
 *         description: Parâmetros inválidos ou ausentes
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/calendar', auth, async (req: Request, res: Response) => {
  const { startDate, endDate, banco, tipoPagamento } = req.query as {
    startDate?: string;
    endDate?: string;
    banco?: string;
    tipoPagamento?: string;
  };

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
    return;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    res.status(400).json({ error: 'startDate e endDate devem estar no formato YYYY-MM-DD' });
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: 'startDate ou endDate contém data inválida' });
    return;
  }

  if (startDate > endDate) {
    res.status(400).json({ error: 'startDate deve ser menor ou igual a endDate' });
    return;
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 366) {
    res.status(400).json({ error: 'O intervalo máximo permitido é de 366 dias' });
    return;
  }

  try {
    const params: (string | number)[] = [req.user!.id, startDate, endDate];
    const conditions: string[] = [];

    if (banco) {
      params.push(banco.toLowerCase());
      conditions.push(`AND LOWER(banco) = LOWER($${params.length})`);
    }

    if (tipoPagamento) {
      params.push(tipoPagamento.toLowerCase());
      conditions.push(`AND LOWER(tipo_pagamento) = LOWER($${params.length})`);
    }

    const query = `
      SELECT
        data_pagamento::text AS day,
        COUNT(*)::int        AS count,
        SUM(valor)           AS total
      FROM receipts
      WHERE user_id = $1
        AND data_pagamento BETWEEN $2 AND $3
        ${conditions.join(' ')}
      GROUP BY data_pagamento
      ORDER BY data_pagamento ASC
    `;

    const result = await pool.query<CalendarRow>(query, params);

    res.json({
      days: result.rows.map(row => ({
        day: row.day,
        count: row.count,
        total: parseFloat(row.total),
      })),
    });
  } catch (err) {
    logger.error('Erro ao buscar dados do calendário:', (err as Error).message);
    res.status(500).json({ error: 'Erro ao buscar dados do calendário.' });
  }
});

export default router;
