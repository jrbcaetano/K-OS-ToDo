/**
 * Auth API surface — signup, login, session probe, logout.
 *
 * The server sets/clears the `k_os_session` cookie; the client only sees the
 * decoded user payload. All requests use credentials: 'include' via the
 * shared apiSend / apiGet helpers in ./client.
 */

import { apiGet, apiSend } from './client';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  /** Null for regular users; 'admin' grants access to Platform Settings. */
  platformRole?: 'admin' | null;
  /** Set on signup responses for accounts that landed in the approval queue. */
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface AuthWorkspace {
  id: string;
  name: string;
  role: 'owner' | 'member' | 'viewer';
}

export interface SessionResponse {
  user: AuthUser;
  workspace: AuthWorkspace | null;
}

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const getSession = () => apiGet<SessionResponse>('/auth/session');

export interface SignupResponse {
  user: AuthUser;
}

export const signup = (data: SignupInput) =>
  apiSend<SignupResponse>('POST', '/auth/password/signup', data);

export const login = (data: LoginInput) =>
  apiSend<{ user: AuthUser }>('POST', '/auth/password/login', data);

export const logout = () => apiSend<{ ok: true }>('DELETE', '/auth/session');
