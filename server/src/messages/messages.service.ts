import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { NotifyService } from '../common/notify.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    private notify: NotifyService,
  ) {}

  async send(fromId: number, toId: number, content: string, itemId?: number) {
    const msg = this.messages.create({
      fromId,
      toId,
      content,
      itemId: itemId || null,
      read: false,
    });
    const saved = await this.messages.save(msg);
    await this.notify.push(
      toId,
      'message',
      '新私信',
      content.slice(0, 80),
      `/messages/${fromId}`,
    );
    return this.messages.findOne({
      where: { id: saved.id },
      relations: ['from', 'to', 'item'],
    });
  }

  async conversations(userId: number) {
    const rows = await this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.from', 'from')
      .leftJoinAndSelect('m.to', 'to')
      .where('m.fromId = :userId OR m.toId = :userId', { userId })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    const map = new Map<number, any>();
    for (const m of rows) {
      const peerId = m.fromId === userId ? m.toId : m.fromId;
      if (map.has(peerId)) continue;
      const peer = m.fromId === userId ? m.to : m.from;
      map.set(peerId, {
        peerId,
        peer: peer
          ? { id: peer.id, nickname: peer.nickname, avatar: peer.avatar }
          : null,
        lastMessage: m.content,
        lastAt: m.createdAt,
        unread: 0,
      });
    }

    for (const [peerId, conv] of map) {
      conv.unread = await this.messages.count({
        where: { fromId: peerId, toId: userId, read: false },
      });
    }
    return Array.from(map.values());
  }

  async thread(userId: number, peerId: number) {
    const list = await this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.from', 'from')
      .leftJoinAndSelect('m.to', 'to')
      .leftJoinAndSelect('m.item', 'item')
      .where(
        '(m.fromId = :userId AND m.toId = :peerId) OR (m.fromId = :peerId AND m.toId = :userId)',
        { userId, peerId },
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();

    await this.messages
      .createQueryBuilder()
      .update(Message)
      .set({ read: true })
      .where('fromId = :peerId AND toId = :userId AND read = false', { peerId, userId })
      .execute();

    return list.map((m) => ({
      id: m.id,
      fromId: m.fromId,
      toId: m.toId,
      content: m.content,
      itemId: m.itemId,
      read: m.read,
      createdAt: m.createdAt,
      from: m.from ? { id: m.from.id, nickname: m.from.nickname } : null,
    }));
  }
}
