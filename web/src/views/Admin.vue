<template>
  <div class="admin-wrap">
    <aside class="admin-side">
      <div class="side-brand">
        <span class="logo">🛠</span>
        <div>
          <strong>运营控制台</strong>
          <small>Campus Admin</small>
        </div>
      </div>
      <nav class="side-menu">
        <button
          v-for="m in menus"
          :key="m.key"
          type="button"
          class="menu-item"
          :class="{ active: tab === m.key }"
          @click="tab = m.key"
        >
          <span class="ico">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
          <em v-if="m.key === 'reports' && stats.pendingReports" class="badge">{{ stats.pendingReports }}</em>
        </button>
      </nav>
      <div class="side-foot">
        <div class="muted">登录身份</div>
        <div class="admin-user">{{ auth.user?.nickname || '管理员' }}</div>
        <el-button size="small" type="danger" plain @click="logoutAdmin">退出后台</el-button>
        <el-button size="small" link @click="openFront">打开用户前台 ↗</el-button>
      </div>
    </aside>

    <section class="admin-main">
      <header class="admin-top">
        <div>
          <h1>{{ currentMenu?.label || '控制台' }}</h1>
          <p class="muted">{{ currentMenu?.desc }}</p>
        </div>
        <div class="top-actions">
          <el-button @click="refreshAll" :loading="loading">刷新数据</el-button>
        </div>
      </header>

      <!-- 总览 -->
      <div v-show="tab === 'dashboard'" class="pane">
        <div class="kpi-grid">
          <div class="kpi card" v-for="k in kpis" :key="k.label">
            <div class="kpi-ico" :style="{ background: k.bg }">{{ k.icon }}</div>
            <div>
              <div class="kpi-val">{{ k.value }}</div>
              <div class="kpi-label">{{ k.label }}</div>
            </div>
          </div>
        </div>

        <div class="two-col">
          <div class="card block">
            <div class="block-hd">
              <h3>运营提示</h3>
              <el-button link type="primary" @click="loadAi">刷新 AI</el-button>
            </div>
            <div v-if="reportSum" class="summary">{{ reportSum.summary }}</div>
            <ul class="tip-list" v-if="insights?.tips?.length">
              <li v-for="(t, i) in insights.tips" :key="i">{{ t }}</li>
            </ul>
            <div v-else class="empty-sm">暂无洞察数据</div>
          </div>

          <div class="card block">
            <div class="block-hd">
              <h3>校区在售分布</h3>
            </div>
            <div v-if="campusBars.length" class="bars">
              <div v-for="c in campusBars" :key="c.name" class="bar-row">
                <span class="bar-name">{{ c.name }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: c.pct + '%' }"></div>
                </div>
                <span class="bar-num">{{ c.count }}</span>
              </div>
            </div>
            <div v-else class="empty-sm">暂无分布数据</div>
            <div class="meta-line" v-if="insights">
              在售均价约 <strong>¥{{ insights.avgPrice || 0 }}</strong>
              · 订单 {{ insights.orders || 0 }} 笔
            </div>
          </div>
        </div>

        <div class="card block">
          <div class="block-hd">
            <h3>待办速览</h3>
          </div>
          <div class="todo-grid">
            <button type="button" class="todo" @click="tab = 'reports'">
              <strong>{{ stats.pendingReports || 0 }}</strong>
              <span>待处理举报</span>
            </button>
            <button type="button" class="todo" @click="tab = 'items'">
              <strong>{{ insights?.itemsOnSale || 0 }}</strong>
              <span>在售商品</span>
            </button>
            <button type="button" class="todo" @click="tab = 'models'">
              <strong>{{ modelInfo.hasActiveKey ? 'OK' : '!' }}</strong>
              <span>{{ modelInfo.hasActiveKey ? 'AI 已配置' : 'AI 待配置' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 大模型 -->
      <div v-show="tab === 'models'" class="pane">
        <div class="card block">
          <div class="block-hd">
            <div>
              <h3>模型通道</h3>
              <p class="muted sm">
                当前：<b>{{ modelInfo.activeName || '-' }}</b>
                · {{ modelInfo.activeModel || '-' }}
              </p>
            </div>
            <div class="ops">
              <el-button type="primary" @click="openCreate">+ 新增通道</el-button>
              <el-button @click="loadModels">刷新</el-button>
            </div>
          </div>

          <div v-if="!modelInfo.hasActiveKey" class="alert">
            当前通道尚未填写 API Key。请点「编辑」保存密钥后，再点「测试连通」。
          </div>

          <el-table :data="modelInfo.providers || []" stripe style="width: 100%" empty-text="暂无通道">
            <el-table-column label="通道" min-width="140">
              <template #default="{ row }">
                <div class="cell-title">
                  {{ row.name }}
                  <el-tag v-if="row.active" size="small" type="success">使用中</el-tag>
                  <el-tag v-if="!row.hasKey" size="small" type="warning">无 Key</el-tag>
                </div>
                <div class="cell-sub">{{ row.id }}</div>
              </template>
            </el-table-column>
            <el-table-column label="模型" min-width="160">
              <template #default="{ row }">
                <div>{{ row.model }}</div>
                <div class="cell-sub">强力 {{ row.modelStrong }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="baseUrl" label="Base URL" min-width="200" show-overflow-tooltip />
            <el-table-column label="Key" width="140">
              <template #default="{ row }">
                <code class="key">{{ row.keyMasked }}</code>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button v-if="!row.active" link type="primary" @click="switchModel(row)">启用</el-button>
                <el-button link type="success" @click="pingOne(row)">测试</el-button>
                <el-button link @click="openEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="removeOne(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="pingResult" class="ping" :class="{ ok: pingResult.ok }">
            <template v-if="pingResult.ok">
              连通成功 · {{ pingResult.providerName }}（{{ pingResult.model }}）
              <span v-if="pingResult.sample"> · {{ pingResult.sample }}</span>
            </template>
            <template v-else>连通失败 · {{ pingResult.reason }}</template>
          </div>
        </div>
      </div>

      <!-- 举报 -->
      <div v-show="tab === 'reports'" class="pane">
        <div class="card block">
          <div class="block-hd">
            <h3>举报工单</h3>
            <el-radio-group v-model="reportFilter" size="small" @change="filterReports">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="pending">待处理</el-radio-button>
              <el-radio-button value="resolved">已处理</el-radio-button>
              <el-radio-button value="rejected">已驳回</el-radio-button>
            </el-radio-group>
          </div>
          <el-table :data="filteredReports" stripe empty-text="暂无举报">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="对象" width="140">
              <template #default="{ row }">{{ row.targetType }} #{{ row.targetId }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button link type="primary" @click="handleReport(row, 'resolved')">处理并下架</el-button>
                  <el-button link @click="handleReport(row, 'rejected')">驳回</el-button>
                </template>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 商品 -->
      <div v-show="tab === 'items'" class="pane">
        <div class="card block">
          <div class="block-hd">
            <h3>商品管理</h3>
            <el-input v-model="itemKeyword" placeholder="搜索标题" clearable style="width: 220px" />
          </div>
          <el-table :data="filteredItems" stripe empty-text="暂无商品">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
            <el-table-column label="价格" width="100">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
            <el-table-column prop="campus" label="校区" width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'on_sale' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sellerId" label="卖家" width="80" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="$router.push(`/items/${row.id}`)">查看</el-button>
                <el-button
                  v-if="row.status === 'on_sale'"
                  link
                  type="danger"
                  @click="offItem(row)"
                >下架</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 分类 -->
      <div v-show="tab === 'cats'" class="pane">
        <div class="card block">
          <div class="block-hd">
            <h3>分类管理</h3>
          </div>
          <div class="cat-form">
            <el-input v-model="catName" placeholder="新分类名称" style="max-width: 260px" />
            <el-button type="primary" @click="addCat">添加分类</el-button>
          </div>
          <el-table :data="categories" stripe empty-text="暂无分类">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="sort" label="排序" width="100" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="danger" @click="delCat(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 洞察全文 -->
      <div v-show="tab === 'insights'" class="pane">
        <div class="two-col">
          <div class="card block">
            <div class="block-hd"><h3>AI 举报摘要</h3></div>
            <p>{{ reportSum?.summary || '暂无' }}</p>
            <ul v-if="reportSum?.samples?.length">
              <li v-for="(s, i) in reportSum.samples" :key="i">{{ s }}</li>
            </ul>
          </div>
          <div class="card block">
            <div class="block-hd"><h3>平台指标</h3></div>
            <div class="metric" v-if="insights">
              <div><span>用户</span><b>{{ insights.users }}</b></div>
              <div><span>在售</span><b>{{ insights.itemsOnSale }}</b></div>
              <div><span>商品总数</span><b>{{ insights.itemsTotal }}</b></div>
              <div><span>订单</span><b>{{ insights.orders }}</b></div>
              <div><span>树洞</span><b>{{ insights.treehole }}</b></div>
              <div><span>待处理举报</span><b>{{ insights.pendingReports }}</b></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <el-dialog v-model="dlgVisible" :title="dlgMode === 'create' ? '新增模型通道' : '编辑模型通道'" width="620px" destroy-on-close>
      <el-form label-position="top" class="dlg-form">
        <el-form-item v-if="dlgMode === 'create'" label="通道 ID（英文）">
          <el-input v-model="form.id" placeholder="例如 openai2" />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="form.name" placeholder="例如 OpenAI 中转" />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="form.baseUrl" placeholder="https://api.hualong.online/v1" />
        </el-form-item>
        <el-form-item :label="dlgMode === 'edit' ? 'API Key（留空不修改）' : 'API Key'">
          <el-input v-model="form.apiKey" type="password" show-password :placeholder="dlgMode === 'edit' ? '不改请留空' : 'sk-xxxx'" />
        </el-form-item>
        <div class="model-pick-bar">
          <span class="muted">模型列表</span>
          <el-button size="small" type="primary" plain :loading="loadingModels" @click="fetchModels">
            从中转站拉取可用模型
          </el-button>
        </div>
        <p v-if="modelsHint" class="models-hint">{{ modelsHint }}</p>
        <div class="form-2">
          <el-form-item label="默认模型（快速）">
            <el-select
              v-model="form.model"
              filterable
              allow-create
              default-first-option
              placeholder="选择或输入模型名"
              style="width: 100%"
            >
              <el-option v-for="m in modelOptions" :key="'f-' + m" :label="m" :value="m" />
            </el-select>
          </el-form-item>
          <el-form-item label="强力模型">
            <el-select
              v-model="form.modelStrong"
              filterable
              allow-create
              default-first-option
              placeholder="选择或输入模型名"
              style="width: 100%"
            >
              <el-option v-for="m in modelOptions" :key="'s-' + m" :label="m" :value="m" />
            </el-select>
          </el-form-item>
        </div>
        <div class="quick-models" v-if="quickPicks.length">
          <span class="muted">快捷：</span>
          <el-tag
            v-for="m in quickPicks"
            :key="m"
            class="qtag"
            effect="plain"
            style="cursor: pointer"
            @click="form.model = m"
          >{{ m }}</el-tag>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const tab = ref('dashboard')

function openFront() {
  window.open('/', '_blank')
}
function logoutAdmin() {
  auth.logout()
  router.replace('/login?redirect=/admin')
}
const menus = [
  { key: 'dashboard', label: '数据总览', icon: '📊', desc: '平台核心指标与待办' },
  { key: 'models', label: '大模型配置', icon: '🤖', desc: '通道、Key、连通测试' },
  { key: 'reports', label: '举报处理', icon: '🚩', desc: '审核用户举报工单' },
  { key: 'items', label: '商品管理', icon: '🛒', desc: '查看与下架商品' },
  { key: 'cats', label: '分类管理', icon: '📁', desc: '维护商品分类' },
  { key: 'insights', label: 'AI 洞察', icon: '✨', desc: '摘要与运营建议' },
]
const currentMenu = computed(() => menus.find((m) => m.key === tab.value))

const stats = ref({})
const reports = ref([])
const items = ref([])
const categories = ref([])
const catName = ref('')
const insights = ref(null)
const reportSum = ref(null)
const modelInfo = ref({ providers: [], hasActiveKey: false })
const pingResult = ref(null)
const reportFilter = ref('all')
const itemKeyword = ref('')

const dlgVisible = ref(false)
const dlgMode = ref('edit')
const saving = ref(false)
const loadingModels = ref(false)
const modelOptions = ref([])
const modelsHint = ref('')
const form = reactive({
  id: '',
  name: '',
  baseUrl: 'https://api.hualong.online/v1',
  model: '',
  modelStrong: '',
  apiKey: '',
})

const quickPicks = computed(() => {
  const prefer = ['gpt-5.6', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'grok-4.5', 'gpt-4o', 'gpt-4o-mini']
  const set = new Set(modelOptions.value || [])
  return prefer.filter((m) => set.has(m) || /gpt-5|grok/.test(m)).slice(0, 8)
})

const kpis = computed(() => [
  { label: '注册用户', value: stats.value.users || 0, icon: '👤', bg: '#e7f7ef' },
  { label: '商品总数', value: stats.value.items || 0, icon: '📦', bg: '#eaf2ff' },
  { label: '待处理举报', value: stats.value.pendingReports || 0, icon: '🚩', bg: '#fff7ed' },
  { label: '树洞帖', value: stats.value.treehole || 0, icon: '🌳', bg: '#f5f3ff' },
  { label: '在售', value: insights.value?.itemsOnSale || 0, icon: '💚', bg: '#ecfdf5' },
  { label: '订单', value: insights.value?.orders || 0, icon: '🧾', bg: '#fef3c7' },
])

const campusBars = computed(() => {
  const map = insights.value?.campusCount || {}
  const entries = Object.entries(map).map(([name, count]) => ({ name, count: Number(count) || 0 }))
  const max = Math.max(1, ...entries.map((e) => e.count))
  return entries
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ ...e, pct: Math.round((e.count / max) * 100) }))
})

const filteredReports = computed(() => {
  if (reportFilter.value === 'all') return reports.value
  return reports.value.filter((r) => r.status === reportFilter.value)
})

const filteredItems = computed(() => {
  const kw = itemKeyword.value.trim().toLowerCase()
  if (!kw) return items.value
  return items.value.filter((i) => String(i.title || '').toLowerCase().includes(kw))
})

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString()
}
function statusType(s) {
  return { pending: 'warning', resolved: 'success', rejected: 'info' }[s] || 'info'
}
function statusText(s) {
  return { pending: '待处理', resolved: '已处理', rejected: '已驳回' }[s] || s
}
function filterReports() {}

async function refreshAll() {
  loading.value = true
  try {
    await load()
    ElMessage.success('已刷新')
  } finally {
    loading.value = false
  }
}

async function load() {
  const [s, r, i, c] = await Promise.all([
    http.get('/admin/stats'),
    http.get('/admin/reports'),
    http.get('/admin/items'),
    http.get('/admin/categories'),
  ])
  stats.value = s
  reports.value = r
  items.value = i
  categories.value = c
  await loadAi()
  await loadModels()
}

async function loadAi() {
  try {
    insights.value = await http.get('/ai/insights')
    reportSum.value = await http.get('/ai/report-summary')
  } catch {
    insights.value = null
    reportSum.value = null
  }
}

async function loadModels() {
  try {
    modelInfo.value = await http.get('/ai/providers')
  } catch {
    modelInfo.value = { providers: [], hasActiveKey: false }
  }
}

function openCreate() {
  dlgMode.value = 'create'
  Object.assign(form, {
    id: '',
    name: 'OpenAI（中转）',
    baseUrl: 'https://api.hualong.online/v1',
    model: 'gpt-5.5',
    modelStrong: 'gpt-5.6',
    apiKey: '',
  })
  modelOptions.value = ['gpt-5.6', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-4o', 'gpt-4o-mini', 'grok-4.5']
  modelsHint.value = '可先填 Key，再点「拉取可用模型」获取账号下全部模型'
  dlgVisible.value = true
}

function openEdit(p) {
  dlgMode.value = 'edit'
  Object.assign(form, {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    model: p.model,
    modelStrong: p.modelStrong,
    apiKey: '',
  })
  modelOptions.value = [p.model, p.modelStrong, 'gpt-5.6', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'grok-4.5'].filter(
    Boolean,
  )
  modelsHint.value = ''
  dlgVisible.value = true
  // 自动尝试拉取
  if (p.hasKey) fetchModels()
}

async function fetchModels() {
  if (dlgMode.value === 'create' && !form.apiKey.trim()) {
    ElMessage.warning('请先填写 API Key 再拉取')
    return
  }
  loadingModels.value = true
  modelsHint.value = '正在从中转站拉取…'
  try {
    // 编辑时用已保存的 key；若输入了新 key，先临时保存再拉更复杂，这里用通道 id 拉已存 key
    // 新建通道：先要求用户保存；编辑通道：直接拉
    if (dlgMode.value === 'create') {
      // 临时用 POST 到一个仅内存的方式：先保存通道再拉
      ElMessage.info('新建通道请先保存，再编辑并拉取模型列表')
      modelsHint.value = '新建：先点保存，再编辑通道 → 拉取可用模型'
      return
    }
    const res = await http.get(`/ai/providers/${form.id}/models`)
    modelOptions.value = res.models || []
    modelsHint.value = res.ok
      ? `已拉取 ${res.total || modelOptions.value.length} 个模型，可下拉选择（支持手动输入）`
      : res.reason || '拉取未完全成功，已显示可用列表/预设'
    if (modelOptions.value.length && !modelOptions.value.includes(form.model)) {
      // 不自动改用户当前 model，仅提示
    }
    ElMessage.success(res.ok ? '模型列表已更新' : '已回退到预设列表')
  } catch (e) {
    modelsHint.value = '拉取失败，可手动输入模型名'
    ElMessage.error('拉取模型列表失败')
  } finally {
    loadingModels.value = false
  }
}

async function saveForm() {
  if (!form.name || !form.baseUrl || !form.model) {
    ElMessage.warning('请填写名称、地址和模型')
    return
  }
  if (dlgMode.value === 'create' && !form.apiKey) {
    ElMessage.warning('新增通道请填写 API Key')
    return
  }
  saving.value = true
  try {
    if (dlgMode.value === 'create') {
      await http.post('/ai/providers', {
        id: form.id || undefined,
        name: form.name,
        baseUrl: form.baseUrl,
        model: form.model,
        modelStrong: form.modelStrong || form.model,
        apiKey: form.apiKey,
      })
      ElMessage.success('已新增')
    } else {
      const body = {
        name: form.name,
        baseUrl: form.baseUrl,
        model: form.model,
        modelStrong: form.modelStrong || form.model,
      }
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim()
      await http.patch(`/ai/providers/${form.id}`, body)
      ElMessage.success('已保存')
    }
    dlgVisible.value = false
    await loadModels()
  } finally {
    saving.value = false
  }
}

async function switchModel(p) {
  await http.post('/ai/providers/switch', { id: p.id })
  ElMessage.success(`已启用 ${p.name}`)
  await loadModels()
  pingResult.value = null
}

async function pingOne(p) {
  pingResult.value = await http.post(`/ai/providers/${p.id}/ping`)
  if (pingResult.value.ok) ElMessage.success('连通成功')
  else ElMessage.error(pingResult.value.reason || '连通失败')
}

async function removeOne(p) {
  await ElMessageBox.confirm(`确定删除通道「${p.name}」？`, '删除确认', { type: 'warning' })
  await http.post(`/ai/providers/${p.id}/delete`)
  ElMessage.success('已删除')
  await loadModels()
}

async function handleReport(r, status) {
  await http.patch(`/admin/reports/${r.id}`, { status })
  ElMessage.success('已处理')
  load()
}

async function offItem(i) {
  await ElMessageBox.confirm(`确认下架「${i.title}」？`, '下架确认', { type: 'warning' })
  await http.post(`/admin/items/${i.id}/off`)
  ElMessage.success('已下架')
  load()
}

async function addCat() {
  if (!catName.value.trim()) return
  await http.post('/admin/categories', { name: catName.value.trim() })
  catName.value = ''
  ElMessage.success('已添加')
  load()
}

async function delCat(c) {
  await ElMessageBox.confirm(`删除分类「${c.name}」？`, '删除确认', { type: 'warning' })
  await http.delete(`/admin/categories/${c.id}`)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.admin-wrap {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: 230px 1fr;
  gap: 0;
  min-height: 100vh;
  height: 100vh;
  margin: 0;
  background: #eef3f0;
  overflow: hidden;
}

.admin-side {
  background: linear-gradient(180deg, #123528 0%, #1a4a36 50%, #163d2f 100%);
  color: #e8f5ef;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
}

.side-brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}
.side-brand .logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.12);
  font-size: 18px;
}
.side-brand strong { display: block; font-size: 14px; }
.side-brand small { color: rgba(255, 255, 255, 0.55); font-size: 11px; }

.side-menu { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.menu-item {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  text-align: left;
  padding: 11px 12px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 550;
  position: relative;
}
.menu-item:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.menu-item.active {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  box-shadow: inset 3px 0 0 #6ee7b7;
}
.menu-item .ico { width: 20px; text-align: center; }
.menu-item .badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fb7185;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  display: grid;
  place-items: center;
  padding: 0 5px;
}

.side-foot {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
  font-size: 12px;
}
.admin-user { font-weight: 700; margin: 4px 0 10px; }

.admin-main {
  padding: 20px 22px 32px;
  min-width: 0;
  overflow: auto;
  height: 100vh;
}

.admin-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.admin-top h1 {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.admin-top p { margin: 0; font-size: 13px; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.kpi {
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.kpi-ico {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}
.kpi-val { font-size: 22px; font-weight: 800; line-height: 1.1; }
.kpi-label { font-size: 12px; color: var(--muted); margin-top: 2px; }

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.block {
  padding: 16px;
  margin-bottom: 12px;
}
.block-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.block-hd h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 750;
}
.sm { font-size: 12px; margin-top: 2px; }
.summary {
  line-height: 1.65;
  color: var(--text-secondary);
  margin-bottom: 10px;
  font-size: 14px;
}
.tip-list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 13px;
}
.empty-sm {
  color: var(--muted);
  font-size: 13px;
  padding: 12px 0;
}
.bars { display: flex; flex-direction: column; gap: 10px; }
.bar-row {
  display: grid;
  grid-template-columns: 72px 1fr 28px;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.bar-name { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track {
  height: 8px;
  background: #eef2f0;
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2f9e6b, #3b82f6);
  border-radius: 999px;
}
.bar-num { text-align: right; font-weight: 700; }
.meta-line {
  margin-top: 12px;
  font-size: 13px;
  color: var(--muted);
}
.todo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.todo {
  border: 1px solid var(--border);
  background: #f8fbf9;
  border-radius: 12px;
  padding: 16px 12px;
  cursor: pointer;
  text-align: left;
}
.todo:hover { border-color: #c7e6d5; background: #fff; }
.todo strong { display: block; font-size: 22px; font-weight: 800; color: var(--primary-dark); }
.todo span { font-size: 12px; color: var(--muted); }

.alert {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 13px;
}
.cell-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-weight: 650;
}
.cell-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.key {
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}
.ping {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 13px;
}
.ping.ok { background: #ecfdf5; color: #047857; }
.ops { display: flex; gap: 8px; flex-wrap: wrap; }
.cat-form { display: flex; gap: 10px; margin-bottom: 12px; }
.metric {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.metric > div {
  background: #f8fbf9;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.metric span { color: var(--muted); font-size: 13px; }
.metric b { font-size: 18px; }
.form-2, .dlg-form .form-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.model-pick-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.models-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}
.quick-models {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}
.qtag { margin: 0; }

@media (max-width: 960px) {
  .admin-wrap { grid-template-columns: 1fr; }
  .admin-side { flex-direction: row; flex-wrap: wrap; gap: 8px; padding: 12px; }
  .side-brand { border: none; margin: 0; padding: 0; }
  .side-menu { flex-direction: row; flex-wrap: wrap; width: 100%; }
  .side-foot { display: none; }
  .two-col, .todo-grid { grid-template-columns: 1fr; }
}
</style>
