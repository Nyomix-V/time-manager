import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Team } from '../entities/team.entity';
import { Clock } from '../entities/clock.entity';
import { Role, UserStatus, ClockType } from '../entities/enums';

// Seeds a small but realistic org: branches, teams, users (all roles), and a
// day of clocks (with a break) for the demo employee.
async function main() {
  AppDataSource.setOptions({ migrationsRun: true, synchronize: true }); // dev: create tables if needed
  await AppDataSource.initialize();

  const branches = AppDataSource.getRepository(Branch);
  const teams = AppDataSource.getRepository(Team);
  const users = AppDataSource.getRepository(User);
  const clocks = AppDataSource.getRepository(Clock);
  const pw = await bcrypt.hash('password123', 10);

  const upsertBranch = async (name: string, description: string) =>
    (await branches.findOne({ where: { name } })) ??
    (await branches.save(branches.create({ name, description })));

  const finance = await upsertBranch('Finance', 'Comptabilité, gestion, trésorerie.');
  const it = await upsertBranch('IT', 'Infrastructure et développement.');

  const upsertUser = async (data: Partial<User>) =>
    (await users.findOne({ where: { email: data.email } })) ??
    (await users.save(
      users.create({ ...data, passwordHash: pw, status: UserStatus.ACTIVE }),
    ));

  // Admin (no branch, does not clock), Directeur (Finance), Manager (Finance).
  const admin = await upsertUser({
    firstName: 'Alex', lastName: 'Admin', email: 'admin@trinity.io', role: Role.ADMIN,
  });
  const directeur = await upsertUser({
    firstName: 'Diane', lastName: 'Directeur', email: 'directeur@trinity.io',
    role: Role.DIRECTEUR, branchId: finance.id,
  });
  const manager = await upsertUser({
    firstName: 'Karim', lastName: 'Benali', email: 'manager@trinity.io',
    role: Role.MANAGER, branchId: finance.id,
  });

  // A team led by the manager.
  const compta =
    (await teams.findOne({ where: { name: 'Comptabilité' } })) ??
    (await teams.save(
      teams.create({
        name: 'Comptabilité',
        description: 'Tenue des comptes et clôtures mensuelles.',
        branchId: finance.id,
        managerId: manager.id,
      }),
    ));

  const employee = await upsertUser({
    firstName: 'Emma', lastName: 'Employee', email: 'employee@trinity.io',
    role: Role.EMPLOYEE, branchId: finance.id, teamId: compta.id,
  });

    // Compte de démo pour le login Microsoft SSO (retrouvé par email au 1er SSO).
    await upsertUser({
      firstName: 'Lucas', lastName: 'Lipari', email: 'lucas.lipari@epitech.eu',
      role: Role.MANAGER, branchId: finance.id,
    });

  // A day of clocks for the employee: arrive 08:57, break 12:30-13:15, leave 16:50
  // (Paris time: UTC+2 in October, stored in UTC).
  const existingClocks = await clocks.count({ where: { userId: employee.id } });
  if (existingClocks === 0) {
    const day = '2026-10-06T';
    await clocks.save([
      clocks.create({ userId: employee.id, type: ClockType.IN, time: new Date(day + '08:57:00+02:00') }),
      clocks.create({ userId: employee.id, type: ClockType.BREAK_START, time: new Date(day + '12:30:00+02:00') }),
      clocks.create({ userId: employee.id, type: ClockType.BREAK_END, time: new Date(day + '13:15:00+02:00') }),
      clocks.create({ userId: employee.id, type: ClockType.OUT, time: new Date(day + '16:50:00+02:00') }),
    ]);
  }

  console.log('Seed done. Logins (all password123):');
  console.log('  admin@ / directeur@ / manager@ / employee@trinity.io');
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
