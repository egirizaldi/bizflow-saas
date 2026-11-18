import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T = any> {
  statusCode?: number;
  message?: string;
  user?: any;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  organizations?: any[];
  [key: string]: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = Cookies.get('accessToken');
  const orgId = Cookies.get('currentOrgId');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (orgId) {
    headers['x-organization-id'] = orgId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || 'Terjadi kesalahan pada server.';
    throw new Error(errorMessage);
  }

  return data as T;
}
