import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTITIES } from './database/data-source';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { TeamsModule } from './teams/teams.module';
import { ClocksModule } from './clocks/clocks.module';
import { WorkingTimesModule } from './workingtimes/workingtimes.module';
import { AbsencesModule } from './absences/absences.module';
import { AccountRequestsModule } from './account-requests/account-requests.module';
import { KpiModule } from './kpi/kpi.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        url: config.get<string>('DATABASE_URL'),
        entities: ENTITIES,
        // DEV: synchronize auto-creates/updates tables from entities.
        // PROD: set DB_SYNC=false and run migrations instead.
        synchronize: config.get<string>('DB_SYNC', 'true') !== 'false',
      }),
    }),
    AuthModule,
    UsersModule,
    BranchesModule,
    TeamsModule,
    ClocksModule,
    WorkingTimesModule,
    AbsencesModule,
    AccountRequestsModule,
    KpiModule,
  ],
})
export class AppModule {}
