import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { DatabaseError } from 'pg';
import pool from '../config/database.js';
import logger from '../config/logger.js';
import authMiddleware from '../middleware/auth.js';
import { User, UserJwtPayload, UserPublic } from '../types/user.js';
import { LoginRequest, RegisterRequest, RefreshTokenRecord } from '../types/auth.js';

const router = express.Router();

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;            // 15 minutos
const REFRESH_TOKEN_EXPIRY_LONG   = 30 * 24 * 60 * 60; // 30 dias (continuar logado)
const REFRESH_TOKEN_EXPIRY_SHORT  =  1 * 60 * 60;       // 1 hora  (sessão temporária)

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
};

function generateAccessToken(userId: number, username: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { jti, id: userId, username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS },
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, refreshTokenExpirySeconds = REFRESH_TOKEN_EXPIRY_LONG): void {
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

function clearAuthCookies(res: Response): void {
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
router.post('/register', async (req: Request<object, object, RegisterRequest>, res: Response) => {
  const { username, email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    res.status(400).json({ error: 'Email inválido' });
    return;
  }

  const normalizedUsername = username?.toLowerCase();
  const normalizedEmail    = email?.toLowerCase();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [normalizedUsername, normalizedEmail, hashedPassword],
    );
    res.status(201).json({ message: 'User created', userId: result.rows[0].id });
  } catch (err) {
    if (err instanceof DatabaseError && err.code === '23505') {
      if (err.constraint?.includes('email')) {
        res.status(409).json({ error: 'Email já cadastrado' });
        return;
      }
      if (err.constraint?.includes('username')) {
        res.status(409).json({ error: 'Nome de usuário já cadastrado' });
        return;
      }
    }
    res.status(500).json({ error: (err as Error).message });
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
router.post('/login', async (req: Request<object, object, LoginRequest>, res: Response) => {
  const { identifier, password, rememberMe = false } = req.body;
  const normalizedIdentifier = identifier?.toLowerCase();
  try {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [normalizedIdentifier],
    );
    if (result.rows.length === 0) {
      res.status(400).json({ message: 'Login ou senha inválidos' });
      return;
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Login ou senha inválidos' });
      return;
    }

    const refreshTokenExpiry = rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT;

    const accessToken  = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken();
    const tokenHash    = hashToken(refreshToken);
    const expiresAt    = new Date(Date.now() + refreshTokenExpiry * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt],
    );

    setAuthCookies(res, accessToken, refreshToken, refreshTokenExpiry);

    const decoded = jwt.decode(accessToken) as UserJwtPayload;
    logger.info(`User ${user.username} logged in (rememberMe=${String(rememberMe)})`);

    res.json({ user: { id: user.id, username: user.username }, accessTokenExp: decoded.exp });
  } catch (err) {
    logger.error(`Login error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
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
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token ausente' });
    return;
  }

  const tokenHash = hashToken(refreshToken);

  try {
    const result = await pool.query<RefreshTokenRecord>(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Refresh token inválido' });
      return;
    }

    const tokenRecord = result.rows[0];

    if (tokenRecord.revoked_at) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [tokenRecord.user_id],
      );
      logger.warn(`Reutilização de refresh token detectada para usuário ${tokenRecord.user_id} — todas as sessões revogadas`);
      clearAuthCookies(res);
      res.status(401).json({ message: 'Sessão comprometida. Faça login novamente.' });
      return;
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      res.status(401).json({ message: 'Refresh token expirado' });
      return;
    }

    const userResult = await pool.query<Pick<User, 'id' | 'username'>>(
      'SELECT id, username FROM users WHERE id = $1',
      [tokenRecord.user_id],
    );
    if (userResult.rows.length === 0) {
      res.status(401).json({ message: 'Usuário não encontrado' });
      return;
    }
    const user = userResult.rows[0];

    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [tokenRecord.id]);

    const newAccessToken  = generateAccessToken(user.id, user.username);
    const newRefreshToken = generateRefreshToken();
    const newTokenHash    = hashToken(newRefreshToken);
    const newExpiresAt    = tokenRecord.expires_at;
    const remainingSeconds = Math.max(0, Math.floor((new Date(newExpiresAt).getTime() - Date.now()) / 1000));

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, newTokenHash, newExpiresAt],
    );

    setAuthCookies(res, newAccessToken, newRefreshToken, remainingSeconds);

    const decoded = jwt.decode(newAccessToken) as UserJwtPayload;
    logger.info(`Token renovado para usuário ${user.username}`);

    res.json({ user: { id: user.id, username: user.username }, accessTokenExp: decoded.exp });
  } catch (err) {
    logger.error(`Refresh error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
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
router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    try {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
        [tokenHash],
      );
    } catch (err) {
      logger.error(`Logout DB error: ${(err as Error).message}`);
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
router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) {
    res.status(401).json({ message: 'Não autenticado' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as UserJwtPayload;
    res.json({ id: decoded.id, username: decoded.username });
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
});

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Retorna dados do usuário logado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: Não autenticado
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query<UserPublic>(
      'SELECT id, username, email FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Profile error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /auth/password:
 *   put:
 *     summary: Atualiza a senha do usuário autenticado
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha atualizada com sucesso
 *       400:
 *         description: Nova senha inválida ou campos ausentes
 *       401:
 *         description: Senha atual incorreta
 */
router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Nova senha deve ter no mínimo 8 caracteres' });
    return;
  }

  try {
    const result = await pool.query<Pick<User, 'password'>>(
      'SELECT password FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      res.status(401).json({ error: 'Senha atual incorreta' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user!.id]);

    logger.info(`Senha atualizada para usuário ${req.user!.id}`);
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    logger.error(`Password update error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /auth/account:
 *   delete:
 *     summary: Exclui a conta, comprovantes e revoga todas as sessões
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conta excluída com sucesso
 *       400:
 *         description: Senha ausente
 *       401:
 *         description: Senha incorreta
 */
router.delete('/account', authMiddleware, async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };

  if (!password) {
    res.status(400).json({ error: 'Senha obrigatória para confirmar a exclusão' });
    return;
  }

  try {
    const result = await pool.query<Pick<User, 'password'>>(
      'SELECT password FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const isMatch = await bcrypt.compare(password, result.rows[0].password);
    if (!isMatch) {
      res.status(401).json({ error: 'Senha incorreta' });
      return;
    }

    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user!.id],
    );

    await pool.query('DELETE FROM users WHERE id = $1', [req.user!.id]);

    clearAuthCookies(res);
    logger.info(`Conta excluída para usuário ${req.user!.id}`);
    res.json({ message: 'Conta excluída com sucesso' });
  } catch (err) {
    logger.error(`Account deletion error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
