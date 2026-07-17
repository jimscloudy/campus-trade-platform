<template>
  <div class="page">
    <section class="hole-hero card">
      <div>
        <div class="badge">🌳 匿名树洞</div>
        <h1>把心里话放进树洞</h1>
        <p>吐槽、求助、分享小确幸。默认匿名，安心说说校园里的故事。</p>
      </div>
      <el-button type="primary" size="large" @click="showComposer = true">我要说两句</el-button>
    </section>

    <div class="mood-row">
      <button
        v-for="m in moods"
        :key="m"
        type="button"
        class="mood-pill"
        :class="{ active: moodFilter === m }"
        @click="toggleMood(m)"
      >
        {{ m }}
      </button>
    </div>

    <div v-loading="loading" class="feed">
      <article v-for="p in filtered" :key="p.id" class="card post">
        <div class="post-head">
          <div class="avatar">{{ (p.nickname || '匿')[0] }}</div>
          <div>
            <strong>{{ p.nickname || '匿名同学' }}</strong>
            <div class="meta">
              <span class="mood-tag">{{ p.mood }}</span>
              <span>{{ formatTime(p.createdAt) }}</span>
            </div>
          </div>
        </div>
        <p class="content">{{ p.content }}</p>
        <div class="post-actions">
          <button type="button" class="act" @click="like(p)">💚 {{ p.likeCount || 0 }}</button>
          <button type="button" class="act" @click="toggleComments(p)">💬 {{ p.commentCount || 0 }}</button>
        </div>

        <div v-if="openId === p.id" class="comments">
          <div v-for="c in commentsMap[p.id] || []" :key="c.id" class="comment">
            <strong>{{ c.nickname || '匿名回复' }}</strong>
            <span>{{ c.content }}</span>
          </div>
          <div v-if="!(commentsMap[p.id] || []).length" class="muted empty-c">还没有回复，来第一条吧</div>
          <div class="reply-row">
            <el-input v-model="replyText[p.id]" placeholder="友善回复…" @keyup.enter="sendComment(p)" />
            <el-button @click="aiComfort(p)">AI 疏导</el-button>
            <el-button type="primary" @click="sendComment(p)">回复</el-button>
          </div>
        </div>
      </article>

      <div v-if="!loading && !filtered.length" class="empty-box card">
        <div class="empty-icon">🌱</div>
        <p>树洞还很安静，来发第一条吧</p>
        <el-button type="primary" @click="showComposer = true">打开树洞</el-button>
      </div>
    </div>

    <el-dialog v-model="showComposer" title="投递到树洞" width="520px">
      <el-form label-position="top">
        <el-form-item label="心情标签">
          <el-select v-model="form.mood" style="width: 100%">
            <el-option v-for="m in moods.slice(1)" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            maxlength="1000"
            show-word-limit
            placeholder="想说点什么？默认匿名发布"
          />
        </el-form-item>
        <el-form-item label="匿名昵称（可选）">
          <el-input v-model="form.nickname" maxlength="16" placeholder="不填则随机生成" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showComposer = false">取消</el-button>
        <el-button type="primary" :loading="posting" @click="submit">匿名发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const list = ref([])
const loading = ref(false)
const posting = ref(false)
const showComposer = ref(false)
const moodFilter = ref('全部')
const moods = ['全部', '心情', '吐槽', '治愈', '求助', '表白', '寻物']
const openId = ref(null)
const commentsMap = reactive({})
const replyText = reactive({})
const form = reactive({ content: '', mood: '心情', nickname: '' })

const filtered = computed(() => {
  if (moodFilter.value === '全部') return list.value
  return list.value.filter((p) => p.mood === moodFilter.value)
})

function formatTime(t) {
  return new Date(t).toLocaleString()
}
function toggleMood(m) {
  moodFilter.value = m
}
function ensureLogin() {
  if (!auth.isLogin) {
    router.push({ path: '/login', query: { redirect: '/treehole' } })
    return false
  }
  return true
}

async function load() {
  loading.value = true
  try {
    const data = await http.get('/treehole', { params: { pageSize: 50 } })
    list.value = data.list
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!ensureLogin()) return
  if (!form.content.trim()) {
    ElMessage.warning('写点内容再发布吧')
    return
  }
  const mod = await http.post('/ai/moderate', { content: form.content })
  if (!mod.pass) {
    ElMessage.error(mod.reason || '内容未通过审核')
    return
  }
  posting.value = true
  try {
    await http.post('/treehole', {
      content: form.content.trim(),
      mood: form.mood,
      anonymous: true,
      nickname: form.nickname || undefined,
    })
    ElMessage.success('已投进树洞')
    showComposer.value = false
    form.content = ''
    form.nickname = ''
    await load()
  } finally {
    posting.value = false
  }
}

async function aiComfort(p) {
  const r = await http.post('/ai/treehole-comfort', { content: p.content })
  replyText[p.id] = r.reply
  if (r.risky) ElMessage.warning('检测到高风险情绪表达，已附上关怀回复建议')
  else ElMessage.success('已生成疏导回复，可修改后发送')
}

async function like(p) {
  const updated = await http.post(`/treehole/${p.id}/like`)
  p.likeCount = updated.likeCount
}

async function toggleComments(p) {
  if (openId.value === p.id) {
    openId.value = null
    return
  }
  openId.value = p.id
  if (!commentsMap[p.id]) {
    commentsMap[p.id] = await http.get(`/treehole/${p.id}/comments`)
  }
}

async function sendComment(p) {
  if (!ensureLogin()) return
  const text = (replyText[p.id] || '').trim()
  if (!text) return
  const c = await http.post(`/treehole/${p.id}/comments`, {
    content: text,
    anonymous: true,
  })
  commentsMap[p.id] = [...(commentsMap[p.id] || []), c]
  replyText[p.id] = ''
  p.commentCount = Number(p.commentCount || 0) + 1
  ElMessage.success('已回复')
}

onMounted(load)
</script>

<style scoped>
.hole-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px 26px;
  margin-bottom: 16px;
  background:
    radial-gradient(circle at 90% 20%, rgba(59, 130, 246, 0.12), transparent 30%),
    linear-gradient(120deg, #e7f7ef, #eaf2ff 55%, #fff7e8);
}
.badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary-dark);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #c7e6d5;
  border-radius: 999px;
  padding: 4px 10px;
  margin-bottom: 10px;
}
.hole-hero h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
}
.hole-hero p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}
.mood-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.mood-pill {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
}
.mood-pill.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 700;
}
.feed {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.post { padding: 18px 18px 14px; }
.post-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
}
.meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}
.mood-tag {
  background: var(--warm-soft);
  color: #b45309;
  padding: 1px 8px;
  border-radius: 999px;
  font-weight: 650;
}
.content {
  margin: 0 0 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--text-secondary);
  font-size: 15px;
}
.post-actions {
  display: flex;
  gap: 8px;
  border-top: 1px dashed var(--border);
  padding-top: 10px;
}
.act {
  border: none;
  background: #f3f8f4;
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.act:hover { background: var(--primary-soft); color: var(--primary-dark); }
.comments {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.comment {
  background: #f7fbf8;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.comment strong { color: var(--primary-dark); }
.reply-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 4px;
}
.empty-c { font-size: 13px; padding: 4px 0 6px; }
@media (max-width: 640px) {
  .hole-hero { flex-direction: column; align-items: flex-start; }
}
</style>
