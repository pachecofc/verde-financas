export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    plan?: 'BASIC' | 'PREMIUM';
    hideFromRanking?: boolean;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
}
