import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { runWithStore } from '../utils/request-store.js';

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const store = {
    requestId: randomUUID(),
    ip: req.ip,
    userAgent: typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent'].slice(0, 512)
      : undefined,
  };

  runWithStore(store, next);
}
