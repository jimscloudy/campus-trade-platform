import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Block, Favorite, Offer, Report } from './entities';
import { Item } from '../items/item.entity';
import { User } from '../users/user.entity';
import { NotifyService } from './notify.service';
import { Category } from '../items/category.entity';
import { TreeholePost } from '../treehole/treehole.entity';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Favorite) private favorites: Repository<Favorite>,
    @InjectRepository(Offer) private offers: Repository<Offer>,
    @InjectRepository(Report) private reports: Repository<Report>,
    @InjectRepository(Block) private blocks: Repository<Block>,
    @InjectRepository(Item) private items: Repository<Item>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(TreeholePost) private holes: Repository<TreeholePost>,
    private notify: NotifyService,
  ) {}

  // ---- favorites ----
  async addFavorite(userId: number, itemId: number) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('商品不存在');
    const exists = await this.favorites.findOne({ where: { userId, itemId } });
    if (exists) return { ok: true, favorited: true };
    await this.favorites.save(this.favorites.create({ userId, itemId }));
    return { ok: true, favorited: true };
  }

  async removeFavorite(userId: number, itemId: number) {
    const row = await this.favorites.findOne({ where: { userId, itemId } });
    if (row) await this.favorites.remove(row);
    return { ok: true, favorited: false };
  }

  async myFavorites(userId: number) {
    const rows = await this.favorites.find({ where: { userId } });
    rows.sort((a, b) => Number(b.id) - Number(a.id));
    const ids = rows.map((r) => r.itemId);
    if (!ids.length) return [];
    const items = await this.items.find({ where: { id: In(ids) } });
    const map = new Map(items.map((i) => [i.id, i]));
    return rows
      .map((r) => {
        const item = map.get(r.itemId);
        if (!item) return null;
        let images: string[] = [];
        try {
          images = item.imagesRaw ? JSON.parse(item.imagesRaw) : [];
        } catch {
          images = [];
        }
        return {
          favoriteId: r.id,
          createdAt: r.createdAt,
          item: {
            id: item.id,
            title: item.title,
            price: Number(item.price),
            status: item.status,
            campus: item.campus,
            images,
            sellerId: item.sellerId,
          },
        };
      })
      .filter(Boolean);
  }

  async isFavorited(userId: number, itemId: number) {
    const row = await this.favorites.findOne({ where: { userId, itemId } });
    return { favorited: !!row };
  }

  // ---- offers ----
  async createOffer(buyerId: number, itemId: number, price: number, message?: string) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('商品不存在');
    if (item.status !== 'on_sale') throw new BadRequestException('商品不可议价');
    if (item.sellerId === buyerId) throw new BadRequestException('不能对自己商品议价');
    if (await this.isBlockedEither(buyerId, item.sellerId)) {
      throw new ForbiddenException('双方存在屏蔽关系，无法议价');
    }
    const offer = await this.offers.save(
      this.offers.create({
        itemId,
        buyerId,
        sellerId: item.sellerId,
        price,
        message: message || null,
        status: 'pending',
      }),
    );
    await this.notify.push(
      item.sellerId,
      'offer',
      '收到新议价',
      `有人对「${item.title}」出价 ¥${price}`,
      `/items/${itemId}`,
    );
    return offer;
  }

  async listOffersForItem(itemId: number, userId: number) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('商品不存在');
    if (item.sellerId !== userId) {
      // buyer sees own offers
      const list = await this.offers.find({ where: { itemId, buyerId: userId } });
      list.sort((a, b) => Number(b.id) - Number(a.id));
      return list.map((o) => this.publicOffer(o));
    }
    const list = await this.offers.find({ where: { itemId } });
    list.sort((a, b) => Number(b.id) - Number(a.id));
    return list.map((o) => this.publicOffer(o));
  }

  async myOffers(userId: number, role: 'buyer' | 'seller' = 'buyer') {
    const where = role === 'seller' ? { sellerId: userId } : { buyerId: userId };
    const list = await this.offers.find({ where });
    list.sort((a, b) => Number(b.id) - Number(a.id));
    const itemIds = [...new Set(list.map((o) => o.itemId))];
    const items = itemIds.length ? await this.items.find({ where: { id: In(itemIds) } }) : [];
    const map = new Map(items.map((i) => [i.id, i]));
    return list.map((o) => ({
      ...this.publicOffer(o),
      item: map.get(o.itemId)
        ? { id: map.get(o.itemId)!.id, title: map.get(o.itemId)!.title, price: Number(map.get(o.itemId)!.price) }
        : null,
    }));
  }

  async respondOffer(offerId: number, userId: number, status: 'accepted' | 'rejected') {
    const offer = await this.offers.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('议价不存在');
    if (offer.sellerId !== userId) throw new ForbiddenException('仅卖家可处理议价');
    if (offer.status !== 'pending') throw new BadRequestException('议价已处理');
    offer.status = status;
    await this.offers.save(offer);
    const item = await this.items.findOne({ where: { id: offer.itemId } });
    await this.notify.push(
      offer.buyerId,
      'offer',
      status === 'accepted' ? '议价已接受' : '议价被拒绝',
      status === 'accepted'
        ? `卖家接受了你对「${item?.title || '商品'}」的出价 ¥${offer.price}`
        : `卖家拒绝了你对「${item?.title || '商品'}」的出价`,
      `/items/${offer.itemId}`,
    );
    return this.publicOffer(offer);
  }

  private publicOffer(o: Offer) {
    return {
      id: o.id,
      itemId: o.itemId,
      buyerId: o.buyerId,
      sellerId: o.sellerId,
      price: Number(o.price),
      message: o.message,
      status: o.status,
      createdAt: o.createdAt,
    };
  }

  // ---- reports / blocks ----
  async report(reporterId: number, targetType: Report['targetType'], targetId: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('请填写原因');
    const report = await this.reports.save(
      this.reports.create({
        reporterId,
        targetType,
        targetId,
        reason: reason.trim(),
        status: 'pending',
      }),
    );
    const admins = await this.users.find({ where: { role: 'admin' as any } });
    for (const a of admins) {
      await this.notify.push(a.id, 'report', '新的举报待处理', `${targetType}#${targetId}: ${reason}`, '/admin');
    }
    return report;
  }

  async block(userId: number, blockedUserId: number) {
    if (userId === blockedUserId) throw new BadRequestException('不能屏蔽自己');
    const exists = await this.blocks.findOne({ where: { userId, blockedUserId } });
    if (!exists) await this.blocks.save(this.blocks.create({ userId, blockedUserId }));
    return { ok: true };
  }

  async unblock(userId: number, blockedUserId: number) {
    const row = await this.blocks.findOne({ where: { userId, blockedUserId } });
    if (row) await this.blocks.remove(row);
    return { ok: true };
  }

  async myBlocks(userId: number) {
    const rows = await this.blocks.find({ where: { userId } });
    const ids = rows.map((r) => r.blockedUserId);
    if (!ids.length) return [];
    const users = await this.users.find({ where: { id: In(ids) } });
    return users.map((u) => ({ id: u.id, nickname: u.nickname, username: u.username, campus: u.campus }));
  }

  async isBlockedEither(a: number, b: number) {
    const r1 = await this.blocks.findOne({ where: { userId: a, blockedUserId: b } });
    const r2 = await this.blocks.findOne({ where: { userId: b, blockedUserId: a } });
    return !!(r1 || r2);
  }

  // ---- admin ----
  async adminStats() {
    const [users, items, reports, holes] = await Promise.all([
      this.users.count(),
      this.items.count(),
      this.reports.count({ where: { status: 'pending' } }),
      this.holes.count(),
    ]);
    return { users, items, pendingReports: reports, treehole: holes };
  }

  async adminListReports(status?: string) {
    const all = await this.reports.find();
    let list = all;
    if (status) list = all.filter((r) => r.status === status);
    list.sort((a, b) => Number(b.id) - Number(a.id));
    return list;
  }

  async adminHandleReport(id: number, status: 'resolved' | 'rejected', adminNote?: string) {
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('举报不存在');
    report.status = status;
    report.adminNote = adminNote || null;
    await this.reports.save(report);
    if (status === 'resolved' && report.targetType === 'item') {
      const item = await this.items.findOne({ where: { id: report.targetId } });
      if (item) {
        item.status = 'off';
        await this.items.save(item);
      }
    }
    await this.notify.push(
      report.reporterId,
      'report',
      '举报已处理',
      status === 'resolved' ? '你的举报已处理，相关内容已处理' : '你的举报经核实暂不处理',
      '/',
    );
    return report;
  }

  async adminOffItem(itemId: number) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('商品不存在');
    item.status = 'off';
    await this.items.save(item);
    await this.notify.push(item.sellerId, 'admin', '商品被下架', `「${item.title}」已被管理员下架`, `/items/${item.id}`);
    return { ok: true };
  }

  async adminListItems(status?: string) {
    let list = await this.items.find();
    if (status) list = list.filter((i) => i.status === status);
    list.sort((a, b) => Number(b.id) - Number(a.id));
    return list.map((i) => ({
      id: i.id,
      title: i.title,
      price: Number(i.price),
      status: i.status,
      sellerId: i.sellerId,
      campus: i.campus,
      createdAt: i.createdAt,
    }));
  }

  async adminCategories() {
    return this.categories.find({ order: { sort: 'ASC' } });
  }

  async adminSaveCategory(data: { id?: number; name: string; sort?: number }) {
    if (data.id) {
      const cat = await this.categories.findOne({ where: { id: data.id } });
      if (!cat) throw new NotFoundException('分类不存在');
      cat.name = data.name;
      if (data.sort != null) cat.sort = data.sort;
      return this.categories.save(cat);
    }
    return this.categories.save(this.categories.create({ name: data.name, sort: data.sort || 0 }));
  }

  async adminDeleteCategory(id: number) {
    const cat = await this.categories.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('分类不存在');
    await this.categories.remove(cat);
    return { ok: true };
  }
}
