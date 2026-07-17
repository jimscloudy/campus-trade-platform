<template>
  <div class="ai-float" v-if="!hiddenOnAiPage">
    <button v-if="!open" class="fab" type="button" @click="open = true">🤖 AI</button>
    <div v-else class="panel card">
      <div class="hd">
        <strong>校园 AI 助手</strong>
        <button type="button" @click="open = false">×</button>
      </div>
      <div class="bd" ref="box">
        <div v-for="(m, i) in msgs" :key="i" class="m" :class="m.role">{{ m.content }}</div>
      </div>
      <div class="ft">
        <input v-model="text" placeholder="问我买卖/防骗/搜索…" @keydown.enter.prevent="send" />
        <button type="button" :disabled="loading" @click="send">发</button>
      </div>
      <div class="links">
        <a @click="$router.push('/ai'); open = false">完整 AI 页</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../api/http'

const route = useRoute()
const router = useRouter()
const open = ref(false)
const loading = ref(false)
const text = ref('')
const box = ref(null)
const msgs = ref([{ role: 'assistant', content: '嗨，我是悬浮助手。可问流程、防骗，或说“帮我找东校区教材”。' }])
const hiddenOnAiPage = computed(() => route.path === '/ai')

async function send() {
  const q = text.value.trim()
  if (!q || loading.value) return
  msgs.value.push({ role: 'user', content: q })
  text.value = ''
  loading.value = true
  await nextTick()
  if (box.value) box.value.scrollTop = box.value.scrollHeight
  try {
    if (/找|搜索|有没有/.test(q)) {
      const s = await http.post('/ai/nl-search', { query: q })
      const lines = s.list?.length
        ? s.list.map((i) => `· ${i.title} ¥${i.price}（${i.campus}）`).join('\n')
        : '没找到匹配商品'
      msgs.value.push({ role: 'assistant', content: `搜索到 ${s.total} 件：\n${lines}` })
    } else {
      const history = msgs.value
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))
      const res = await http.post('/ai/chat', { messages: history, mode: 'fast' }, { timeout: 90000 })
      msgs.value.push({ role: 'assistant', content: res.content || '暂无回复' })
    }
  } catch (e) {
    const detail = e?.response?.data?.message || e?.message || '网络错误'
    msgs.value.push({ role: 'assistant', content: `暂时连不上：${detail}` })
  } finally {
    loading.value = false
    await nextTick()
    if (box.value) box.value.scrollTop = box.value.scrollHeight
  }
}
</script>

<style scoped>
.ai-float {
  position: fixed;
  right: 18px;
  bottom: 84px;
  z-index: 60;
}
.fab {
  border: none;
  border-radius: 999px;
  padding: 12px 16px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
  box-shadow: 0 10px 28px rgba(47, 158, 107, 0.35);
  cursor: pointer;
}
.panel {
  width: min(340px, calc(100vw - 28px));
  overflow: hidden;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: #f7fbf8;
}
.hd button {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: var(--muted);
}
.bd {
  height: 280px;
  overflow: auto;
  padding: 10px;
  background: #fff;
}
.m {
  margin-bottom: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  max-width: 92%;
}
.m.assistant {
  background: #f3f8f4;
  color: var(--text);
}
.m.user {
  margin-left: auto;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
  color: #fff;
}
.ft {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid var(--border);
}
.ft input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
}
.ft button {
  border: none;
  border-radius: 10px;
  padding: 0 12px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.links {
  padding: 0 10px 8px;
  font-size: 12px;
  color: var(--primary-dark);
}
.links a { cursor: pointer; text-decoration: underline; }
@media (min-width: 901px) {
  .ai-float { bottom: 24px; }
}
</style>
