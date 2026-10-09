import type { Role } from '@/api/types';
import { can, canManageUser, creatableRoles } from './permissions';

const actor = (role: Role, branchId: string | null = 'finance') => ({ id: 'me', role, branchId });
const target = (role: Role, branchId: string | null = 'finance') => ({ role, branchId });

describe('can', () => {
  it('lets everybody but the admin clock in', () => {
    expect(can('EMPLOYEE', 'clockIn')).toBe(true);
    expect(can('DIRECTEUR', 'clockIn')).toBe(true);
    expect(can('ADMIN', 'clockIn')).toBe(false);
  });

  it('reserves branch management to the admin', () => {
    expect(can('DIRECTEUR', 'manageBranches')).toBe(false);
    expect(can('ADMIN', 'manageBranches')).toBe(true);
  });

  it('does not let an employee manage users', () => expect(can('EMPLOYEE', 'manageUsers')).toBe(false));
});

describe('canManageUser (mirror of the backend assertCanManageUser)', () => {
  it('manager: only employees of their branch', () => {
    expect(canManageUser(actor('MANAGER'), target('EMPLOYEE'))).toBe(true);
    expect(canManageUser(actor('MANAGER'), target('MANAGER'))).toBe(false);
    expect(canManageUser(actor('MANAGER'), target('EMPLOYEE', 'it'))).toBe(false);
  });

  it('directeur: anyone of their branch except admins', () => {
    expect(canManageUser(actor('DIRECTEUR'), target('MANAGER'))).toBe(true);
    expect(canManageUser(actor('DIRECTEUR'), target('ADMIN'))).toBe(false);
    expect(canManageUser(actor('DIRECTEUR'), target('EMPLOYEE', 'it'))).toBe(false);
  });

  it('admin: everyone, everywhere', () => {
    expect(canManageUser(actor('ADMIN', null), target('DIRECTEUR', 'it'))).toBe(true);
  });

  it('employee: nobody', () => expect(canManageUser(actor('EMPLOYEE'), target('EMPLOYEE'))).toBe(false));
});

describe('creatableRoles', () => {
  it('follows the hierarchy', () => {
    expect(creatableRoles('MANAGER')).toEqual(['EMPLOYEE']);
    expect(creatableRoles('DIRECTEUR')).toEqual(['EMPLOYEE', 'MANAGER']);
    expect(creatableRoles('ADMIN')).toHaveLength(4);
  });
});
