import Groq from "groq-sdk";
import logger from "../config/logger.js";

const analyzeReceipt = async (buffer, mimeType) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error('GROQ_API_KEY não configurada no .env');
        }

        const groq = new Groq({ apiKey });

        // Convert buffer to base64
        const base64Image = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

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

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: dataUrl
                            }
                        }
                    ]
                }
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.1,
            max_tokens: 1024,
        });

        const text = chatCompletion.choices[0].message.content;


        // Handle case where LLM might wrap response in markdown code blocks despite instructions
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        logger.error("Failed to parse JSON response:", text);
        throw new Error("Invalid JSON returned from Groq API");
    }
};

export { analyzeReceipt };
