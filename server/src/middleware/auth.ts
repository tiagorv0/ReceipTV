import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserJwtPayload } from '../types/user.js';

export default function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken as string | undefined;

  if (!token) {
    res.status(401).json({ message: 'Não autenticado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as UserJwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}
