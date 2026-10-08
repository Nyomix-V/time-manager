import { MigrationInterface, QueryRunner } from 'typeorm';

// clocks.time: datetime -> datetime(3), so two clocks in the same second keep
// their order. `synchronize` cannot do it on an existing database: it first
// drops the (userId, time) index, which MySQL refuses because the userId
// foreign key relies on it. MODIFY keeps the index.
// Fresh database: the table does not exist yet, synchronize creates it.
export class ClockTimeMilliseconds1791417600000 implements MigrationInterface {
  name = 'ClockTimeMilliseconds1791417600000';

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable('clocks'))) return;
    await queryRunner.query(
      'ALTER TABLE `clocks` MODIFY `time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    );
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(
      'ALTER TABLE `clocks` MODIFY `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP',
    );
  }
}
