export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: { id: number; username: string };
  accessTokenExp?: number;
}
