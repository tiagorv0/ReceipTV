import Groq from 'groq-sdk';
import { createRequire } from 'module';
import logger from '../config/logger.js';
import { AnalysisResult } from '../types/receipt.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse-new') as (buffer: Buffer) => Promise<{ text: string }>;

export const analyzeReceipt = async (buffer: Buffer, mimeType: string): Promise<AnalysisResult> => {
  let textResponse: string | undefined;

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('GROQ_API_KEY não configurada no .env');
    }

    const groq = new Groq({ apiKey });

    const prompt = `Analise este comprovante de pagamento e retorne um JSON com os campos:
    {
    "nome": "nome do beneficiário/destinatário",
    "valor": 0.00,
    "data": "YYYY-MM-DD",
    "banco": "nome do banco",
    "tipo_pagamento": "PIX | TED | boleto | cartão",
    "descricao": "descrição resumida"
    }
    Em banco, sempre retorne o nome do banco do pagador, caso não houver, verificar a logo do banco no comprovante.
    Trazer o nome do banco o mais proximo do real possível. Ex: Se vir Itau Unibanco, retorne Itau. Se vir Sicooob, corrija para o nome real da instituição.
    Se vir Caixa Economica Federal, retorne Caixa.
    Retorne APENAS o JSON, sem markdown ou texto extra.`;

    type MessageParam = Groq.Chat.ChatCompletionMessageParam;
    let messages: MessageParam[];

    if (mimeType === 'application/pdf') {
      logger.info('AI: processando PDF via text extraction');
      const pdfData = await pdfParse(buffer);
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'text', text: `TEXTO DO COMPROVANTE:\n\n${pdfData.text}` },
          ],
        },
      ];
    } else {
      const base64Image = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ];
    }

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      max_tokens: 1024,
    });

    textResponse = chatCompletion.choices[0].message.content ?? undefined;

    const cleanedText = (textResponse ?? '')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedText) as AnalysisResult;
  } catch (error) {
    logger.error('Failed to parse JSON response from Groq API', {
      error: (error as Error).message,
      rawResponse: textResponse,
    });
    throw new Error('Invalid JSON returned from Groq API');
  }
};
