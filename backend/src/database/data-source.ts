import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Team } from '../entities/team.entity';
import { Clock } from '../entities/clock.entity';
import { Absence } from '../entities/absence.entity';
import { AccountRequest } from '../entities/account-request.entity';
import { UserToken } from '../entities/user-token.entity';
import { ClockTimeMilliseconds1791417600000 } from './migrations/1791417600000-ClockTimeMilliseconds';

export const ENTITIES = [User, Branch, Team, Clock, Absence, AccountRequest, UserToken];

// Run at startup, BEFORE synchronize (schema changes synchronize cannot apply).
// Add every new migration here.
export const MIGRATIONS = [ClockTimeMilliseconds1791417600000];

// Standalone DataSource for the TypeORM CLI (migrations) and the seed script.
export const AppDataSource = new DataSource({
  type: 'mysql',
  url:
    process.env.DATABASE_URL ??
    'mysql://timemanager:devpassword@localhost:3306/timemanager',
  entities: ENTITIES,
  migrations: MIGRATIONS,
  synchronize: false,
});
