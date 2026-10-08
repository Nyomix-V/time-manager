import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClockType } from './enums';
import { User } from './user.entity';

// One row per clock event. Day worked time is computed from the ordered
// sequence IN -> (BREAK_START -> BREAK_END)* -> OUT (see WorkingTimesService).
@Entity('clocks')
@Index(['userId', 'time'])
export class Clock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  // Millisecond precision: two clocks in the same second (double tap) must
  // still come back in the right order, or the "last clock" is wrong.
  @Column({ type: 'datetime', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
  time: Date;

  @Column({ type: 'enum', enum: ClockType })
  type: ClockType;

  @ManyToOne(() => User, (user) => user.clocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
