import express, { Request, Response } from 'express';
import multer from 'multer';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import { analyzeReceipt } from '../services/ai.js';
import logger from '../config/logger.js';
import titleCase from '../utils/title-case.js';
import { ReceiptRow, ReceiptFilters } from '../types/receipt.js';

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
router.post('/analyze', auth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      return;
    }

    const analysis = await analyzeReceipt(req.file.buffer, req.file.mimetype);

    const bancoCapitalizado = titleCase(analysis.banco);
    const nomeCapitalizado  = titleCase(analysis.nome);

    const result = await pool.query<{ id: number }>(
      'INSERT INTO receipts (user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data, arquivo_mimetype, arquivo_nome) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
      [req.user!.id, nomeCapitalizado, analysis.valor, analysis.data, bancoCapitalizado, analysis.tipo_pagamento, analysis.descricao, req.file.buffer, req.file.mimetype, req.file.originalname],
    );

    res.json({ id: result.rows[0].id, ...analysis, banco: bancoCapitalizado, nome: nomeCapitalizado });
  } catch (err) {
    logger.error('Failed to process receipt:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
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
router.get('/:id/file', auth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const result = await pool.query<{ arquivo_data: Buffer; arquivo_mimetype: string }>(
      'SELECT arquivo_data, arquivo_mimetype FROM receipts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id],
    );

    if (result.rows.length === 0 || !result.rows[0].arquivo_data) {
      res.status(404).json({ error: 'Arquivo não encontrado.' });
      return;
    }

    res.setHeader('Content-Type', result.rows[0].arquivo_mimetype);
    res.send(result.rows[0].arquivo_data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *       - in: query
 *         name: banco
 *         schema:
 *           type: string
 *         description: Filtra pelo banco (comparação case-insensitive)
 *       - in: query
 *         name: tipoPagamento
 *         schema:
 *           type: string
 *         description: Filtra pelo tipo de pagamento (comparação case-insensitive)
 *     responses:
 *       200:
 *         description: Lista de comprovantes
 *       500:
 *         description: Erro no servidor
 */
router.get('/', auth, async (req: Request, res: Response) => {
  const { startDate, endDate, banco, tipoPagamento } = req.query as {
    startDate?: string;
    endDate?: string;
    banco?: string;
    tipoPagamento?: string;
  };
  try {
    const conditions: string[] = ['user_id = $1'];
    const params: (string | number)[] = [req.user!.id];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      conditions.push(`data_pagamento BETWEEN $${params.length - 1} AND $${params.length}`);
    } else if (startDate) {
      params.push(startDate);
      conditions.push(`data_pagamento >= $${params.length}`);
    } else if (endDate) {
      params.push(endDate);
      conditions.push(`data_pagamento <= $${params.length}`);
    }

    if (banco) {
      if (banco.length > 100) {
        res.status(400).json({ error: 'Parâmetro banco excede o comprimento máximo de 100 caracteres.' });
        return;
      }
      params.push(banco.toLowerCase());
      conditions.push(`LOWER(banco) = $${params.length}`);
    }

    if (tipoPagamento) {
      if (tipoPagamento.length > 100) {
        res.status(400).json({ error: 'Parâmetro tipoPagamento excede o comprimento máximo de 100 caracteres.' });
        return;
      }
      params.push(tipoPagamento.toLowerCase());
      conditions.push(`LOWER(tipo_pagamento) = $${params.length}`);
    }

    const query = `SELECT id, user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_mimetype, arquivo_nome, created_at FROM receipts WHERE ${conditions.join(' AND ')} ORDER BY data_pagamento DESC`;

    const result = await pool.query<ReceiptRow>(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Erro ao listar comprovantes:', err);
    res.status(500).json({ error: 'Erro ao listar comprovantes.' });
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
router.post('/manual', auth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { nome, valor, data_pagamento, tipo_pagamento, banco, descricao } = req.body as {
      nome: string;
      valor: string;
      data_pagamento: string;
      tipo_pagamento: string;
      banco?: string;
      descricao?: string;
    };

    if (!nome || !valor || !data_pagamento || !tipo_pagamento) {
      res.status(400).json({ message: 'Campos obrigatórios: nome, valor, data_pagamento, tipo_pagamento.' });
      return;
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      res.status(400).json({ message: 'Valor inválido. Deve ser um número positivo.' });
      return;
    }

    const nomeCapitalizado  = titleCase(nome);
    const bancoCapitalizado = banco ? titleCase(banco) : null;

    const result = await pool.query<ReceiptRow>(
      `INSERT INTO receipts
          (user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data, arquivo_mimetype, arquivo_nome)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao`,
      [
        req.user!.id,
        nomeCapitalizado,
        valorNum,
        data_pagamento,
        bancoCapitalizado,
        tipo_pagamento,
        descricao ?? null,
        req.file?.buffer ?? null,
        req.file?.mimetype ?? null,
        req.file?.originalname ?? null,
      ],
    );

    logger.info(`Comprovante manual registrado: id=${result.rows[0].id} user=${req.user!.id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Erro ao registrar comprovante manual:', (err as Error).message);
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
router.post('/export', auth, async (req: Request, res: Response) => {
  const { formato, delivery, email, filtros = {} } = req.body as {
    formato: string;
    delivery: string;
    email?: string;
    filtros?: ReceiptFilters;
  };

  if (!formato || !['pdf', 'zip'].includes(formato)) {
    res.status(400).json({ error: 'formato deve ser "pdf" ou "zip".' });
    return;
  }
  if (!delivery || !['download', 'whatsapp', 'email'].includes(delivery)) {
    res.status(400).json({ error: 'delivery deve ser "download", "whatsapp" ou "email".' });
    return;
  }
  if (delivery === 'email' && !email) {
    res.status(400).json({ error: 'E-mail obrigatório quando delivery é "email".' });
    return;
  }

  try {
    const conditions: string[] = ['user_id = $1'];
    const params: (string | number)[] = [req.user!.id];

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

    const sortMap: Record<string, string> = {
      date_desc:  'data_pagamento DESC',
      date_asc:   'data_pagamento ASC',
      value_desc: 'valor DESC',
      value_asc:  'valor ASC',
      name_asc:   'nome ASC',
      name_desc:  'nome DESC',
    };
    const orderBy = (filtros.sortBy && sortMap[filtros.sortBy]) ? sortMap[filtros.sortBy] : 'data_pagamento DESC';

    const selectCols = formato === 'zip'
      ? 'id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data, arquivo_mimetype'
      : 'id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao';

    const query  = `SELECT ${selectCols} FROM receipts WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT 500`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(422).json({ error: 'Nenhum comprovante encontrado para os filtros informados.' });
      return;
    }

    const dateTag = new Date().toISOString().split('T')[0];

    if (formato === 'pdf') {
      const { generateHistoryPDF } = await import('../services/pdf-export.js');
      const pdfBuffer = await generateHistoryPDF(result.rows, filtros);

      if (delivery === 'email') {
        const { sendExportEmail } = await import('../services/mailer.js');
        const filename = `receiptv-historico-${dateTag}.pdf`;
        await sendExportEmail(email!, pdfBuffer, filename);
        res.json({ message: `Relatório enviado para ${email}` });
        return;
      }

      const filename = `receiptv-historico-${dateTag}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      logger.info(`PDF exportado: user=${req.user!.id} registros=${result.rows.length}`);
      res.send(pdfBuffer);
      return;
    }

    // formato === 'zip'
    const { generateZIP } = await import('../services/zip-export.js');
    const zipBuffer = await generateZIP(result.rows, filtros);
    const filename  = `receiptv-historico-${dateTag}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logger.info(`ZIP exportado: user=${req.user!.id} registros=${result.rows.length}`);
    res.send(zipBuffer);

  } catch (err) {
    logger.error('Erro ao exportar comprovantes:', (err as Error).message);
    if ((err as Error).message.startsWith('SMTP')) {
      res.status(503).json({ error: (err as Error).message });
      return;
    }
    res.status(500).json({ error: 'Erro ao gerar exportação.' });
  }
});

/**
 * @swagger
 * /receipts/{id}:
 *   put:
 *     summary: Atualiza um comprovante existente
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *       200:
 *         description: Comprovante atualizado com sucesso
 *       400:
 *         description: Campos obrigatórios ausentes ou inválidos
 *       403:
 *         description: Comprovante pertence a outro usuário
 *       404:
 *         description: Comprovante não encontrado
 *       500:
 *         description: Erro no servidor
 */
router.put('/:id', auth, upload.single('file'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { nome, valor, data_pagamento, tipo_pagamento, banco, descricao } = req.body as {
      nome: string;
      valor: string;
      data_pagamento: string;
      tipo_pagamento: string;
      banco?: string;
      descricao?: string;
    };

    if (!nome || !valor || !data_pagamento || !tipo_pagamento) {
      res.status(400).json({ message: 'Campos obrigatórios: nome, valor, data_pagamento, tipo_pagamento.' });
      return;
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      res.status(400).json({ message: 'Valor inválido. Deve ser um número positivo.' });
      return;
    }

    const exists = await pool.query<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM receipts WHERE id = $1',
      [req.params.id],
    );
    if (exists.rows.length === 0) {
      res.status(404).json({ message: 'Comprovante não encontrado.' });
      return;
    }
    if (exists.rows[0].user_id !== req.user!.id) {
      res.status(403).json({ message: 'Acesso negado.' });
      return;
    }

    const nomeCapitalizado  = titleCase(nome);
    const bancoCapitalizado = banco ? titleCase(banco) : null;

    let result;
    if (req.file) {
      result = await pool.query<ReceiptRow>(
        `UPDATE receipts
         SET nome = $1, valor = $2, data_pagamento = $3, tipo_pagamento = $4,
             banco = $5, descricao = $6,
             arquivo_data = $7, arquivo_mimetype = $8, arquivo_nome = $9
         WHERE id = $10 AND user_id = $11
         RETURNING id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao,
                   arquivo_mimetype, arquivo_nome`,
        [
          nomeCapitalizado, valorNum, data_pagamento, tipo_pagamento,
          bancoCapitalizado, descricao ?? null,
          req.file.buffer, req.file.mimetype, req.file.originalname,
          req.params.id, req.user!.id,
        ],
      );
    } else {
      result = await pool.query<ReceiptRow>(
        `UPDATE receipts
         SET nome = $1, valor = $2, data_pagamento = $3, tipo_pagamento = $4,
             banco = $5, descricao = $6
         WHERE id = $7 AND user_id = $8
         RETURNING id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao,
                   arquivo_mimetype, arquivo_nome`,
        [
          nomeCapitalizado, valorNum, data_pagamento, tipo_pagamento,
          bancoCapitalizado, descricao ?? null,
          req.params.id, req.user!.id,
        ],
      );
    }

    logger.info(`Comprovante atualizado: id=${result.rows[0].id} user=${req.user!.id}`);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Erro ao atualizar comprovante:', (err as Error).message);
    res.status(500).json({ message: 'Erro ao atualizar comprovante.' });
  }
});

router.delete('/:id', auth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pool.query('DELETE FROM receipts WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ message: 'Receipt deleted' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
