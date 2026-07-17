import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Category } from '../items/category.entity';
import { Item } from '../items/item.entity';
import { TreeholePost } from '../treehole/treehole.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(Item) private items: Repository<Item>,
    @InjectRepository(TreeholePost) private holes: Repository<TreeholePost>,
  ) {}

  async onModuleInit() {
    const count = await this.users.count();
    if (count > 0) {
      const holeCount = await this.holes.count();
      if (holeCount === 0) await this.seedTreehole();
      return;
    }

    const admin = this.users.create({
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      nickname: '管理员',
      campus: '主校区',
      role: 'admin',
      creditScore: 100,
    });
    const demo = this.users.create({
      username: 'demo',
      password: await bcrypt.hash('123456', 10),
      nickname: '校园小卖家',
      campus: '主校区',
      role: 'user',
      creditScore: 95,
      bio: '毕业清闲置，当面交易优先',
    });
    await this.users.save([admin, demo]);

    const names = ['数码', '图书教材', '服饰鞋包', '生活日用', '运动户外', '其他'];
    const cats = await this.categories.save(names.map((name, i) => this.categories.create({ name, sort: i })));

    await this.items.save([
      this.items.create({
        title: '几乎全新 iPad Air 5',
        description: '自用一学期，配件齐全，可当面验机。',
        price: 2899,
        condition: 'like_new',
        campus: '主校区',
        status: 'on_sale',
        imagesRaw: '[]',
        sellerId: demo.id,
        categoryId: cats[0].id,
      }),
      this.items.create({
        title: '高等数学同济第七版上下册',
        description: '有少量笔记，不影响阅读，打包出。',
        price: 25,
        condition: 'good',
        campus: '主校区',
        status: 'on_sale',
        imagesRaw: '[]',
        sellerId: demo.id,
        categoryId: cats[1].id,
      }),
      this.items.create({
        title: '宿舍小风扇 USB 充电',
        description: '静音够用，毕业带走不方便，便宜出。',
        price: 35,
        condition: 'good',
        campus: '东校区',
        status: 'on_sale',
        imagesRaw: '[]',
        sellerId: demo.id,
        categoryId: cats[3].id,
      }),
    ]);

    await this.seedTreehole();
    console.log('Seed data ready: admin/admin123, demo/123456');
  }

  private async seedTreehole() {
    await this.holes.save([
      this.holes.create({
        content: '期末周图书馆一座难求…有没有人和我一样靠咖啡续命的？',
        mood: '吐槽',
        anonymous: true,
        nickname: '图书馆幽灵',
        likeCount: 12,
      }),
      this.holes.create({
        content: '今天在操场看到晚霞，突然觉得大学生活也没那么苦。',
        mood: '治愈',
        anonymous: true,
        nickname: '操场夜风',
        likeCount: 28,
      }),
      this.holes.create({
        content: '求推荐主校区附近适合小组讨论的安静咖啡店，谢谢！',
        mood: '求助',
        anonymous: true,
        nickname: '赶due选手',
        likeCount: 5,
      }),
    ]);
  }
}
