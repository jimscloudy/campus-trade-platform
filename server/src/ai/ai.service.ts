import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../items/item.entity';
import { Category } from '../items/category.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Favorite, Notification, Report } from '../common/entities';
import { TreeholePost } from '../treehole/treehole.entity';
import { AiConfigService } from './ai-config.service';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Item) private items: Repository<Item>,
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Favorite) private favorites: Repository<Favorite>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
    @InjectRepository(Report) private reports: Repository<Report>,
    @InjectRepository(TreeholePost) private holes: Repository<TreeholePost>,
    private aiConfig: AiConfigService,
  ) {}

  private get cfg() {
    const active = this.aiConfig.getActive();
    if (active?.apiKey) {
      return {
        apiKey: active.apiKey,
        baseUrl: (active.baseUrl || 'https://api.hualong.online/v1').replace(/\/$/, ''),
        model: active.model || 'gpt-4o-mini',
        modelStrong: active.modelStrong || active.model || 'gpt-4o',
        enabled: true,
        providerId: active.id,
        providerName: active.name,
      };
    }
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    const baseUrl = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    );
    const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const modelStrong = process.env.AI_MODEL_STRONG || model;
    return {
      apiKey,
      baseUrl,
      model,
      modelStrong,
      enabled: !!apiKey,
      providerId: 'env',
      providerName: '环境变量',
    };
  }

  status() {
    const { enabled, model, modelStrong, baseUrl, providerId, providerName } = this.cfg;
    const list = this.aiConfig.listPublic();
    return {
      enabled,
      provider: enabled ? 'llm' : 'local',
      providerId,
      providerName,
      model,
      modelStrong,
      baseUrl: enabled ? baseUrl : null,
      providers: list.providers,
      features: [
        'chat',
        'copywrite',
        'price-suggest',
        'bargain',
        'fraud-check',
        'nl-search',
        'recommend',
        'moderate',
        'treehole-comfort',
        'message-draft',
        'report-summary',
        'insights',
      ],
    };
  }

  listProviders() {
    return this.aiConfig.listPublic();
  }

  switchProvider(id: string) {
    return this.aiConfig.switchProvider(id);
  }

  updateProvider(id: string, data: any) {
    return this.aiConfig.updateProvider(id, data);
  }

  addProvider(data: any) {
    return this.aiConfig.addProvider(data);
  }

  async chat(messages: ChatMessage[], userId?: number, mode: 'fast' | 'strong' = 'fast') {
    if (!messages?.length) throw new BadRequestException('消息不能为空');
    const last = [...messages].reverse().find((m) => m.role === 'user');
    if (!last?.content?.trim()) throw new BadRequestException('请输入问题');

    const context = await this.buildBusinessContext(userId, last.content);
    const system = `你是「校园易物」AI 助手。用中文简洁回答大学生问题。
安全原则：当面验货、校内公共场合、勿提前转账、警惕刷单定金。
可参考业务上下文（若有）：
${context}
若用户要查自己的订单/收藏/通知，基于上下文回答，不要编造不存在的数据。`;

    const { apiKey, baseUrl, model, modelStrong } = this.cfg;
    if (apiKey) {
      try {
        const content = await this.callLlm(
          baseUrl,
          apiKey,
          mode === 'strong' ? modelStrong : model,
          [{ role: 'system', content: system }, ...messages.slice(-12)],
        );
        return { content, provider: 'llm', model: mode === 'strong' ? modelStrong : model, contextUsed: !!userId };
      } catch (e: any) {
        return {
          content: `${this.localChat(last.content, context)}\n\n（大模型失败，已本地兜底：${e?.message || 'error'}）`,
          provider: 'local-fallback',
          model: 'campus-local',
        };
      }
    }
    return { content: this.localChat(last.content, context), provider: 'local', model: 'campus-local' };
  }

  async copywrite(input: {
    title?: string;
    description?: string;
    category?: string;
    condition?: string;
    campus?: string;
    price?: number;
  }) {
    const titleHint = input.title || input.category || '闲置好物';
    const cond =
      { like_new: '几乎全新', good: '轻微使用', fair: '明显使用', poor: '有瑕疵' }[input.condition || 'good'] ||
      '轻微使用';
    const local = {
      title: this.clamp(
        `${cond}${input.category ? ' · ' + input.category : ''} ${titleHint}`.replace(/\s+/g, ' ').trim(),
        40,
      ),
      description: [
        `【成色】${cond}`,
        input.campus ? `【校区】${input.campus}，可当面交易` : '【校区】支持当面交易',
        input.price != null ? `【价格】¥${input.price}，可小刀` : '【价格】可议',
        input.description?.trim() || '自用闲置，功能正常，配件按实拍为准。',
        '优先同校当面验货，非诚勿扰～',
      ].join('\n'),
      tags: [input.category || '闲置', cond, input.campus || '主校区'].filter(Boolean),
    };

    if (!this.cfg.apiKey) return { ...local, provider: 'local' };
    try {
      const prompt = `为校园二手生成吸引人的标题(≤40字)和描述(3-6行)。返回JSON: {"title":"...","description":"...","tags":[".."]}
信息: ${JSON.stringify(input)}`;
      const raw = await this.callLlm(this.cfg.baseUrl, this.cfg.apiKey, this.cfg.model, [
        { role: 'user', content: prompt },
      ]);
      const parsed = this.parseJson(raw);
      return {
        title: parsed.title || local.title,
        description: parsed.description || local.description,
        tags: parsed.tags || local.tags,
        provider: 'llm',
      };
    } catch {
      return { ...local, provider: 'local-fallback' };
    }
  }

  async priceSuggest(input: { title: string; description?: string; condition?: string; category?: string }) {
    const text = `${input.title} ${input.description || ''} ${input.category || ''}`.toLowerCase();
    let base = 50;
    if (/ipad|平板/.test(text)) base = 1800;
    else if (/iphone|手机|华为|小米|红米/.test(text)) base = 1200;
    else if (/笔记本|macbook|电脑/.test(text)) base = 2500;
    else if (/教材|高等数学|英语|考研|书/.test(text)) base = 25;
    else if (/风扇|台灯|锅|宿舍/.test(text)) base = 40;
    else if (/鞋|衣服|包/.test(text)) base = 80;
    else if (/耳机|键盘|鼠标/.test(text)) base = 120;

    const factor =
      { like_new: 0.85, good: 0.65, fair: 0.45, poor: 0.3 }[input.condition || 'good'] || 0.65;
    const mid = Math.max(5, Math.round(base * factor));
    const result = {
      min: Math.max(1, Math.round(mid * 0.75)),
      max: Math.round(mid * 1.25),
      suggest: mid,
      reason: `按标题关键词与成色粗估校园二手行情，建议标价约 ¥${mid}（区间 ¥${Math.round(mid * 0.75)}–¥${Math.round(mid * 1.25)}），可按配件完整度微调。`,
      provider: 'local' as string,
    };

    if (!this.cfg.apiKey) return result;
    try {
      const raw = await this.callLlm(this.cfg.baseUrl, this.cfg.apiKey, this.cfg.model, [
        {
          role: 'user',
          content: `估算中国校园二手挂牌价，返回JSON {"min":n,"max":n,"suggest":n,"reason":"..."}。商品:${JSON.stringify(input)}`,
        },
      ]);
      const p = this.parseJson(raw);
      return {
        min: Number(p.min) || result.min,
        max: Number(p.max) || result.max,
        suggest: Number(p.suggest) || result.suggest,
        reason: p.reason || result.reason,
        provider: 'llm',
      };
    } catch {
      return { ...result, provider: 'local-fallback' };
    }
  }

  async bargain(input: {
    title: string;
    listPrice: number;
    offerPrice?: number;
    role: 'buyer' | 'seller';
  }) {
    const list = Number(input.listPrice) || 0;
    const offer = input.offerPrice != null ? Number(input.offerPrice) : Math.round(list * 0.85);
    const discount = list ? Math.round((1 - offer / list) * 100) : 0;
    const buyerScript = `你好，很喜欢「${input.title}」，成色可以的话我想出价 ¥${offer}（大约${discount}% off），校内当面交易，方便吗？`;
    const sellerScript =
      discount > 25
        ? `谢谢喜欢～这个价格有点低，最低大概 ¥${Math.round(list * 0.9)}，当面看货能再聊。`
        : `可以小刀，你给的 ¥${offer} 我考虑下，当面验货后确认成色再定。`;
    const tip =
      input.role === 'buyer'
        ? '买家策略：先夸后砍，给具体见面时间，别一上来腰斩。'
        : '卖家策略：守住底线，可用“当面看货再议”缓冲。';

    return {
      suggestOffer: offer,
      discountPercent: discount,
      script: input.role === 'buyer' ? buyerScript : sellerScript,
      tip,
      provider: 'local',
    };
  }

  fraudCheck(text: string) {
    const t = text || '';
    const rules: { key: string; level: 'high' | 'medium'; tip: string }[] = [
      { key: '刷单', level: 'high', tip: '疑似刷单兼职诈骗' },
      { key: '定金', level: 'high', tip: '警惕先付定金套路' },
      { key: '先转', level: 'high', tip: '警惕要求先转账' },
      { key: '先付', level: 'high', tip: '警惕要求先付款' },
      { key: '保证金', level: 'high', tip: '警惕保证金话术' },
      { key: '验证码', level: 'high', tip: '勿泄露验证码' },
      { key: '转账', level: 'medium', tip: '建议当面交易，勿提前转账' },
      { key: '扫码', level: 'medium', tip: '陌生扫码需警惕' },
      { key: '代购', level: 'medium', tip: '核实商品与见面方式' },
      { key: '包邮到付', level: 'medium', tip: '二手建议当面，慎邮寄到付' },
      { key: '私下加微信', level: 'medium', tip: '可站内沟通，防引流诈骗' },
      { key: '银行卡', level: 'high', tip: '勿提供银行卡信息' },
    ];
    const hits = rules.filter((r) => t.includes(r.key));
    const level = hits.some((h) => h.level === 'high') ? 'high' : hits.length ? 'medium' : 'low';
    return {
      level,
      safe: level === 'low',
      hits: hits.map((h) => h.key),
      tips: hits.map((h) => h.tip),
      advice:
        level === 'low'
          ? '未发现明显风险话术，仍建议当面验货付款。'
          : '检测到可疑表述，请勿提前转账，优先校内公共场合交易，必要时举报。',
    };
  }

  async moderate(content: string) {
    const t = (content || '').toLowerCase();
    const banned = ['毒品', '枪支', '黄色', '色情', '代考', '办证', '色情服务', '大麻'];
    const hits = banned.filter((k) => t.includes(k.toLowerCase()) || content.includes(k));
    const result = {
      pass: hits.length === 0,
      risk: hits.length ? 'high' : 'low',
      hits,
      reason: hits.length ? `可能包含违规内容：${hits.join('、')}` : '未发现明显违规',
    };
    return result;
  }

  async nlSearch(query: string) {
    const q = query || '';
    const filters: any = { keyword: '', campus: '', minPrice: undefined, maxPrice: undefined, categoryName: '' };
    if (/主校区|东校区|西校区/.test(q)) {
      const m = q.match(/主校区|东校区|西校区/);
      filters.campus = m?.[0] || '';
    }
    const priceRange = q.match(/(\d+)\s*[-~到至]\s*(\d+)/);
    const under = q.match(/(?:不超过|以内|低于|小于|<|<=)\s*(\d+)/) || q.match(/(\d+)\s*块?以内/);
    if (priceRange) {
      filters.minPrice = Number(priceRange[1]);
      filters.maxPrice = Number(priceRange[2]);
    } else if (under) {
      filters.maxPrice = Number(under[1]);
    }
    const cats = await this.categories.find();
    for (const c of cats) {
      if (q.includes(c.name) || (c.name === '图书教材' && /教材|课本|考研书/.test(q))) {
        filters.categoryName = c.name;
        filters.categoryId = c.id;
        break;
      }
    }
    filters.keyword = q
      .replace(/主校区|东校区|西校区/g, '')
      .replace(/(\d+)\s*[-~到至]\s*(\d+)/g, '')
      .replace(/(?:不超过|以内|低于|小于)\s*\d+/g, '')
      .replace(/\d+\s*块?以内/g, '')
      .replace(/帮我|找|搜索|有没有|推荐/g, '')
      .trim();

    let list = await this.items.find();
    list = list.filter((i) => i.status === 'on_sale');
    if (filters.campus) list = list.filter((i) => i.campus === filters.campus);
    if (filters.categoryId) list = list.filter((i) => Number(i.categoryId) === Number(filters.categoryId));
    if (filters.minPrice != null) list = list.filter((i) => Number(i.price) >= filters.minPrice);
    if (filters.maxPrice != null) list = list.filter((i) => Number(i.price) <= filters.maxPrice);
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      list = list.filter(
        (i) => (i.title || '').toLowerCase().includes(kw) || (i.description || '').toLowerCase().includes(kw),
      );
    }
    list.sort((a, b) => Number(b.id) - Number(a.id));
    return {
      filters,
      total: list.length,
      list: list.slice(0, 12).map((i) => this.briefItem(i)),
    };
  }

  async recommend(userId?: number) {
    let list = (await this.items.find()).filter((i) => i.status === 'on_sale');
    list.sort((a, b) => Number(b.id) - Number(a.id));
    if (userId) {
      const favs = await this.favorites.find({ where: { userId } });
      const favItems = favs.length
        ? await this.items.find()
        : [];
      const favCat = new Set(
        favItems.filter((i) => favs.some((f) => f.itemId === i.id)).map((i) => i.categoryId),
      );
      const user = await this.users.findOne({ where: { id: userId } });
      list = list.sort((a, b) => {
        let sa = 0;
        let sb = 0;
        if (user?.campus && a.campus === user.campus) sa += 2;
        if (user?.campus && b.campus === user.campus) sb += 2;
        if (favCat.has(a.categoryId)) sa += 3;
        if (favCat.has(b.categoryId)) sb += 3;
        return sb - sa || Number(b.id) - Number(a.id);
      });
    }
    return {
      list: list.slice(0, 8).map((i) => this.briefItem(i)),
      reason: userId ? '结合你的校区与收藏偏好推荐' : '最新在售好物',
    };
  }

  async treeholeComfort(content: string) {
    const t = content || '';
    const riskWords = ['自杀', '结束生命', '不想活', '自残'];
    const risky = riskWords.some((w) => t.includes(w));
    const reply = risky
      ? '听到你很难受，你并不孤单。请尽快联系身边信任的人或学校心理中心/危机干预热线。若只是想倾诉，也可以继续说说发生了什么，我在这里听你说。'
      : '谢谢你愿意说出来。学业和人际关系压力很常见，允许自己喘口气。如果愿意，可以说说最卡住你的一件事，我们一起拆小一点。也欢迎去树洞看看别人的故事，你不是一个人。';
    return {
      reply,
      risky,
      resources: risky
        ? ['校内心理咨询中心', '当地心理援助热线', '紧急情况请拨打 110/120']
        : ['规律作息与运动', '和朋友聊聊', '树洞匿名倾诉'],
      provider: 'local',
    };
  }

  async messageDraft(input: { peerName?: string; itemTitle?: string; intent: string; tone?: string }) {
    const name = input.peerName || '同学';
    const item = input.itemTitle || '这件闲置';
    const map: Record<string, string> = {
      ask_detail: `你好${name}，还在吗？想了解下「${item}」的成色和有无磕碰，方便的话发张细节图～`,
      bargain: `你好，很喜欢「${item}」，预算有限想小刀一点，方便当面看货再定吗？`,
      meet: `你好，如果还在的话，我们约个校内地点当面交易吧，你这周哪天方便？`,
      accept: `好的，价格和成色我接受，我们约图书馆门口当面验货吧。`,
      reject: `谢谢你的出价，暂时不打算再低了。如果后面有空间我再联系你～`,
      polite: `好的，收到，谢谢！`,
    };
    return {
      draft: map[input.intent] || map.ask_detail,
      provider: 'local',
    };
  }

  async reportSummary() {
    const all = await this.reports.find();
    const pending = all.filter((r) => r.status === 'pending');
    const byType: Record<string, number> = {};
    for (const r of pending) byType[r.targetType] = (byType[r.targetType] || 0) + 1;
    const topReasons = pending.slice(0, 5).map((r) => `#${r.id} ${r.targetType}/${r.targetId}: ${r.reason}`);
    return {
      total: all.length,
      pending: pending.length,
      byType,
      summary:
        pending.length === 0
          ? '当前没有待处理举报，系统运行平稳。'
          : `待处理举报 ${pending.length} 条，类型分布：${JSON.stringify(byType)}。建议优先处理 item 类举报并核查是否需下架。`,
      samples: topReasons,
    };
  }

  async insights() {
    const [itemList, userCount, orderList, holeCount, reportPending] = await Promise.all([
      this.items.find(),
      this.users.count(),
      this.orders.find(),
      this.holes.count(),
      this.reports.count({ where: { status: 'pending' } }),
    ]);
    const onSale = itemList.filter((i) => i.status === 'on_sale');
    const campusCount: Record<string, number> = {};
    for (const i of onSale) campusCount[i.campus || '未知'] = (campusCount[i.campus || '未知'] || 0) + 1;
    const avgPrice = onSale.length
      ? Math.round(onSale.reduce((s, i) => s + Number(i.price), 0) / onSale.length)
      : 0;
    return {
      users: userCount,
      itemsOnSale: onSale.length,
      itemsTotal: itemList.length,
      orders: orderList.length,
      treehole: holeCount,
      pendingReports: reportPending,
      avgPrice,
      campusCount,
      tips: [
        onSale.length < 5 ? '在售商品偏少，可做毕业季征集活动' : '在售供给健康',
        reportPending > 0 ? `有 ${reportPending} 条举报待处理` : '暂无积压举报',
        `在售均价约 ¥${avgPrice}`,
      ],
    };
  }

  private async buildBusinessContext(userId: number | undefined, question: string) {
    const parts: string[] = [];
    const wantMine = /我的|订单|收藏|通知|未读/.test(question);
    if (userId && wantMine) {
      const [orders, favs, unread] = await Promise.all([
        this.orders.find(),
        this.favorites.find({ where: { userId } }),
        this.notifications.count({ where: { userId, read: false } }),
      ]);
      const mine = orders.filter((o) => o.buyerId === userId || o.sellerId === userId).slice(-5);
      parts.push(`用户#${userId} 最近订单数=${mine.length}，收藏=${favs.length}，未读通知=${unread}`);
      parts.push(
        `订单摘要: ${mine
          .map((o) => `#${o.id} status=${o.status} item=${o.itemId}`)
          .join('; ') || '无'}`,
      );
    }
    if (/推荐|有什么好|热门/.test(question)) {
      const rec = await this.recommend(userId);
      parts.push(`推荐商品: ${rec.list.map((i) => `${i.title}(¥${i.price})`).join('、')}`);
    }
    if (/搜索|找|有没有/.test(question)) {
      const s = await this.nlSearch(question);
      parts.push(`NL搜索命中 ${s.total} 件，示例: ${s.list.map((i) => i.title).join('、')}`);
    }
    return parts.join('\n') || '无额外业务数据';
  }

  private localChat(question: string, context: string) {
    if (/订单|收藏|通知/.test(question) && context.includes('用户#')) {
      return `根据你的账号数据：\n${context}\n\n可到「订单 / 收藏 / 系统通知」查看详情。`;
    }
    if (/推荐|有什么/.test(question)) {
      return context.includes('推荐商品')
        ? `给你几个方向：\n${context}\n也可去广场按分类逛逛。`
        : '可以去闲置广场看看最新上架，或告诉我预算和校区，我帮你筛。';
    }
    if (/安全|骗|转账/.test(question)) {
      return '安全要点：校内公共场合见面、先验货再付款、不提前转账/交定金、不点陌生链接、可疑立刻举报。';
    }
    if (/议价|还价/.test(question)) {
      return '详情页点「议价」出价；话术可以先表达喜欢再给合理价格，并约定当面看货。需要我帮你生成一段议价话术也可以说「帮我写议价」。';
    }
    return `我是校园易物助手，可以帮你：智能写文案、估价、议价话术、防骗检测、自然语言搜商品、推荐、树洞疏导。\n你问的是：「${question}」\n试试更具体一点，或打开 AI 页的快捷能力。`;
  }

  private briefItem(i: Item) {
    let images: string[] = [];
    try {
      images = i.imagesRaw ? JSON.parse(i.imagesRaw) : [];
    } catch {
      images = [];
    }
    return {
      id: i.id,
      title: i.title,
      price: Number(i.price),
      campus: i.campus,
      status: i.status,
      categoryId: i.categoryId,
      images,
    };
  }

  private clamp(s: string, n: number) {
    return s.length > n ? s.slice(0, n) : s;
  }

  private parseJson(raw: string) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return {};
    try {
      return JSON.parse(m[0]);
    } catch {
      return {};
    }
  }

  private async callLlm(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[]) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, temperature: 0.6, messages }),
    });
    const rawText = await res.text();
    if (!res.ok) {
      let detail = rawText.slice(0, 240);
      try {
        const j = JSON.parse(rawText);
        detail = j.message || j.error?.message || j.code || detail;
      } catch {
        /* ignore */
      }
      throw new Error(`AI HTTP ${res.status}: ${detail}`);
    }
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error('AI 返回非 JSON');
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI empty');
    return String(content).trim();
  }

  async ping() {
    const { apiKey, baseUrl, model, enabled } = this.cfg;
    if (!enabled) {
      return { ok: false, reason: '未配置 AI_API_KEY', baseUrl, model };
    }
    try {
      const content = await this.callLlm(baseUrl, apiKey, model, [
        { role: 'user', content: '只回复：ok' },
      ]);
      return { ok: true, baseUrl, model, sample: content.slice(0, 80) };
    } catch (e: any) {
      return {
        ok: false,
        baseUrl,
        model,
        keyPrefix: apiKey.slice(0, 4) + '***' + apiKey.slice(-4),
        reason: e?.message || String(e),
      };
    }
  }
}
