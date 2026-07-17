<template>
  <div class="page">
    <div class="head">
      <h1 class="page-title">我的订单</h1>
      <el-radio-group v-model="role" @change="load">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="buyer">我买的</el-radio-button>
        <el-radio-button value="seller">我卖的</el-radio-button>
      </el-radio-group>
    </div>
    <div v-loading="loading" class="list">
      <div v-for="o in list" :key="o.id" class="card order">
        <div class="order-cover" :class="'tone-' + categoryMeta(o.item?.title).tone">
          <span>{{ categoryMeta(o.item?.title).emoji }}</span>
        </div>
        <div class="order-body">
          <div class="order-top">
            <h3>{{ o.item?.title || '商品' }}</h3>
            <span class="status-tag" :class="statusClass(o.status)">{{ statusLabel(o.status) }}</span>
          </div>
          <div class="price"><span class="yen">¥</span>{{ formatPrice(o.item?.price) }}</div>
          <p class="muted meta">
            订单 #{{ o.id }}
            <template v-if="o.meetPlace"> · 📍 {{ o.meetPlace }}</template>
            <template v-if="o.meetTime"> · 🕒 {{ o.meetTime }}</template>
          </p>
          <div class="ops">
            <el-button v-if="o.status === 'pending' && o.sellerId === me" type="primary" size="small" @click="agree(o)">确认约定</el-button>
            <el-button v-if="['pending', 'agreed'].includes(o.status)" type="success" size="small" plain @click="complete(o)">确认完成</el-button>
            <el-button v-if="['pending', 'agreed'].includes(o.status)" size="small" @click="cancel(o)">取消</el-button>
            <el-button v-if="o.status === 'completed'" type="warning" size="small" plain @click="review(o)">评价</el-button>
            <el-button size="small" text type="primary" @click="chat(o)">私信对方</el-button>
          </div>
        </div>
      </div>
      <div v-if="!loading && !list.length" class="empty-box card">
        <div class="empty-icon">📦</div>
        <p>暂无订单，去广场淘点好货吧</p>
        <el-button type="primary" @click="$router.push('/')">去逛逛</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { categoryMeta, formatPrice, statusLabel } from '../utils/display'

const auth = useAuthStore()
const router = useRouter()
const list = ref([])
const loading = ref(false)
const role = ref('')
const me = computed(() => auth.user?.id)
function statusClass(s) {
  return { pending: 'warn', agreed: 'ok', completed: 'ok', cancelled: 'muted' }[s] || ''
}
async function load() {
  loading.value = true
  try { list.value = await http.get('/orders', { params: { role: role.value || undefined } }) }
  finally { loading.value = false }
}
async function agree(o) {
  const { value: place } = await ElMessageBox.prompt('约定地点', '确认约定', { inputValue: '图书馆门口' })
  const { value: time } = await ElMessageBox.prompt('约定时间', '确认约定', { inputValue: '明天 18:00' })
  await http.patch(`/orders/${o.id}/status`, { status: 'agreed', meetPlace: place, meetTime: time })
  ElMessage.success('已确认约定'); load()
}
async function complete(o) {
  await ElMessageBox.confirm('确认双方已当面完成交易？')
  await http.patch(`/orders/${o.id}/status`, { status: 'completed' })
  ElMessage.success('交易完成'); load()
}
async function cancel(o) {
  await ElMessageBox.confirm('确认取消订单？')
  await http.patch(`/orders/${o.id}/status`, { status: 'cancelled' })
  ElMessage.success('已取消'); load()
}
async function review(o) {
  const { value: score } = await ElMessageBox.prompt('评分 1-5', '评价对方', {
    inputValue: '5', inputPattern: /^[1-5]$/, inputErrorMessage: '请输入 1-5',
  })
  const { value: content } = await ElMessageBox.prompt('评价内容（可选）', '评价对方', {
    inputPlaceholder: '靠谱 / 准时…',
  }).catch(() => ({ value: '' }))
  await http.post(`/orders/${o.id}/reviews`, { score: Number(score), content })
  ElMessage.success('评价成功')
}
function chat(o) {
  const peerId = o.buyerId === me.value ? o.sellerId : o.buyerId
  router.push(`/messages/${peerId}`)
}
onMounted(load)
</script>

<style scoped>
.head {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 8px;
}
.list { display: flex; flex-direction: column; gap: 14px; }
.order { display: flex; gap: 16px; padding: 16px; }
.order:hover { box-shadow: var(--shadow-lg); }
.order-cover {
  width: 88px; height: 88px; border-radius: 16px; display: grid; place-items: center;
  font-size: 34px; flex-shrink: 0;
}
.order-cover.tone-0 { background: #d1fae5; }
.order-cover.tone-1 { background: #dbeafe; }
.order-cover.tone-2 { background: #fce7f3; }
.order-cover.tone-3 { background: #ffedd5; }
.order-cover.tone-4 { background: #fef9c3; }
.order-cover.tone-5 { background: #e0e7ff; }
.order-body { flex: 1; min-width: 0; }
.order-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.order-top h3 { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.35; }
.meta { margin: 6px 0 12px; font-size: 13px; }
.ops { display: flex; flex-wrap: wrap; gap: 8px; }
@media (max-width: 560px) {
  .order { flex-direction: column; }
  .order-cover { width: 100%; height: 100px; }
}
</style>
