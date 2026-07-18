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
import { Category } from './category.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 32, default: 'good' })
  condition: string;

  @Column({ length: 64, default: '主校区' })
  campus: string;

  @Column({ length: 32, default: 'on_sale' })
  status: 'on_sale' | 'sold' | 'off';

  @Column({ type: 'text', nullable: true })
  imagesRaw: string | null;

  get images(): string[] {
    try {
      return this.imagesRaw ? JSON.parse(this.imagesRaw) : [];
    } catch {
      return [];
    }
  }

  set images(value: string[]) {
    this.imagesRaw = JSON.stringify(value || []);
  }

  @Column()
  sellerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'integer', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
