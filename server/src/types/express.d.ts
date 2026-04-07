import { UserJwtPayload } from './user.js';

declare module 'express' {
  interface Request {
    user?: UserJwtPayload;
  }
}
