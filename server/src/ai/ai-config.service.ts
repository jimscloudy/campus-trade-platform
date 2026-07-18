import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type AiProvider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  modelStrong: string;
};

type AiConfigFile = {
  activeId: string;
  providers: AiProvider[];
};

@Injectable()
export class AiConfigService implements OnModuleInit {
  private filePath = join(process.cwd(), 'data', 'ai-config.json');
  private config: AiConfigFile = { activeId: 'grok', providers: [] };

  onModuleInit() {
    this.ensureLoaded();
    this.migrateLegacyOpenAIModels();
  }

  private defaultProviders(): AiProvider[] {
    const envKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    const envKey2 = process.env.AI_API_KEY_OPENAI || '';
    const envBase = (process.env.AI_BASE_URL || 'https://api.hualong.online/v1').replace(/\/$/, '');
    return [
      {
        id: 'grok',
        name: 'Grok 4.5',
        baseUrl: envBase,
        apiKey: envKey,
        model: process.env.AI_MODEL || 'grok-4.5',
        modelStrong: process.env.AI_MODEL_STRONG || 'grok-4.5',
      },
      {
        id: 'openai',
        name: 'OpenAI（中转）',
        baseUrl: (process.env.AI_BASE_URL_OPENAI || envBase).replace(/\/$/, ''),
        apiKey: envKey2,
        model: process.env.AI_MODEL_OPENAI || 'gpt-5.5',
        modelStrong: process.env.AI_MODEL_OPENAI_STRONG || 'gpt-5.6',
      },
    ];
  }

  /** 已有配置里 openai 若还是旧的 5.4-mini，升级默认推荐名（不覆盖用户已改成其它值的） */
  migrateLegacyOpenAIModels() {
    this.ensureLoaded();
    let changed = false;
    for (const p of this.config.providers) {
      if (p.id !== 'openai') continue;
      if (p.model === 'gpt-5.4-mini' || p.model === 'gpt-4o-mini') {
        p.model = 'gpt-5.5';
        changed = true;
      }
      if (p.modelStrong === 'gpt-5.4' || p.modelStrong === 'gpt-4o') {
        p.modelStrong = 'gpt-5.6';
        changed = true;
      }
    }
    if (changed) this.save();
  }

  private ensureLoaded() {
    try {
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw) as AiConfigFile;
        if (parsed?.providers?.length) {
          this.config = parsed;
          for (const d of this.defaultProviders()) {
            if (!this.config.providers.find((p) => p.id === d.id)) {
              this.config.providers.push(d);
            }
          }
          // 若本地通道无 key 而环境变量有，补一次（不覆盖已有 key）
          for (const p of this.config.providers) {
            if (p.id === 'grok' && !p.apiKey && process.env.AI_API_KEY) {
              p.apiKey = process.env.AI_API_KEY;
            }
            if (p.id === 'openai' && !p.apiKey && process.env.AI_API_KEY_OPENAI) {
              p.apiKey = process.env.AI_API_KEY_OPENAI;
            }
          }
          this.save();
          return;
        }
      }
      this.config = { activeId: 'grok', providers: this.defaultProviders() };
      this.save();
    } catch {
      this.config = { activeId: 'grok', providers: this.defaultProviders() };
    }
  }

  private save() {
    const dir = join(process.cwd(), 'data');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  getActive(): AiProvider | null {
    this.ensureLoaded();
    return this.config.providers.find((p) => p.id === this.config.activeId) || this.config.providers[0] || null;
  }

  getById(id: string): AiProvider | null {
    this.ensureLoaded();
    return this.config.providers.find((p) => p.id === id) || null;
  }

  listPublic() {
    this.ensureLoaded();
    const active = this.getActive();
    return {
      activeId: this.config.activeId,
      activeName: active?.name || null,
      activeModel: active?.model || null,
      hasActiveKey: !!(active?.apiKey && active.apiKey.trim()),
      providers: this.config.providers.map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        model: p.model,
        modelStrong: p.modelStrong,
        keyMasked: p.apiKey ? `${p.apiKey.slice(0, 7)}***${p.apiKey.slice(-4)}` : '未配置',
        hasKey: !!(p.apiKey && p.apiKey.trim()),
        active: p.id === this.config.activeId,
      })),
    };
  }

  switchProvider(id: string) {
    this.ensureLoaded();
    const p = this.config.providers.find((x) => x.id === id);
    if (!p) throw new NotFoundException('模型通道不存在');
    this.config.activeId = id;
    this.save();
    return this.listPublic();
  }

  updateProvider(
    id: string,
    data: Partial<Pick<AiProvider, 'name' | 'baseUrl' | 'apiKey' | 'model' | 'modelStrong'>>,
  ) {
    this.ensureLoaded();
    const p = this.config.providers.find((x) => x.id === id);
    if (!p) throw new NotFoundException('模型通道不存在');
    if (data.name != null && String(data.name).trim()) p.name = String(data.name).trim();
    if (data.baseUrl != null && String(data.baseUrl).trim()) {
      p.baseUrl = String(data.baseUrl).trim().replace(/\/$/, '');
    }
    // 允许显式清空：传 " " 或特殊标记；正常非空则更新
    if (data.apiKey != null) {
      const k = String(data.apiKey).trim();
      if (k && k !== '***' && !k.includes('***')) p.apiKey = k;
    }
    if (data.model != null && String(data.model).trim()) p.model = String(data.model).trim();
    if (data.modelStrong != null && String(data.modelStrong).trim()) {
      p.modelStrong = String(data.modelStrong).trim();
    }
    this.save();
    return this.listPublic();
  }

  addProvider(data: Partial<AiProvider> & { name: string }) {
    this.ensureLoaded();
    const id = (data.id || `p_${Date.now()}`).replace(/[^\w-]/g, '-');
    if (this.config.providers.some((p) => p.id === id)) {
      throw new BadRequestException('ID 已存在');
    }
    this.config.providers.push({
      id,
      name: data.name || id,
      baseUrl: (data.baseUrl || 'https://api.hualong.online/v1').replace(/\/$/, ''),
      apiKey: data.apiKey || '',
      model: data.model || 'gpt-5.4-mini',
      modelStrong: data.modelStrong || data.model || 'gpt-5.4',
    });
    this.save();
    return this.listPublic();
  }

  removeProvider(id: string) {
    this.ensureLoaded();
    if (this.config.providers.length <= 1) {
      throw new BadRequestException('至少保留一个通道');
    }
    const idx = this.config.providers.findIndex((p) => p.id === id);
    if (idx < 0) throw new NotFoundException('模型通道不存在');
    this.config.providers.splice(idx, 1);
    if (this.config.activeId === id) {
      this.config.activeId = this.config.providers[0].id;
    }
    this.save();
    return this.listPublic();
  }
}
