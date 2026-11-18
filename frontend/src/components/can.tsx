'use client';

import React from 'react';

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';

interface CanProps {
  currentRole?: UserRole | string;
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ currentRole, roles, children, fallback = null }: CanProps) {
  if (!currentRole) return <>{fallback}</>;

  const hasPermission = roles.includes(currentRole as UserRole);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
