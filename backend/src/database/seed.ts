import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Role } from '../entities/enums';

// Seeds one admin + one manager + one employee, with a branch.
// Run against a schema created by `synchronize` or by migrations.
async function main() {
  // Dev convenience: let the seed create tables if they don't exist yet.
  AppDataSource.setOptions({ synchronize: true });
  await AppDataSource.initialize();

  const branches = AppDataSource.getRepository(Branch);
  const users = AppDataSource.getRepository(User);
  const pw = await bcrypt.hash('password123', 10);

  let branch = await branches.findOne({ where: { name: 'Paris HQ' } });
  if (!branch) {
    branch = await branches.save(
      branches.create({
        name: 'Paris HQ',
        description: 'Seed branch',
        expectedStartMin: 540, // 09:00
      }),
    );
  }

  const seedUsers = [
    { firstName: 'Alex', lastName: 'Admin', email: 'admin@trinity.io', role: Role.ADMIN, branchId: undefined },
    { firstName: 'Mandy', lastName: 'Manager', email: 'manager@trinity.io', role: Role.MANAGER, branchId: branch.id },
    { firstName: 'Emma', lastName: 'Employee', email: 'employee@trinity.io', role: Role.EMPLOYEE, branchId: branch.id },
  ];

  for (const u of seedUsers) {
    const exists = await users.findOne({ where: { email: u.email } });
    if (!exists) {
      await users.save(users.create({ ...u, passwordHash: pw }));
    }
  }

  console.log('Seed done. Logins (all password123):');
  console.log('  admin@trinity.io / manager@trinity.io / employee@trinity.io');
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
