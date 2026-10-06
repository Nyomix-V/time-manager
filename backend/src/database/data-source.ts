import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Clock } from '../entities/clock.entity';
import { Absence } from '../entities/absence.entity';

// Standalone DataSource for the TypeORM CLI (migrations) and the seed script.
// The app itself configures TypeORM in app.module.ts.
export const AppDataSource = new DataSource({
  type: 'mysql',
  url:
    process.env.DATABASE_URL ??
    'mysql://timemanager:devpassword@localhost:3306/timemanager',
  entities: [User, Branch, Clock, Absence],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
