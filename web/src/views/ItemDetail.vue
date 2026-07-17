<template>
  <div class="page" v-loading="loading">
    <div v-if="item" class="detail-wrap">
      <div class="card gallery">
        <template v-if="item.images?.length">
          <img :src="item.images[activeImg]" class="main-img" alt="" />
          <div class="thumbs" v-if="item.images.length > 1">
            <img
              v-for="(u, i) in item.images"
              :key="u"
              :src="u"
              :class="{ on: i === activeImg }"
              @click="activeImg = i"
              alt=""
            />
          </div>
        </template>
        <template v-else>
          <div class="placeholder" :class="'tone-' + meta.tone">
            <span class="big-emoji">{{ meta.emoji }}</span>
            <span class="pill">{{ item.category?.name || '闲置' }}</span>
          </div>
        </template>
      </div>

      <div class="card info">
        <div class="top-row">
          <span class="status-tag" :class="item.status === 'on_sale' ? 'ok' : 'muted'">
            {{ statusLabel(item.status) }}
          </span>
          <span class="muted">{{ conditionLabel(item.condition) }} · {{ item.campus }}</span>
        </div>
        <h1>{{ item.title }}</h1>
        <div class="price-row">
          <div class="price"><span class="yen">¥</span>{{ formatPrice(item.price) }}</div>
          <el-button :type="favorited ? 'warning' : 'default'" round @click="toggleFav">
            {{ favorited ? '已收藏' : '收藏' }}
          </el-button>
        </div>

        <div class="block">
          <h3>商品描述</h3>
          <p class="desc">{{ item.description }}</p>
        </div>

        <div class="seller" v-if="item.seller">
          <div class="seller-av">{{ item.seller.nickname?.[0] || '卖' }}</div>
          <div class="seller-info">
            <strong>{{ item.seller.nickname }}</strong>
            <span>信用 {{ item.seller.creditScore }} · {{ item.seller.campus }}</span>
          </div>
          <el-dropdown v-if="!isMine && auth.isLogin" trigger="click">
            <el-button round>更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="chat">私信</el-dropdown-item>
                <el-dropdown-item @click="reportItem">举报商品</el-dropdown-item>
                <el-dropdown-item @click="blockSeller">屏蔽卖家</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="actions" v-if="item.status === 'on_sale'">
          <el-button v-if="!isMine" type="primary" size="large" class="main-btn" @click="want">我想要</el-button>
          <el-button v-if="!isMine" size="large" @click="offer">议价</el-button>
          <el-button v-if="!isMine" size="large" @click="aiBargain">AI 议价话术</el-button>
          <el-button v-if="!isMine" size="large" @click="chat">聊一聊</el-button>
          <el-button v-if="isMine" type="danger" plain size="large" @click="off">下架商品</el-button>
        </div>

        <div v-if="auth.isLogin && offers.length" class="offers">
          <h3>议价记录</h3>
          <div v-for="o in offers" :key="o.id" class="offer-row">
            <div>
              <strong>¥{{ formatPrice(o.price) }}</strong>
              <span class="muted"> · {{ o.status }} · {{ o.message || '无留言' }}</span>
            </div>
            <div v-if="isMine && o.status === 'pending'" class="ops">
              <el-button size="small" type="primary" @click="respond(o, 'accepted')">接受</el-button>
              <el-button size="small" @click="respond(o, 'rejected')">拒绝</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { categoryMeta, conditionLabel, formatPrice, statusLabel } from '../utils/display'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const item = ref(null)
const loading = ref(false)
const favorited = ref(false)
const offers = ref([])
const activeImg = ref(0)
const isMine = computed(() => auth.user && item.value && auth.user.id === item.value.sellerId)
const meta = computed(() => categoryMeta(item.value?.category?.name))

async function load() {
  loading.value = true
  try {
    item.value = await http.get(`/items/${route.params.id}`)
    activeImg.value = 0
    if (auth.isLogin) {
      const f = await http.get(`/favorites/${item.value.id}`)
      favorited.value = f.favorited
      offers.value = await http.get(`/items/${item.value.id}/offers`)
    }
  } finally {
    loading.value = false
  }
}

function ensureLogin() {
  if (!auth.isLogin) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return false
  }
  return true
}

async function toggleFav() {
  if (!ensureLogin()) return
  if (favorited.value) {
    await http.delete(`/favorites/${item.value.id}`)
    favorited.value = false
    ElMessage.success('已取消收藏')
  } else {
    await http.post(`/favorites/${item.value.id}`)
    favorited.value = true
    ElMessage.success('已收藏')
  }
}

async function want() {
  if (!ensureLogin()) return
  const { value } = await ElMessageBox.prompt('给卖家留言（可选）', '发起购买意向', {
    confirmButtonText: '提交',
    cancelButtonText: '取消',
    inputPlaceholder: '希望什么时候当面交易？',
  }).catch(() => ({ value: null }))
  if (value === null) return
  await http.post('/orders', { itemId: item.value.id, remark: value || undefined })
  ElMessage.success('已发起订单')
  router.push('/orders')
}

async function offer() {
  if (!ensureLogin()) return
  const { value: price } = await ElMessageBox.prompt('你的出价（元）', '议价', {
    inputPattern: /^\d+(\.\d{1,2})?$/,
    inputErrorMessage: '请输入有效金额',
    inputValue: String(item.value.price),
  }).catch(() => ({ value: null }))
  if (price == null) return
  const { value: message } = await ElMessageBox.prompt('留言（可选）', '议价', {
    inputPlaceholder: '诚心想要，可小刀…',
  }).catch(() => ({ value: '' }))
  await http.post(`/items/${item.value.id}/offers`, { price: Number(price), message })
  ElMessage.success('议价已发送')
  offers.value = await http.get(`/items/${item.value.id}/offers`)
}

async function aiBargain() {
  const r = await http.post('/ai/bargain', {
    title: item.value.title,
    listPrice: item.value.price,
    role: isMine.value ? 'seller' : 'buyer',
  })
  await ElMessageBox.alert(`${r.tip}\n\n建议出价：¥${r.suggestOffer}\n\n话术：\n${r.script}`, 'AI 议价助手')
}

async function respond(o, status) {
  await http.patch(`/offers/${o.id}`, { status })
  ElMessage.success(status === 'accepted' ? '已接受' : '已拒绝')
  offers.value = await http.get(`/items/${item.value.id}/offers`)
}

function chat() {
  if (!ensureLogin()) return
  router.push(`/messages/${item.value.sellerId}`)
}

async function reportItem() {
  if (!ensureLogin()) return
  const { value } = await ElMessageBox.prompt('举报原因', '举报商品', {
    inputPlaceholder: '虚假信息 / 违禁 / 骚扰…',
  }).catch(() => ({ value: null }))
  if (!value) return
  await http.post('/reports', { targetType: 'item', targetId: item.value.id, reason: value })
  ElMessage.success('已提交举报')
}

async function blockSeller() {
  if (!ensureLogin()) return
  await ElMessageBox.confirm('屏蔽后将无法与对方交易/私信（议价会拦截）')
  await http.post(`/blocks/${item.value.sellerId}`)
  ElMessage.success('已屏蔽')
}

async function off() {
  await ElMessageBox.confirm('确认下架该商品？', '提示')
  await http.delete(`/items/${item.value.id}`)
  ElMessage.success('已下架')
  load()
}

onMounted(load)
</script>

<style scoped>
.detail-wrap { display: grid; grid-template-columns: 1.05fr 1fr; gap: 18px; align-items: start; }
.gallery { overflow: hidden; min-height: 360px; }
.main-img { width: 100%; height: 360px; object-fit: cover; display: block; background: #f3f8f4; }
.thumbs { display: flex; gap: 8px; padding: 10px; overflow-x: auto; }
.thumbs img {
  width: 56px; height: 56px; object-fit: cover; border-radius: 8px; cursor: pointer;
  border: 2px solid transparent; opacity: 0.75;
}
.thumbs img.on { border-color: var(--primary); opacity: 1; }
.placeholder {
  min-height: 360px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 14px;
}
.placeholder.tone-0 { background: linear-gradient(160deg, #d1fae5, #6ee7b7); }
.placeholder.tone-1 { background: linear-gradient(160deg, #dbeafe, #93c5fd); }
.placeholder.tone-2 { background: linear-gradient(160deg, #fce7f3, #f9a8d4); }
.placeholder.tone-3 { background: linear-gradient(160deg, #ffedd5, #fdba74); }
.placeholder.tone-4 { background: linear-gradient(160deg, #fef9c3, #fde047); }
.placeholder.tone-5 { background: linear-gradient(160deg, #e0e7ff, #a5b4fc); }
.big-emoji { font-size: 88px; line-height: 1; }
.pill {
  font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 999px;
  background: rgba(255,255,255,0.8);
}
.info { padding: 28px; }
.top-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.info h1 { margin: 0 0 12px; font-size: 26px; font-weight: 800; line-height: 1.3; }
.price-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px dashed var(--border);
}
.price { font-size: 32px; }
.block h3 { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: var(--muted); }
.desc { margin: 0; line-height: 1.75; white-space: pre-wrap; color: var(--text-secondary); font-size: 15px; }
.seller {
  display: flex; align-items: center; gap: 12px; margin: 22px 0; padding: 14px;
  border-radius: 16px; background: var(--primary-soft); border: 1px solid #c7e6d5;
}
.seller-av {
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
  font-weight: 800; color: #fff; background: linear-gradient(135deg, #2f9e6b, #3b82f6); flex-shrink: 0;
}
.seller-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.seller-info strong { font-size: 15px; }
.seller-info span { font-size: 12px; color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.main-btn { flex: 1; min-width: 140px; }
.offers { margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--border); }
.offers h3 { margin: 0 0 10px; font-size: 14px; }
.offer-row {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px dashed var(--border); font-size: 13px;
}
.ops { display: flex; gap: 6px; }
@media (max-width: 800px) {
  .detail-wrap { grid-template-columns: 1fr; }
  .main-img, .placeholder { min-height: 240px; height: 240px; }
  .info { padding: 20px; }
  .info h1 { font-size: 22px; }
}
</style>
