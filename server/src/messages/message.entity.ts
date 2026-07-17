import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Item } from '../items/item.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'integer', nullable: true })
  itemId: number | null;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'itemId' })
  item: Item | null;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
