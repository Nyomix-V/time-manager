import { can } from './permissions';

describe('can', () => {
  it('lets everybody but the admin clock in', () => {
    expect(can('EMPLOYEE', 'clockIn')).toBe(true);
    expect(can('DIRECTEUR', 'clockIn')).toBe(true);
    expect(can('ADMIN', 'clockIn')).toBe(false);
  });

  it('mirrors the backend: only managers and admins create or delete users', () => {
    expect(can('MANAGER', 'createUser')).toBe(true);
    expect(can('DIRECTEUR', 'createUser')).toBe(false);
    expect(can('EMPLOYEE', 'deleteUser')).toBe(false);
  });

  it('reserves role choice and branch management to the admin', () => {
    expect(can('MANAGER', 'chooseRole')).toBe(false);
    expect(can('ADMIN', 'manageBranches')).toBe(true);
  });
});
