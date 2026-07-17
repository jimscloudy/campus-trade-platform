<template>
  <div class="page">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">🎓 同校可信 · 当面交易</div>
        <h1>校园闲置，就近成交<br />把需要变成拥有</h1>
        <p>教材转手、数码置换、宿舍好物——在熟悉的校园里完成靠谱交易。</p>
        <div class="hero-stats">
          <div class="stat"><strong>{{ total || '—' }}</strong><span>在售好物</span></div>
          <div class="stat"><strong>{{ categories.length || '—' }}</strong><span>热门分类</span></div>
          <div class="stat"><strong>当面</strong><span>验货更安心</span></div>
        </div>
      </div>
    </section>

    <div class="card search-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="普通搜索，或点右侧 AI 智能搜"
        clearable
        size="large"
        style="flex: 1; min-width: 180px"
        @keyup.enter="search"
      />
      <el-select v-model="filters.categoryId" clearable placeholder="全部分类" size="large" style="width: 140px">
        <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="filters.campus" clearable placeholder="全部校区" size="large" style="width: 130px">
        <el-option label="主校区" value="主校区" />
        <el-option label="东校区" value="东校区" />
        <el-option label="西校区" value="西校区" />
      </el-select>
      <el-button type="primary" size="large" @click="search">搜索</el-button>
      <el-button size="large" @click="aiSearch" :loading="aiSearching">AI 智能搜</el-button>
      <el-button size="large" @click="reset">重置</el-button>
    </div>
    <div v-if="aiHint" class="ai-hint">🤖 {{ aiHint }}</div>

    <div v-if="categories.length" class="cat-row">
      <button type="button" class="cat-pill" :class="{ active: !filters.categoryId }" @click="pickCategory(undefined)">全部</button>
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        class="cat-pill"
        :class="{ active: filters.categoryId === c.id }"
        @click="pickCategory(c.id)"
      >
        <span>{{ categoryMeta(c.name).emoji }}</span>{{ c.name }}
      </button>
    </div>

    <div class="section-head">
      <h2>精选闲置</h2>
      <span class="count" v-if="!loading">共 {{ total }} 件</span>
    </div>

    <div v-loading="loading" class="grid-items">
      <div v-for="item in list" :key="item.id" class="card item-card" @click="go(item.id)">
        <div class="item-cover" :class="'tone-' + categoryMeta(item.category?.name).tone">
          <img v-if="item.images?.[0]" :src="item.images[0]" class="cover-img" alt="" />
          <template v-else>
            <span class="emoji">{{ categoryMeta(item.category?.name).emoji }}</span>
            <span class="cat-label">{{ item.category?.name || '闲置' }}</span>
          </template>
        </div>
        <div class="item-body">
          <h3 class="item-title">{{ item.title }}</h3>
          <div class="price"><span class="yen">¥</span>{{ formatPrice(item.price) }}</div>
          <div class="item-meta">
            <span class="chip">📍 {{ item.campus }}</span>
            <span>{{ conditionLabel(item.condition) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !list.length" class="empty-box card">
      <div class="empty-icon">📭</div>
      <p>还没有符合条件的商品</p>
      <el-button type="primary" @click="$router.push('/publish')">去发布第一件</el-button>
    </div>

    <div v-if="total > pageSize" class="pager">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        v-model:current-page="page"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import { categoryMeta, conditionLabel, formatPrice } from '../utils/display'

const router = useRouter()
const list = ref([])
const categories = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 12
const filters = reactive({ keyword: '', categoryId: undefined, campus: '', minPrice: undefined, maxPrice: undefined })
const aiSearching = ref(false)
const aiHint = ref('')

function go(id) { router.push(`/items/${id}`) }
function search() { page.value = 1; load() }
function pickCategory(id) { filters.categoryId = id; search() }
function reset() {
  filters.keyword = ''
  filters.categoryId = undefined
  filters.campus = ''
  filters.minPrice = undefined
  filters.maxPrice = undefined
  aiHint.value = ''
  page.value = 1
  load()
}

async function aiSearch() {
  const q = filters.keyword || '推荐一些在售闲置'
  aiSearching.value = true
  try {
    const s = await http.post('/ai/nl-search', { query: q })
    filters.keyword = s.filters?.keyword || ''
    filters.categoryId = s.filters?.categoryId
    filters.campus = s.filters?.campus || ''
    filters.minPrice = s.filters?.minPrice
    filters.maxPrice = s.filters?.maxPrice
    list.value = s.list || []
    total.value = s.total || 0
    page.value = 1
    aiHint.value = `智能理解：${JSON.stringify(s.filters)}，命中 ${s.total} 件`
  } finally {
    aiSearching.value = false
  }
}
async function load() {
  loading.value = true
  try {
    const data = await http.get('/items', { params: { ...filters, page: page.value, pageSize } })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  categories.value = await http.get('/items/categories')
  await load()
})
</script>

<style scoped>
.cat-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.cat-pill {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 550;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.cat-pill.active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 6px 16px rgba(47, 158, 107, 0.25);
}
.pager { margin-top: 28px; display: flex; justify-content: center; }
.ai-hint {
  margin: -8px 0 14px;
  font-size: 13px;
  color: var(--primary-dark);
  background: var(--primary-soft);
  border: 1px solid #c7e6d5;
  border-radius: 10px;
  padding: 8px 12px;
}
.item-cover { position: relative; overflow: hidden; }
.cover-img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
</style>
