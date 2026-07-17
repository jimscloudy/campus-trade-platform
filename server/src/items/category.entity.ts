import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Item } from './item.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @OneToMany(() => Item, (item) => item.category)
  items: Item[];
}
