import { Injectable, OnModuleInit } from '@nestjs/common';
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
  }

  private defaultProviders(): AiProvider[] {
    const envKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    const envKey2 = process.env.AI_API_KEY_OPENAI || '';
    const envBase = (process.env.AI_BASE_URL || 'https://api.hualong.online/v1').replace(/\/$/, '');
    const envModel = process.env.AI_MODEL || 'grok-4.5';
    return [
      {
        id: 'grok',
        name: 'Grok 4.5',
        baseUrl: envBase,
        apiKey: envKey,
        model: envModel.includes('grok') ? envModel : 'grok-4.5',
        modelStrong: process.env.AI_MODEL_STRONG || 'grok-4.5',
      },
      {
        id: 'openai',
        name: 'OpenAI（中转）',
        baseUrl: process.env.AI_BASE_URL_OPENAI || envBase,
        // Key 放环境变量 AI_API_KEY_OPENAI，或后台编辑填写
        apiKey: envKey2,
        model: process.env.AI_MODEL_OPENAI || 'gpt-5.4-mini',
        modelStrong: process.env.AI_MODEL_OPENAI_STRONG || 'gpt-5.4',
      },
    ];
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
          // merge missing default providers by id
          for (const d of this.defaultProviders()) {
            if (!this.config.providers.find((p) => p.id === d.id)) {
              this.config.providers.push(d);
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

  listPublic() {
    this.ensureLoaded();
    const active = this.getActive();
    return {
      activeId: this.config.activeId,
      activeName: active?.name || null,
      activeModel: active?.model || null,
      providers: this.config.providers.map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        model: p.model,
        modelStrong: p.modelStrong,
        keyMasked: p.apiKey ? `${p.apiKey.slice(0, 6)}***${p.apiKey.slice(-4)}` : '',
        hasKey: !!p.apiKey,
        active: p.id === this.config.activeId,
      })),
    };
  }

  switchProvider(id: string) {
    this.ensureLoaded();
    const p = this.config.providers.find((x) => x.id === id);
    if (!p) throw new Error('模型通道不存在');
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
    if (!p) throw new Error('模型通道不存在');
    if (data.name != null) p.name = data.name;
    if (data.baseUrl != null) p.baseUrl = data.baseUrl.replace(/\/$/, '');
    if (data.apiKey != null && data.apiKey.trim()) p.apiKey = data.apiKey.trim();
    if (data.model != null) p.model = data.model;
    if (data.modelStrong != null) p.modelStrong = data.modelStrong;
    this.save();
    return this.listPublic();
  }

  addProvider(data: Omit<AiProvider, 'id'> & { id?: string }) {
    this.ensureLoaded();
    const id = (data.id || `p_${Date.now()}`).replace(/\s+/g, '-');
    if (this.config.providers.some((p) => p.id === id)) throw new Error('ID 已存在');
    this.config.providers.push({
      id,
      name: data.name || id,
      baseUrl: (data.baseUrl || 'https://api.hualong.online/v1').replace(/\/$/, ''),
      apiKey: data.apiKey || '',
      model: data.model || 'gpt-4o-mini',
      modelStrong: data.modelStrong || data.model || 'gpt-4o',
    });
    this.save();
    return this.listPublic();
  }
}
