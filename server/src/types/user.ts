export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: Date;
}

export type UserPublic = Pick<User, 'id' | 'username' | 'email'>;
export type UserJwtPayload = Pick<User, 'id' | 'username'> & {
  jti: string;
  iat: number;
  exp: number;
};
