export type MembershipRole = 'SYSTEM_ADMIN' | 'TENANT_ADMIN' | 'USER';
export type Identity = { userId: string; organizationId: string; role: MembershipRole };
export type AuthenticatedRequest = { identity: Identity };
