import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('treehole_posts')
export class TreeholePost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 32, default: '心情' })
  mood: string;

  @Column({ default: true })
  anonymous: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  nickname: string | null;

  @Column({ type: 'integer', nullable: true })
  authorId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @Column({ type: 'integer', default: 0 })
  likeCount: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('treehole_comments')
export class TreeholeComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => TreeholePost)
  @JoinColumn({ name: 'postId' })
  post: TreeholePost;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: true })
  anonymous: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  nickname: string | null;

  @Column({ type: 'integer', nullable: true })
  authorId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
