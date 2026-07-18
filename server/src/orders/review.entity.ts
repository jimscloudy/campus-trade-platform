import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Order } from './order.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  fromId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromId' })
  from: User;

  @Column()
  toId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'toId' })
  to: User;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
