import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClockStatus } from './enums';
import { User } from './user.entity';

@Entity('clocks')
@Index(['userId', 'time'])
export class Clock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  time: Date;

  @Column({ type: 'enum', enum: ClockStatus })
  status: ClockStatus;

  @ManyToOne(() => User, (user) => user.clocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
