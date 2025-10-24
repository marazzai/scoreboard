export interface AppSession {
  user?: {
    id?: string;
    role?: string | null;
    permissions?: string[];
    [k: string]: unknown;
  } | null;
}

export type JwtToken = {
  sub?: string;
  role?: string | null;
  permissions?: string[];
  [k: string]: unknown;
};

export type SessionWithUser = {
  user: {
    id?: string;
    role?: string | null;
    permissions?: string[];
    [k: string]: unknown;
  };
};
