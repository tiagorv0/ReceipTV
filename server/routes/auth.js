import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import logger from '../config/logger.js';

const router = express.Router();

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;           // 15 minutos
const REFRESH_TOKEN_EXPIRY_LONG  = 30 * 24 * 60 * 60;  // 30 dias (continuar logado)
const REFRESH_TOKEN_EXPIRY_SHORT =  1 * 60 * 60;        // 1 hora  (sessão temporária)

const COOKIE_BASE = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
};

function generateAccessToken(userId, username) {
    const jti = crypto.randomUUID();
    return jwt.sign(
        { jti, id: userId, username },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function setAuthCookies(res, accessToken, refreshToken, refreshTokenExpirySeconds = REFRESH_TOKEN_EXPIRY_LONG) {
    res.cookie('accessToken', accessToken, {
        ...COOKIE_BASE,
        maxAge: ACCESS_TOKEN_EXPIRY_SECONDS * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
        ...COOKIE_BASE,
        maxAge: refreshTokenExpirySeconds * 1000,
        path: '/api/auth/refresh',
    });
}

function clearAuthCookies(res) {
    res.cookie('accessToken', '', { ...COOKIE_BASE, maxAge: 0 });
    res.cookie('refreshToken', '', { ...COOKIE_BASE, maxAge: 0, path: '/api/auth/refresh' });
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Email inválido ou ausente
 *       409:
 *         description: Email já cadastrado
 *       500:
 *         description: Erro no servidor
 */
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    const normalizedUsername = username?.toLowerCase();
    const normalizedEmail    = email?.toLowerCase();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [normalizedUsername, normalizedEmail, hashedPassword]
        );
        res.status(201).json({ message: 'User created', userId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint?.includes('email')) {
                return res.status(409).json({ error: 'Email já cadastrado' });
            }
            if (err.constraint?.includes('username')) {
                return res.status(409).json({ error: 'Nome de usuário já cadastrado' });
            }
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica um usuário e emite tokens via cookie HTTP-only
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username ou email do usuário
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *                 description: Se true, sessão dura 30 dias; caso contrário, 1 hora
 *     responses:
 *       200:
 *         description: Login bem-sucedido, tokens emitidos via Set-Cookie
 *       400:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req, res) => {
    const { identifier, password, rememberMe = false } = req.body;
    const normalizedIdentifier = identifier?.toLowerCase();
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [normalizedIdentifier]
        );
        if (result.rows.length === 0) return res.status(400).json({ message: 'Login ou senha inválidos' });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Login ou senha inválidos' });

        const refreshTokenExpiry = rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT;

        const accessToken = generateAccessToken(user.id, user.username);
        const refreshToken = generateRefreshToken();
        const tokenHash = hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + refreshTokenExpiry * 1000);

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHash, expiresAt]
        );

        setAuthCookies(res, accessToken, refreshToken, refreshTokenExpiry);

        const decoded = jwt.decode(accessToken);
        logger.info(`User ${user.username} logged in (rememberMe=${rememberMe})`);

        res.json({ user: { id: user.id, username: user.username }, accessTokenExp: decoded.exp });
    } catch (err) {
        logger.error(`Login error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renova o access token via refresh token (cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Novos tokens emitidos via Set-Cookie
 *       401:
 *         description: Refresh token inválido, expirado ou revogado
 */
router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token ausente' });
    }

    const tokenHash = hashToken(refreshToken);

    try {
        const result = await pool.query(
            'SELECT * FROM refresh_tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Refresh token inválido' });
        }

        const tokenRecord = result.rows[0];

        if (tokenRecord.revoked_at) {
            // Reutilização detectada: revogar toda a sessão do usuário
            await pool.query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
                [tokenRecord.user_id]
            );
            logger.warn(`Reutilização de refresh token detectada para usuário ${tokenRecord.user_id} — todas as sessões revogadas`);
            clearAuthCookies(res);
            return res.status(401).json({ message: 'Sessão comprometida. Faça login novamente.' });
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(401).json({ message: 'Refresh token expirado' });
        }

        const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [tokenRecord.user_id]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        const user = userResult.rows[0];

        // Rotação: revogar token antigo e emitir novo par
        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [tokenRecord.id]);

        const newAccessToken = generateAccessToken(user.id, user.username);
        const newRefreshToken = generateRefreshToken();
        const newTokenHash = hashToken(newRefreshToken);
        // Preserva o expires_at original para manter o TTL escolhido no login (rememberMe ou não)
        const newExpiresAt = tokenRecord.expires_at;
        const remainingSeconds = Math.max(0, Math.floor((new Date(newExpiresAt) - Date.now()) / 1000));

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, newTokenHash, newExpiresAt]
        );

        setAuthCookies(res, newAccessToken, newRefreshToken, remainingSeconds);

        const decoded = jwt.decode(newAccessToken);
        logger.info(`Token renovado para usuário ${user.username}`);

        res.json({ user: { id: user.id, username: user.username }, accessTokenExp: decoded.exp });
    } catch (err) {
        logger.error(`Refresh error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoga o refresh token e limpa os cookies de sessão
 *     tags: [Auth]
 *     responses:
 *       204:
 *         description: Logout realizado com sucesso
 */
router.post('/logout', async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        try {
            await pool.query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
                [tokenHash]
            );
        } catch (err) {
            logger.error(`Logout DB error: ${err.message}`);
        }
    }

    clearAuthCookies(res);
    logger.info('User logged out');
    res.status(204).end();
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *       401:
 *         description: Não autenticado
 */
router.get('/me', (req, res) => {
    const token = req.cookies?.accessToken;
    if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ id: decoded.id, username: decoded.username });
    } catch {
        res.status(401).json({ message: 'Token inválido ou expirado' });
    }
});

export default router;
