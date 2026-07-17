import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeholeComment, TreeholePost } from './treehole.entity';
import { NotifyService } from '../common/notify.service';

const ANON_NAMES = ['匿名小树', '路过的松鼠', '图书馆幽灵', '操场夜风', '食堂侦察兵', '晚归的猫'];

@Injectable()
export class TreeholeService {
  constructor(
    @InjectRepository(TreeholePost) private posts: Repository<TreeholePost>,
    @InjectRepository(TreeholeComment) private commentRepo: Repository<TreeholeComment>,
    private notify: NotifyService,
  ) {}

  private randomAnon() {
    return ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)];
  }

  async list(page = 1, pageSize = 20) {
    const all = await this.posts.find();
    all.sort((a, b) => Number(b.id) - Number(a.id));
    const total = all.length;
    const start = (page - 1) * pageSize;
    const slice = all.slice(start, start + pageSize);
    const list = await Promise.all(slice.map((p) => this.publicPost(p)));
    return { list, total, page, pageSize };
  }

  async create(
    userId: number | null,
    data: { content: string; mood?: string; anonymous?: boolean; nickname?: string },
  ) {
    const anonymous = data.anonymous !== false;
    const post = this.posts.create({
      content: data.content.trim(),
      mood: data.mood || '心情',
      anonymous,
      nickname: anonymous ? data.nickname?.trim() || this.randomAnon() : null,
      authorId: anonymous ? null : userId,
      likeCount: 0,
    });
    const saved = await this.posts.save(post);
    return this.publicPost(saved);
  }

  async like(id: number) {
    const post = await this.posts.findOne({ where: { id: Number(id) } });
    if (!post) throw new NotFoundException('树洞不存在');
    post.likeCount = Number(post.likeCount || 0) + 1;
    await this.posts.save(post);
    return this.publicPost(post);
  }

  async listComments(postId: number) {
    const list = await this.commentRepo.find({ where: { postId: Number(postId) } });
    list.sort((a, b) => Number(a.id) - Number(b.id));
    return list.map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      anonymous: c.anonymous,
      nickname: c.anonymous ? c.nickname || '匿名回复' : c.nickname,
      createdAt: c.createdAt,
    }));
  }

  async addComment(
    postId: number,
    userId: number | null,
    data: { content: string; anonymous?: boolean; nickname?: string },
  ) {
    const post = await this.posts.findOne({ where: { id: Number(postId) } });
    if (!post) throw new NotFoundException('树洞不存在');
    const anonymous = data.anonymous !== false;
    const comment = this.commentRepo.create({
      postId: Number(postId),
      content: data.content.trim(),
      anonymous,
      nickname: anonymous ? data.nickname?.trim() || this.randomAnon() : null,
      authorId: anonymous ? null : userId,
    });
    const saved = await this.commentRepo.save(comment);
    if (post.authorId && post.authorId !== userId) {
      await this.notify.push(
        post.authorId,
        'treehole',
        '树洞有新回复',
        (data.content || '').slice(0, 80),
        '/treehole',
      );
    }
    return {
      id: saved.id,
      postId: saved.postId,
      content: saved.content,
      anonymous: saved.anonymous,
      nickname: saved.nickname || '匿名回复',
      createdAt: saved.createdAt,
    };
  }

  private async publicPost(post: TreeholePost) {
    const commentCount = await this.commentRepo.count({ where: { postId: post.id } });
    return {
      id: post.id,
      content: post.content,
      mood: post.mood,
      anonymous: post.anonymous,
      nickname: post.anonymous ? post.nickname || '匿名同学' : post.nickname,
      likeCount: Number(post.likeCount || 0),
      commentCount,
      createdAt: post.createdAt,
    };
  }
}
