import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findByUsername(username: string) {
    return this.repo.findOne({ where: { username } });
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<User>) {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async updateProfile(id: number, data: Partial<User>) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    Object.assign(user, data);
    return this.repo.save(user);
  }

  sanitize(user: User) {
    const { password, ...rest } = user;
    return rest;
  }
}
