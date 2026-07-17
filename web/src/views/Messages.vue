<template>
  <div class="page messages">
    <div class="card sidebar">
      <div class="side-head">
        <h3>历史会话</h3>
        <span class="muted">{{ conversations.length }}</span>
      </div>
      <div
        v-for="c in conversations"
        :key="c.peerId"
        class="conv"
        :class="{ active: Number(peerId) === c.peerId }"
        @click="open(c.peerId)"
      >
        <div class="av">{{ (c.peer?.nickname || 'U').slice(0, 1) }}</div>
        <div class="conv-body">
          <div class="name-row">
            <span class="name">{{ c.peer?.nickname || '用户' + c.peerId }}</span>
            <el-badge v-if="c.unread" :value="c.unread" />
          </div>
          <div class="last">{{ c.lastMessage }}</div>
        </div>
      </div>
      <div v-if="!conversations.length" class="empty-box" style="padding: 36px 12px">
        <div class="empty-icon">💬</div>
        <p>暂无会话</p>
      </div>
    </div>

    <div class="card thread">
      <template v-if="peerId">
        <div class="thread-head"><span class="dot"></span><span>对话进行中</span></div>
        <div class="thread-body" ref="bodyRef">
          <div v-for="m in thread" :key="m.id" class="bubble-row" :class="{ mine: m.fromId === me }">
            <div class="bubble">
              <div class="text">{{ m.content }}</div>
              <div class="time">{{ formatTime(m.createdAt) }}</div>
            </div>
          </div>
        </div>
        <div v-if="fraudTip" class="fraud-tip">⚠️ {{ fraudTip }}</div>
        <div class="ai-drafts">
          <button type="button" @click="draft('ask_detail')">AI·问细节</button>
          <button type="button" @click="draft('bargain')">AI·议价</button>
          <button type="button" @click="draft('meet')">AI·约见面</button>
          <button type="button" @click="checkFraud">AI·防骗检测</button>
        </div>
        <div class="composer">
          <el-input
            v-model="text"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="输入消息，Enter 发送"
            @keydown.enter.exact.prevent="send"
          />
          <el-button type="primary" :loading="sending" @click="send">发送</el-button>
        </div>
      </template>
      <div v-else class="empty-box fill">
        <div class="empty-icon">👋</div>
        <p>选择左侧会话，或从商品页私信卖家</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const conversations = ref([])
const thread = ref([])
const text = ref('')
const sending = ref(false)
const bodyRef = ref(null)
const fraudTip = ref('')
const me = computed(() => auth.user?.id)
const peerId = computed(() => route.params.peerId)

function formatTime(t) { return new Date(t).toLocaleString() }
function open(id) { router.push(`/messages/${id}`) }
async function loadConversations() { conversations.value = await http.get('/messages/conversations') }
async function loadThread() {
  if (!peerId.value) { thread.value = []; return }
  thread.value = await http.get(`/messages/with/${peerId.value}`)
  await nextTick()
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  loadConversations()
  // auto scan last peer message
  const last = [...thread.value].reverse().find((m) => m.fromId !== me.value)
  if (last?.content) {
    const r = await http.post('/ai/fraud-check', { text: last.content })
    fraudTip.value = r.level === 'low' ? '' : r.advice
  } else fraudTip.value = ''
}
async function draft(intent) {
  const r = await http.post('/ai/message-draft', { intent, peerName: '同学' })
  text.value = r.draft
}
async function checkFraud() {
  const r = await http.post('/ai/fraud-check', { text: text.value || thread.value.slice(-1)[0]?.content || '' })
  fraudTip.value = r.advice
}
async function send() {
  if (!text.value.trim() || !peerId.value) return
  const check = await http.post('/ai/fraud-check', { text: text.value })
  if (check.level === 'high') {
    fraudTip.value = check.advice
  }
  sending.value = true
  try {
    await http.post('/messages', { toId: Number(peerId.value), content: text.value.trim() })
    text.value = ''
    await loadThread()
  } finally { sending.value = false }
}
watch(peerId, loadThread)
onMounted(async () => { await loadConversations(); await loadThread() })
</script>

<style scoped>
.messages {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  min-height: 640px;
  max-height: calc(100vh - 120px);
}
.sidebar { display: flex; flex-direction: column; overflow: hidden; }
.side-head {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.side-head h3 { margin: 0; font-size: 15px; font-weight: 750; }
.conv {
  display: flex; gap: 12px; padding: 12px 14px; cursor: pointer;
  border-bottom: 1px solid #f0f4f1; transition: background 0.12s;
}
.conv:hover, .conv.active { background: var(--primary-soft); }
.av {
  width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center;
  font-weight: 800; color: #fff; background: linear-gradient(135deg, #2f9e6b, #3b82f6); flex-shrink: 0;
}
.conv-body { flex: 1; min-width: 0; }
.name-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.name { font-weight: 700; font-size: 14px; }
.last { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread { display: flex; flex-direction: column; min-height: 560px; overflow: hidden; }
.thread-head {
  padding: 14px 18px; border-bottom: 1px solid var(--border); font-weight: 700;
  font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px;
}
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #2f9e6b;
  box-shadow: 0 0 0 4px rgba(47, 158, 107, 0.15);
}
.thread-body { flex: 1; padding: 18px; overflow: auto; background: #f7fbf8; }
.bubble-row { display: flex; margin-bottom: 12px; }
.bubble-row.mine { justify-content: flex-end; }
.bubble {
  max-width: 72%; padding: 12px 14px; border-radius: 16px 16px 16px 6px;
  background: #fff; border: 1px solid var(--border);
}
.bubble-row.mine .bubble {
  border-radius: 16px 16px 6px 16px;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
  border: none; color: #fff;
}
.text { white-space: pre-wrap; line-height: 1.55; font-size: 14px; }
.time { margin-top: 4px; font-size: 11px; opacity: 0.65; }
.ai-drafts {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 0; background: #fff;
  border-top: 1px solid var(--border);
}
.ai-drafts button {
  border: 1px solid var(--border); background: #f7fbf8; border-radius: 999px;
  padding: 4px 10px; font-size: 12px; cursor: pointer; color: var(--text-secondary);
}
.fraud-tip {
  margin: 0; padding: 8px 14px; background: #fff7ed; color: #c2410c; font-size: 12px;
  border-top: 1px solid #fed7aa;
}
.composer {
  padding: 12px 14px;
  display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: end; background: #fff;
}
.fill { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
@media (max-width: 800px) {
  .messages { grid-template-columns: 1fr; max-height: none; }
  .sidebar { max-height: 220px; overflow: auto; }
}
</style>
