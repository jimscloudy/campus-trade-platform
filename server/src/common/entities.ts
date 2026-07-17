import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('favorites')
@Unique(['userId', 'itemId'])
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  itemId: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  itemId: number;

  @Column({ type: 'integer' })
  buyerId: number;

  @Column({ type: 'integer' })
  sellerId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  link: string | null;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  reporterId: number;

  @Column({ type: 'varchar', length: 32 })
  targetType: 'item' | 'user' | 'treehole';

  @Column({ type: 'integer' })
  targetId: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: 'pending' | 'resolved' | 'rejected';

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('blocks')
@Unique(['userId', 'blockedUserId'])
export class Block {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  blockedUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
