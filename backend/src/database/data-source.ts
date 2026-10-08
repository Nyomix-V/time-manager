import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Team } from '../entities/team.entity';
import { Clock } from '../entities/clock.entity';
import { Absence } from '../entities/absence.entity';
import { AccountRequest } from '../entities/account-request.entity';
import { UserToken } from '../entities/user-token.entity';

export const ENTITIES = [User, Branch, Team, Clock, Absence, AccountRequest, UserToken];

// Standalone DataSource for the TypeORM CLI (migrations) and the seed script.
export const AppDataSource = new DataSource({
  type: 'mysql',
  url:
    process.env.DATABASE_URL ??
    'mysql://timemanager:devpassword@localhost:3306/timemanager',
  entities: ENTITIES,
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
