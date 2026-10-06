import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Branch } from './entities/branch.entity';
import { Clock } from './entities/clock.entity';
import { Absence } from './entities/absence.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { ClocksModule } from './clocks/clocks.module';
import { WorkingTimesModule } from './workingtimes/workingtimes.module';
import { AbsencesModule } from './absences/absences.module';
import { KpiModule } from './kpi/kpi.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        url: config.get<string>('DATABASE_URL'),
        entities: [User, Branch, Clock, Absence],
        // DEV: synchronize auto-creates tables from entities.
        // PROD: set DB_SYNC=false and run migrations instead.
        synchronize: config.get<string>('DB_SYNC', 'true') !== 'false',
      }),
    }),
    AuthModule,
    UsersModule,
    BranchesModule,
    ClocksModule,
    WorkingTimesModule,
    AbsencesModule,
    KpiModule,
  ],
})
export class AppModule {}
