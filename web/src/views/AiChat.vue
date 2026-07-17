<template>
  <div class="page ai-page">
    <section class="card hero">
      <div>
        <div class="badge">✦ AI 能力中心</div>
        <h1>问答 · 搜索 · 写文案 · 防骗</h1>
        <p>{{ statusText }}</p>
      </div>
      <div class="hero-ops">
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="fast">快速</el-radio-button>
          <el-radio-button value="strong">强力</el-radio-button>
        </el-radio-group>
        <el-button @click="reset">新对话</el-button>
      </div>
    </section>

    <div class="tools">
      <button v-for="t in tools" :key="t.key" type="button" @click="runTool(t.key)">{{ t.label }}</button>
    </div>

    <div class="card chat-shell">
      <div class="messages" ref="boxRef">
        <div v-for="(m, i) in messages" :key="i" class="row" :class="m.role">
          <div class="av">{{ m.role === 'user' ? '我' : 'AI' }}</div>
          <div class="bubble"><pre>{{ m.content }}</pre></div>
        </div>
        <div v-if="loading" class="row assistant">
          <div class="av">AI</div>
          <div class="bubble thinking">正在思考…</div>
        </div>
      </div>

      <div class="quick">
        <button v-for="q in quick" :key="q" type="button" @click="ask(q)">{{ q }}</button>
      </div>

      <div class="composer">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入问题，或用上方工具"
          @keydown.enter.exact.prevent="send"
        />
        <el-button type="primary" :loading="loading" @click="send">发送</el-button>
      </div>
    </div>

    <div v-if="recList.length" class="card rec">
      <div class="section-head"><h2>为你推荐</h2></div>
      <div class="grid-items">
        <div v-for="item in recList" :key="item.id" class="card item-card" @click="$router.push(`/items/${item.id}`)">
          <div class="item-body">
            <h3 class="item-title">{{ item.title }}</h3>
            <div class="price">¥{{ item.price }}</div>
            <div class="item-meta"><span>{{ item.campus }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../api/http'

const input = ref('')
const loading = ref(false)
const mode = ref('fast')
const boxRef = ref(null)
const status = ref({ enabled: false, model: 'campus-local' })
const recList = ref([])
const messages = ref([
  {
    role: 'assistant',
    content:
      '你好，我是校园易物 AI。支持：智能问答、自然语言搜商品、写标题描述、估价、议价话术、防骗检测、推荐、树洞疏导。',
  },
])
const quick = ['怎么安全交易？', '帮我找东校区 50 以内教材', '我的订单怎么样了', '给我推荐点闲置']
const tools = [
  { key: 'nl', label: '🔍 智能搜索' },
  { key: 'copy', label: '✍️ 写文案' },
  { key: 'price', label: '💰 估价' },
  { key: 'bargain', label: '🤝 议价话术' },
  { key: 'fraud', label: '🛡 防骗检测' },
  { key: 'rec', label: '✨ 个性化推荐' },
]

const statusText = computed(() => {
  if (!status.value.enabled) return '当前本地 AI；管理员可在后台配置大模型通道。'
  const name = status.value.providerName || '大模型'
  return `当前通道：${name}（${status.value.model}），可切换快速/强力模式。`
})

async function scrollBottom() {
  await nextTick()
  if (boxRef.value) boxRef.value.scrollTop = boxRef.value.scrollHeight
}
function reset() {
  messages.value = [{ role: 'assistant', content: '新对话已开始，想用哪个能力？' }]
  input.value = ''
}
function ask(q) {
  input.value = q
  send()
}
function pushAi(content) {
  messages.value.push({ role: 'assistant', content })
}

async function runTool(key) {
  if (key === 'nl') {
    const { value } = await ElMessageBox.prompt('自然语言搜索', '智能搜索', {
      inputValue: '东校区 50 以内教材',
    }).catch(() => ({ value: null }))
    if (!value) return
    messages.value.push({ role: 'user', content: `搜索：${value}` })
    const s = await http.post('/ai/nl-search', { query: value })
    pushAi(
      `找到 ${s.total} 件\n筛选：${JSON.stringify(s.filters)}\n` +
        (s.list.map((i) => `· #${i.id} ${i.title} ¥${i.price} ${i.campus}`).join('\n') || '无结果'),
    )
  } else if (key === 'copy') {
    const { value: title } = await ElMessageBox.prompt('商品关键词/标题', 'AI 写文案', {
      inputValue: '高等数学教材',
    }).catch(() => ({ value: null }))
    if (!title) return
    const r = await http.post('/ai/copywrite', { title, condition: 'good', campus: '主校区' })
    pushAi(`【标题】${r.title}\n\n【描述】\n${r.description}\n\n标签：${(r.tags || []).join(' / ')}`)
  } else if (key === 'price') {
    const { value: title } = await ElMessageBox.prompt('商品名称', 'AI 估价', {
      inputValue: 'iPad Air',
    }).catch(() => ({ value: null }))
    if (!title) return
    const r = await http.post('/ai/price-suggest', { title, condition: 'good' })
    pushAi(`建议 ¥${r.suggest}（${r.min}-${r.max}）\n${r.reason}`)
  } else if (key === 'bargain') {
    const r = await http.post('/ai/bargain', {
      title: '闲置好物',
      listPrice: 100,
      offerPrice: 80,
      role: 'buyer',
    })
    pushAi(`${r.tip}\n\n话术：\n${r.script}`)
  } else if (key === 'fraud') {
    const { value } = await ElMessageBox.prompt('粘贴对方消息', '防骗检测', {
      inputValue: '先转定金才能发货',
    }).catch(() => ({ value: null }))
    if (!value) return
    const r = await http.post('/ai/fraud-check', { text: value })
    pushAi(`风险等级：${r.level}\n命中：${r.hits.join('、') || '无'}\n建议：${r.advice}`)
  } else if (key === 'rec') {
    const r = await http.get('/ai/recommend')
    recList.value = r.list || []
    pushAi(`${r.reason}，已在下方展示 ${recList.value.length} 件推荐。`)
  }
  await scrollBottom()
}

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true
  await scrollBottom()
  try {
    if (/找|搜索|有没有/.test(text)) {
      const s = await http.post('/ai/nl-search', { query: text })
      pushAi(
        `搜索命中 ${s.total} 件：\n` +
          (s.list.map((i) => `· ${i.title} ¥${i.price}（${i.campus}）`).join('\n') || '无结果'),
      )
    } else {
      // 只传最近对话，避免 payload 过大/校验失败
      const history = messages.value
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-12)
        .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 4000) }))
      const res = await http.post(
        '/ai/chat',
        { messages: history, mode: mode.value },
        { timeout: 90000 },
      )
      const tip =
        res.provider && res.provider !== 'llm'
          ? `\n\n（当前：${res.provider}${res.model ? ' / ' + res.model : ''}）`
          : ''
      pushAi((res.content || '暂无回复') + tip)
    }
  } catch (e) {
    const detail =
      e?.response?.data?.message ||
      (e?.code === 'ECONNABORTED' ? '超时（已等待较久）' : e?.message) ||
      '未知错误'
    pushAi(`请求失败：${detail}\n可刷新页面后重试，或检查后端 /api/ai/ping`)
  } finally {
    loading.value = false
    await scrollBottom()
  }
}

onMounted(async () => {
  try {
    status.value = await http.get('/ai/status')
    const r = await http.get('/ai/recommend')
    recList.value = r.list || []
  } catch {
    /* ignore */
  }
})
</script>

<style scoped>
.ai-page { max-width: 900px; }
.hero {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 22px 24px; margin-bottom: 12px;
  background: linear-gradient(120deg, #e7f7ef, #eaf2ff 60%, #fff7e8);
}
.badge {
  display: inline-block; font-size: 12px; font-weight: 700; color: var(--primary-dark);
  background: rgba(255,255,255,.75); border: 1px solid #c7e6d5; border-radius: 999px;
  padding: 4px 10px; margin-bottom: 8px;
}
.hero h1 { margin: 0 0 6px; font-size: 24px; font-weight: 800; }
.hero p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
.hero-ops { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tools { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.tools button {
  border: 1px solid var(--border); background: #fff; border-radius: 999px;
  padding: 7px 12px; font-size: 12px; cursor: pointer; color: var(--text-secondary);
}
.tools button:hover { background: var(--primary-soft); color: var(--primary-dark); border-color: #c7e6d5; }
.chat-shell { display: flex; flex-direction: column; min-height: 560px; overflow: hidden; margin-bottom: 16px; }
.messages {
  flex: 1; padding: 18px; overflow: auto; background: #f7fbf8;
  min-height: 360px; max-height: calc(100vh - 360px);
}
.row { display: flex; gap: 10px; margin-bottom: 14px; align-items: flex-start; }
.row.user { flex-direction: row-reverse; }
.av {
  width: 34px; height: 34px; border-radius: 12px; display: grid; place-items: center;
  font-size: 12px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6); flex-shrink: 0;
}
.row.user .av { background: linear-gradient(135deg, #f59e0b, #fb923c); }
.bubble {
  max-width: 78%; padding: 12px 14px; border-radius: 16px 16px 16px 6px;
  background: #fff; border: 1px solid var(--border); box-shadow: var(--shadow);
}
.row.user .bubble {
  border-radius: 16px 16px 6px 16px;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6); border: none; color: #fff;
}
.bubble pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; line-height: 1.65; }
.thinking { color: var(--muted); font-size: 13px; }
.quick { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 14px 0; }
.quick button {
  border: 1px solid var(--border); background: #fff; border-radius: 999px;
  padding: 6px 12px; font-size: 12px; color: var(--text-secondary); cursor: pointer;
}
.composer {
  display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px 14px 14px;
  border-top: 1px solid var(--border); align-items: end;
}
.rec { padding: 16px; }
@media (max-width: 640px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .bubble { max-width: 88%; }
}
</style>
