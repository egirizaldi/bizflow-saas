import Cookies from 'js-cookie';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';
  status: 'ACTIVE' | 'SUSPENDED';
}

export function setAuthSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser,
  organizations: AuthOrganization[] = [],
) {
  // Simpan token di Cookie (7 hari)
  Cookies.set('accessToken', accessToken, { expires: 1 / 96, sameSite: 'lax' }); // 15 menit
  Cookies.set('refreshToken', refreshToken, { expires: 7, sameSite: 'lax' }); // 7 hari
  Cookies.set('isAuthenticated', 'true', { expires: 7, sameSite: 'lax' });

  if (typeof window !== 'undefined') {
    localStorage.setItem('bizflow_user', JSON.stringify(user));
    localStorage.setItem('bizflow_orgs', JSON.stringify(organizations));

    if (organizations.length > 0 && !Cookies.get('currentOrgId')) {
      Cookies.set('currentOrgId', organizations[0].id, { expires: 7 });
    }
  }
}

export function clearAuthSession() {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('isAuthenticated');
  Cookies.remove('currentOrgId');

  if (typeof window !== 'undefined') {
    localStorage.removeItem('bizflow_user');
    localStorage.removeItem('bizflow_orgs');
    localStorage.removeItem('bizflow_current_org');
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('bizflow_user');
  return user ? JSON.parse(user) : null;
}

export function getStoredOrganizations(): AuthOrganization[] {
  if (typeof window === 'undefined') return [];
  const orgs = localStorage.getItem('bizflow_orgs');
  return orgs ? JSON.parse(orgs) : [];
}

export function switchOrganization(orgId: string) {
  Cookies.set('currentOrgId', orgId, { expires: 7 });
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
