<template>
  <div class="page narrow">
    <div class="head">
      <h1 class="page-title">消息通知</h1>
      <el-button v-if="list.length" @click="readAll">全部已读</el-button>
    </div>
    <div v-loading="loading" class="list">
      <div
        v-for="n in list"
        :key="n.id"
        class="card row"
        :class="{ unread: !n.read }"
        @click="open(n)"
      >
        <div class="dot" v-if="!n.read"></div>
        <div class="body">
          <div class="title-row">
            <strong>{{ n.title }}</strong>
            <span class="muted">{{ formatTime(n.createdAt) }}</span>
          </div>
          <p>{{ n.content }}</p>
        </div>
      </div>
      <div v-if="!loading && !list.length" class="empty-box card">
        <div class="empty-icon">🔔</div>
        <p>暂无通知</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'

const router = useRouter()
const list = ref([])
const loading = ref(false)

function formatTime(t) {
  return new Date(t).toLocaleString()
}

async function load() {
  loading.value = true
  try {
    const data = await http.get('/notifications')
    list.value = data.list
  } finally {
    loading.value = false
  }
}

async function readAll() {
  await http.post('/notifications/read', {})
  await load()
}

async function open(n) {
  if (!n.read) await http.post('/notifications/read', { id: n.id })
  if (n.link) router.push(n.link)
  else load()
}

onMounted(load)
</script>

<style scoped>
.narrow { max-width: 720px; }
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.list { display: flex; flex-direction: column; gap: 10px; }
.row {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  position: relative;
}
.row.unread {
  background: linear-gradient(90deg, #e7f7ef, #fff);
  border-color: #c7e6d5;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  margin-top: 8px;
  flex-shrink: 0;
}
.body { flex: 1; min-width: 0; }
.title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}
.body p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}
</style>
