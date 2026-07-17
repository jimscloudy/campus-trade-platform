import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities';

@Injectable()
export class NotifyService {
  constructor(@InjectRepository(Notification) private repo: Repository<Notification>) {}

  async push(userId: number, type: string, title: string, content: string, link?: string) {
    if (!userId) return null;
    return this.repo.save(
      this.repo.create({
        userId,
        type,
        title,
        content,
        link: link || null,
        read: false,
      }),
    );
  }

  async list(userId: number, page = 1, pageSize = 30) {
    const all = await this.repo.find({ where: { userId } });
    all.sort((a, b) => Number(b.id) - Number(a.id));
    const total = all.length;
    const unread = all.filter((n) => !n.read).length;
    const list = all.slice((page - 1) * pageSize, page * pageSize);
    return { list, total, unread, page, pageSize };
  }

  async markRead(userId: number, id?: number) {
    if (id) {
      const n = await this.repo.findOne({ where: { id, userId } });
      if (n) {
        n.read = true;
        await this.repo.save(n);
      }
    } else {
      const all = await this.repo.find({ where: { userId, read: false } });
      for (const n of all) {
        n.read = true;
        await this.repo.save(n);
      }
    }
    return { ok: true };
  }

  async unreadCount(userId: number) {
    return this.repo.count({ where: { userId, read: false } });
  }
}
