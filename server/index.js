import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Route imports
import authRoutes from './routes/auth.js';
import receiptRoutes from './routes/receipts.js';
import reportRoutes from './routes/reports.js';

// Logger imports
import morgan from 'morgan';
import logger from './config/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ReceipTV API',
            version: '1.0.0',
            description: 'API para gerenciamento de comprovantes de pagamento com análise por IA',
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
                description: 'Servidor de Desenvolvimento',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Morgan middleware with Winston stream
const stream = {
    write: (message) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream }));

app.use(cors({ origin: ['http://localhost:5173', 'https://receiptv.onrender.com', 'https://receiptv-backend.onrender.com'] }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
    res.send('ReceipTV API is running');
});

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
