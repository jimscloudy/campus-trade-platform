import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 64 })
  username: string;

  @Column({ length: 128 })
  password: string;

  @Column({ length: 64 })
  nickname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string | null;

  @Column({ length: 64, default: '主校区' })
  campus: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bio: string | null;

  @Column({ type: 'int', default: 80 })
  creditScore: number;

  @Column({ length: 16, default: 'user' })
  role: 'user' | 'admin';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
