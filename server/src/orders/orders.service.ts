import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { Item } from '../items/item.entity';
import { User } from '../users/user.entity';
import { ItemsService } from '../items/items.service';
import { NotifyService } from '../common/notify.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Item) private items: Repository<Item>,
    @InjectRepository(User) private users: Repository<User>,
    private itemsService: ItemsService,
    private notify: NotifyService,
  ) {}

  async create(buyerId: number, itemId: number, remark?: string) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('商品不存在');
    if (item.status !== 'on_sale') throw new BadRequestException('商品已下架或已售出');
    if (item.sellerId === buyerId) throw new BadRequestException('不能购买自己的商品');

    const order = this.orders.create({
      itemId,
      buyerId,
      sellerId: item.sellerId,
      status: 'pending',
      remark: remark || null,
    });
    const saved = await this.orders.save(order);
    await this.notify.push(
      item.sellerId,
      'order',
      '新的购买意向',
      `有人想要「${item.title}」`,
      '/orders',
    );
    return this.detail(saved.id, buyerId);
  }

  async myOrders(userId: number, role?: 'buyer' | 'seller') {
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.item', 'item')
      .leftJoinAndSelect('o.buyer', 'buyer')
      .leftJoinAndSelect('o.seller', 'seller')
      .orderBy('o.createdAt', 'DESC');

    if (role === 'buyer') qb.where('o.buyerId = :userId', { userId });
    else if (role === 'seller') qb.where('o.sellerId = :userId', { userId });
    else qb.where('o.buyerId = :userId OR o.sellerId = :userId', { userId });

    const list = await qb.getMany();
    return list.map((o) => this.publicOrder(o));
  }

  async detail(id: number, userId: number) {
    const order = await this.orders.findOne({
      where: { id },
      relations: ['item', 'buyer', 'seller'],
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('无权查看该订单');
    }
    return this.publicOrder(order);
  }

  async updateStatus(
    id: number,
    userId: number,
    data: { status: Order['status']; meetPlace?: string; meetTime?: string },
  ) {
    const order = await this.orders.findOne({ where: { id }, relations: ['item'] });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('无权操作该订单');
    }

    const { status, meetPlace, meetTime } = data;
    if (status === 'agreed') {
      if (order.sellerId !== userId) throw new ForbiddenException('仅卖家可确认约定');
      if (order.status !== 'pending') throw new BadRequestException('当前状态不可约定');
      order.status = 'agreed';
      if (meetPlace) order.meetPlace = meetPlace;
      if (meetTime) order.meetTime = meetTime;
    } else if (status === 'completed') {
      if (order.status !== 'agreed' && order.status !== 'pending') {
        throw new BadRequestException('当前状态不可完成');
      }
      order.status = 'completed';
      await this.itemsService.markSold(order.itemId);
    } else if (status === 'cancelled') {
      if (order.status === 'completed') throw new BadRequestException('已完成订单不可取消');
      order.status = 'cancelled';
    } else {
      throw new BadRequestException('无效状态');
    }

    await this.orders.save(order);
    const peerId = order.buyerId === userId ? order.sellerId : order.buyerId;
    const labels: Record<string, string> = {
      agreed: '卖家已确认约定',
      completed: '订单已完成',
      cancelled: '订单已取消',
    };
    await this.notify.push(peerId, 'order', labels[status] || '订单状态更新', `订单 #${order.id}：${labels[status] || status}`, '/orders');
    return this.detail(id, userId);
  }

  async review(orderId: number, fromId: number, score: number, content?: string) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'completed') throw new BadRequestException('仅已完成订单可评价');
    if (order.buyerId !== fromId && order.sellerId !== fromId) {
      throw new ForbiddenException('无权评价');
    }
    const exists = await this.reviews.findOne({ where: { orderId, fromId } });
    if (exists) throw new BadRequestException('已评价过');

    const toId = order.buyerId === fromId ? order.sellerId : order.buyerId;
    const review = await this.reviews.save(
      this.reviews.create({
        orderId,
        fromId,
        toId,
        score: Math.min(5, Math.max(1, score)),
        content: content || null,
      }),
    );

    const toUser = await this.users.findOne({ where: { id: toId } });
    if (toUser) {
      const all = await this.reviews.find({ where: { toId } });
      const avg = all.reduce((s, r) => s + r.score, 0) / all.length;
      toUser.creditScore = Math.round(60 + avg * 8);
      await this.users.save(toUser);
    }
    return review;
  }

  private publicOrder(order: Order) {
    return {
      id: order.id,
      itemId: order.itemId,
      item: order.item
        ? {
            id: order.item.id,
            title: order.item.title,
            price: Number(order.item.price),
            images: (() => {
              try {
                return order.item.imagesRaw ? JSON.parse(order.item.imagesRaw) : [];
              } catch {
                return [];
              }
            })(),
            status: order.item.status,
          }
        : null,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      buyer: order.buyer
        ? { id: order.buyer.id, nickname: order.buyer.nickname, avatar: order.buyer.avatar }
        : null,
      seller: order.seller
        ? { id: order.seller.id, nickname: order.seller.nickname, avatar: order.seller.avatar }
        : null,
      status: order.status,
      meetPlace: order.meetPlace,
      meetTime: order.meetTime,
      remark: order.remark,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
