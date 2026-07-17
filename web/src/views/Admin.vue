<template>
  <div class="page">
    <h1 class="page-title">管理后台</h1>
    <div class="stats">
      <div class="card stat"><strong>{{ stats.users || 0 }}</strong><span>用户</span></div>
      <div class="card stat"><strong>{{ stats.items || 0 }}</strong><span>商品</span></div>
      <div class="card stat"><strong>{{ stats.pendingReports || 0 }}</strong><span>待处理举报</span></div>
      <div class="card stat"><strong>{{ stats.treehole || 0 }}</strong><span>树洞</span></div>
    </div>

    <div class="card ai-box">
      <div class="ai-title">🤖 AI 运营洞察</div>
      <p v-if="reportSum">{{ reportSum.summary }}</p>
      <ul v-if="insights?.tips?.length">
        <li v-for="(t, i) in insights.tips" :key="i">{{ t }}</li>
      </ul>
      <el-button size="small" @click="loadAi">刷新 AI 摘要</el-button>
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="大模型切换" name="models">
        <div class="card panel">
          <p class="muted" style="margin-top: 0">
            当前通道：
            <strong>{{ modelInfo.activeName || '-' }}</strong>
            · 模型 <code>{{ modelInfo.activeModel || '-' }}</code>
          </p>
          <div v-for="p in modelInfo.providers || []" :key="p.id" class="model-row" :class="{ on: p.active }">
            <div>
              <strong>{{ p.name }}</strong>
              <span class="muted"> · {{ p.model }} / 强力 {{ p.modelStrong }}</span>
              <div class="muted tiny">{{ p.baseUrl }} · Key {{ p.keyMasked }}</div>
            </div>
            <div class="ops">
              <el-tag v-if="p.active" type="success">使用中</el-tag>
              <el-button v-else type="primary" size="small" @click="switchModel(p)">切换到此通道</el-button>
              <el-button size="small" @click="editModel(p)">编辑</el-button>
              <el-button size="small" @click="pingModel">测试连通</el-button>
            </div>
          </div>
          <div v-if="pingResult" class="ping" :class="{ ok: pingResult.ok }">
            {{ pingResult.ok ? '连通成功' : '连通失败' }}：{{ pingResult.sample || pingResult.reason }}
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="举报处理" name="reports">
        <div class="card panel">
          <div v-for="r in reports" :key="r.id" class="report">
            <div>
              <strong>#{{ r.id }} · {{ r.targetType }}#{{ r.targetId }}</strong>
              <span class="status-tag" :class="r.status === 'pending' ? 'warn' : 'ok'">{{ r.status }}</span>
              <p class="muted">{{ r.reason }}</p>
            </div>
            <div class="ops" v-if="r.status === 'pending'">
              <el-button type="primary" size="small" @click="handleReport(r, 'resolved')">处理并下架</el-button>
              <el-button size="small" @click="handleReport(r, 'rejected')">驳回</el-button>
            </div>
          </div>
          <div v-if="!reports.length" class="empty-box">暂无举报</div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="商品管理" name="items">
        <div class="card panel">
          <div v-for="i in items" :key="i.id" class="report">
            <div>
              <strong>#{{ i.id }} {{ i.title }}</strong>
              <span class="muted"> ¥{{ i.price }} · {{ i.status }} · 卖家{{ i.sellerId }}</span>
            </div>
            <el-button v-if="i.status === 'on_sale'" type="danger" plain size="small" @click="offItem(i)">下架</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="分类管理" name="cats">
        <div class="card panel">
          <div class="cat-form">
            <el-input v-model="catName" placeholder="新分类名称" style="max-width: 240px" />
            <el-button type="primary" @click="addCat">添加分类</el-button>
          </div>
          <div v-for="c in categories" :key="c.id" class="report">
            <strong>{{ c.name }}</strong>
            <el-button type="danger" text size="small" @click="delCat(c)">删除</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../api/http'

const tab = ref('models')
const stats = ref({})
const reports = ref([])
const items = ref([])
const categories = ref([])
const catName = ref('')
const insights = ref(null)
const reportSum = ref(null)
const modelInfo = ref({ providers: [] })
const pingResult = ref(null)

async function load() {
  stats.value = await http.get('/admin/stats')
  reports.value = await http.get('/admin/reports')
  items.value = await http.get('/admin/items')
  categories.value = await http.get('/admin/categories')
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
    modelInfo.value = { providers: [] }
  }
}

async function switchModel(p) {
  await http.post('/ai/providers/switch', { id: p.id })
  ElMessage.success(`已切换到 ${p.name}`)
  await loadModels()
  pingResult.value = null
}

async function editModel(p) {
  const { value: model } = await ElMessageBox.prompt('默认模型名', `编辑 ${p.name}`, {
    inputValue: p.model,
  }).catch(() => ({ value: null }))
  if (model == null) return
  const { value: modelStrong } = await ElMessageBox.prompt('强力模型名', `编辑 ${p.name}`, {
    inputValue: p.modelStrong || p.model,
  }).catch(() => ({ value: null }))
  if (modelStrong == null) return
  const { value: apiKey } = await ElMessageBox.prompt('API Key（留空不改）', `编辑 ${p.name}`, {
    inputValue: '',
    inputPlaceholder: 'sk-... 留空保持原 Key',
  }).catch(() => ({ value: null }))
  if (apiKey == null) return
  const body = { model, modelStrong }
  if (String(apiKey).trim()) body.apiKey = String(apiKey).trim()
  await http.patch(`/ai/providers/${p.id}`, body)
  ElMessage.success('已保存')
  await loadModels()
}

async function pingModel() {
  pingResult.value = await http.get('/ai/ping')
  if (pingResult.value.ok) ElMessage.success('当前通道连通正常')
  else ElMessage.error(pingResult.value.reason || '连通失败')
}

async function handleReport(r, status) {
  await http.patch(`/admin/reports/${r.id}`, { status })
  ElMessage.success('已处理')
  load()
}

async function offItem(i) {
  await ElMessageBox.confirm(`确认下架「${i.title}」？`)
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
  await ElMessageBox.confirm(`删除分类「${c.name}」？`)
  await http.delete(`/admin/categories/${c.id}`)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.stat {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat strong { font-size: 24px; color: var(--primary-dark); }
.stat span { font-size: 13px; color: var(--muted); }
.ai-box {
  padding: 14px 16px;
  margin-bottom: 14px;
  background: linear-gradient(120deg, #e7f7ef, #eaf2ff);
}
.ai-title { font-weight: 750; margin-bottom: 8px; }
.ai-box p { margin: 0 0 8px; line-height: 1.6; color: var(--text-secondary); }
.ai-box ul { margin: 0 0 10px; padding-left: 18px; color: var(--text-secondary); }
.panel { padding: 14px; }
.report {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border);
}
.report p { margin: 6px 0 0; }
.ops { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; align-items: center; }
.cat-form { display: flex; gap: 10px; margin-bottom: 12px; }
.model-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 10px;
  background: #fff;
}
.model-row.on {
  border-color: #86efac;
  background: #f0fdf4;
}
.tiny { font-size: 12px; margin-top: 4px; }
.ping {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 13px;
}
.ping.ok {
  background: #ecfdf5;
  color: #047857;
}
code {
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
