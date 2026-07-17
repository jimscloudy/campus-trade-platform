import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Item } from '../items/item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column()
  buyerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  sellerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ length: 32, default: 'pending' })
  status: 'pending' | 'agreed' | 'completed' | 'cancelled';

  @Column({ type: 'varchar', length: 128, nullable: true })
  meetPlace: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  meetTime: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
