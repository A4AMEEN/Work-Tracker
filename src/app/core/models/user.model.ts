export type UserRole = 'Admin' | 'Developer' | 'Viewer';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  username: string;
  role: UserRole;
  isActive?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}
