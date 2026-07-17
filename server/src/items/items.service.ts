import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Item } from './item.entity';
import { Category } from './category.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item) private items: Repository<Item>,
    @InjectRepository(Category) private categories: Repository<Category>,
  ) {}

  listCategories() {
    return this.categories.find({ order: { sort: 'ASC' } });
  }

  async list(query: {
    keyword?: string;
    categoryId?: number;
    campus?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: number;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 12, 50);

    let list = await this.items.find();
    list = list.sort((a, b) => Number(b.id) - Number(a.id));

    const status = query.status && String(query.status).trim() !== '' ? String(query.status) : 'on_sale';
    list = list.filter((i) => String(i.status || '').trim() === status);
    if (query.categoryId != null && String(query.categoryId) !== '') {
      const cid = Number(query.categoryId);
      if (!Number.isNaN(cid)) list = list.filter((i) => Number(i.categoryId) === cid);
    }
    if (query.campus && String(query.campus).trim() !== '') {
      list = list.filter((i) => i.campus === query.campus);
    }
    if (query.sellerId != null && String(query.sellerId) !== '') {
      const sid = Number(query.sellerId);
      if (!Number.isNaN(sid)) list = list.filter((i) => Number(i.sellerId) === sid);
    }
    if (query.keyword && String(query.keyword).trim() !== '') {
      const kw = String(query.keyword).toLowerCase();
      list = list.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(kw) ||
          (i.description || '').toLowerCase().includes(kw),
      );
    }
    if (query.minPrice != null && String(query.minPrice) !== '' && !Number.isNaN(Number(query.minPrice))) {
      list = list.filter((i) => Number(i.price) >= Number(query.minPrice));
    }
    if (query.maxPrice != null && String(query.maxPrice) !== '' && !Number.isNaN(Number(query.maxPrice))) {
      list = list.filter((i) => Number(i.price) <= Number(query.maxPrice));
    }

    const total = list.length;
    const start = (page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);
    const mapped = await this.enrich(pageList);

    return { list: mapped, total, page, pageSize };
  }

  async detail(id: number) {
    const item = await this.items.findOne({ where: { id: Number(id) } });
    if (!item) throw new NotFoundException('商品不存在');
    const [mapped] = await this.enrich([item]);
    return mapped;
  }

  async create(sellerId: number, data: Partial<Item> & { images?: string[] }) {
    const item = this.items.create({
      title: data.title,
      description: data.description,
      price: data.price as any,
      condition: data.condition || 'good',
      campus: data.campus || '主校区',
      categoryId: data.categoryId ?? null,
      sellerId,
      status: 'on_sale',
      imagesRaw: JSON.stringify(data.images || []),
    });
    const saved = await this.items.save(item);
    return this.detail(saved.id);
  }

  async update(id: number, userId: number, data: Partial<Item> & { images?: string[] }) {
    const item = await this.items.findOne({ where: { id: Number(id) } });
    if (!item) throw new NotFoundException('商品不存在');
    if (item.sellerId !== userId) throw new ForbiddenException('只能编辑自己的商品');
    if (data.title != null) item.title = data.title;
    if (data.description != null) item.description = data.description;
    if (data.price != null) item.price = data.price as any;
    if (data.condition != null) item.condition = data.condition;
    if (data.campus != null) item.campus = data.campus;
    if (data.categoryId !== undefined) item.categoryId = data.categoryId as any;
    if (data.images) item.imagesRaw = JSON.stringify(data.images);
    await this.items.save(item);
    return this.detail(id);
  }

  async remove(id: number, userId: number) {
    const item = await this.items.findOne({ where: { id: Number(id) } });
    if (!item) throw new NotFoundException('商品不存在');
    if (item.sellerId !== userId) throw new ForbiddenException('只能下架自己的商品');
    item.status = 'off';
    await this.items.save(item);
    return { ok: true };
  }

  async markSold(id: number) {
    const item = await this.items.findOne({ where: { id: Number(id) } });
    if (item) {
      item.status = 'sold';
      await this.items.save(item);
    }
  }

  private async enrich(items: Item[]) {
    if (!items.length) return [];
    const sellerIds = [...new Set(items.map((i) => Number(i.sellerId)).filter(Boolean))];
    const catIds = [...new Set(items.map((i) => Number(i.categoryId)).filter(Boolean))];
    const userRepo = this.items.manager.getRepository(User);
    const sellers = sellerIds.length
      ? await userRepo.find({ where: { id: In(sellerIds) } })
      : [];
    const categories = catIds.length
      ? await this.categories.find({ where: { id: In(catIds) } })
      : [];
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return items.map((item) =>
      this.publicItem(item, sellerMap.get(Number(item.sellerId)), catMap.get(Number(item.categoryId))),
    );
  }

  private publicItem(item: Item, seller?: User, category?: Category) {
    let images: string[] = [];
    try {
      images = item.imagesRaw ? JSON.parse(item.imagesRaw) : [];
    } catch {
      images = [];
    }
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      price: Number(item.price),
      condition: item.condition,
      campus: item.campus,
      status: item.status,
      images,
      sellerId: item.sellerId,
      categoryId: item.categoryId,
      category: category ? { id: category.id, name: category.name } : null,
      seller: seller
        ? {
            id: seller.id,
            nickname: seller.nickname,
            avatar: seller.avatar,
            campus: seller.campus,
            creditScore: seller.creditScore,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
