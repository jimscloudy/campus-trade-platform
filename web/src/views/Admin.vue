<template>
  <div class="page">
    <h1 class="page-title">管理后台</h1>
    <div class="stats">
      <div class="card stat"><strong>{{ stats.users || 0 }}</strong><span>用户</span></div>
      <div class="card stat"><strong>{{ stats.items || 0 }}</strong><span>商品</span></div>
      <div class="card stat"><strong>{{ stats.pendingReports || 0 }}</strong><span>待处理举报</span></div>
      <div class="card stat"><strong>{{ stats.treehole || 0 }}</strong><span>树洞</span></div>
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="大模型配置" name="models">
        <div class="card panel">
          <div class="toolbar">
            <div>
              当前：
              <strong>{{ modelInfo.activeName || '未选择' }}</strong>
              <span class="muted"> · {{ modelInfo.activeModel || '-' }}</span>
              <el-tag v-if="modelInfo.hasActiveKey" type="success" size="small" style="margin-left: 8px">已配置 Key</el-tag>
              <el-tag v-else type="danger" size="small" style="margin-left: 8px">未配置 Key</el-tag>
            </div>
            <div class="ops">
              <el-button type="primary" @click="openCreate">+ 新增通道</el-button>
              <el-button @click="loadModels">刷新</el-button>
            </div>
          </div>

          <div v-if="!modelInfo.hasActiveKey" class="warn-box">
            当前通道还没有 API Key。请点对应通道的「编辑配置」，填写 Base URL、模型名和 Key 后保存，再点「测试连通」。
          </div>

          <div v-for="p in modelInfo.providers || []" :key="p.id" class="model-row" :class="{ on: p.active }">
            <div class="info">
              <div class="name-line">
                <strong>{{ p.name }}</strong>
                <el-tag v-if="p.active" type="success" size="small">使用中</el-tag>
                <el-tag v-if="!p.hasKey" type="warning" size="small">无 Key</el-tag>
              </div>
              <div class="muted tiny">模型：{{ p.model }}　/　强力：{{ p.modelStrong }}</div>
              <div class="muted tiny">地址：{{ p.baseUrl }}</div>
              <div class="muted tiny">Key：{{ p.keyMasked }}</div>
            </div>
            <div class="ops">
              <el-button v-if="!p.active" type="primary" size="small" @click="switchModel(p)">设为当前</el-button>
              <el-button size="small" type="success" plain @click="pingOne(p)">测试连通</el-button>
              <el-button size="small" @click="openEdit(p)">编辑配置</el-button>
              <el-button size="small" type="danger" plain @click="removeOne(p)">删除</el-button>
            </div>
          </div>

          <div v-if="pingResult" class="ping" :class="{ ok: pingResult.ok }">
            <template v-if="pingResult.ok">
              ✅ {{ pingResult.providerName || '' }} 连通成功（{{ pingResult.model }}）
              <span v-if="pingResult.sample">：{{ pingResult.sample }}</span>
            </template>
            <template v-else>
              ❌ {{ pingResult.providerName || '' }} 失败：{{ pingResult.reason }}
            </template>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="AI 洞察" name="insights">
        <div class="card panel">
          <p v-if="reportSum">{{ reportSum.summary }}</p>
          <ul v-if="insights?.tips?.length">
            <li v-for="(t, i) in insights.tips" :key="i">{{ t }}</li>
          </ul>
          <el-button size="small" @click="loadAi">刷新</el-button>
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

    <el-dialog v-model="dlgVisible" :title="dlgMode === 'create' ? '新增模型通道' : '编辑模型通道'" width="520px">
      <el-form label-position="top">
        <el-form-item v-if="dlgMode === 'create'" label="通道 ID（英文）">
          <el-input v-model="form.id" placeholder="例如 openai2" />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="form.name" placeholder="例如 Grok 4.5" />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="form.baseUrl" placeholder="https://api.hualong.online/v1" />
        </el-form-item>
        <el-form-item label="默认模型">
          <el-input v-model="form.model" placeholder="grok-4.5 或 gpt-5.4-mini" />
        </el-form-item>
        <el-form-item label="强力模型">
          <el-input v-model="form.modelStrong" placeholder="强力模式使用的模型" />
        </el-form-item>
        <el-form-item :label="dlgMode === 'edit' ? 'API Key（留空则不修改）' : 'API Key'">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            :placeholder="dlgMode === 'edit' ? '不改请留空' : 'sk-xxxx'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
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
const modelInfo = ref({ providers: [], hasActiveKey: false })
const pingResult = ref(null)

const dlgVisible = ref(false)
const dlgMode = ref('edit')
const saving = ref(false)
const form = reactive({
  id: '',
  name: '',
  baseUrl: 'https://api.hualong.online/v1',
  model: '',
  modelStrong: '',
  apiKey: '',
})

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
    modelInfo.value = { providers: [], hasActiveKey: false }
  }
}

function openCreate() {
  dlgMode.value = 'create'
  form.id = ''
  form.name = ''
  form.baseUrl = 'https://api.hualong.online/v1'
  form.model = 'gpt-5.4-mini'
  form.modelStrong = 'gpt-5.4'
  form.apiKey = ''
  dlgVisible.value = true
}

function openEdit(p) {
  dlgMode.value = 'edit'
  form.id = p.id
  form.name = p.name
  form.baseUrl = p.baseUrl
  form.model = p.model
  form.modelStrong = p.modelStrong
  form.apiKey = ''
  dlgVisible.value = true
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
      ElMessage.success('已新增通道')
    } else {
      const body = {
        name: form.name,
        baseUrl: form.baseUrl,
        model: form.model,
        modelStrong: form.modelStrong || form.model,
      }
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim()
      await http.patch(`/ai/providers/${form.id}`, body)
      ElMessage.success('已保存配置')
    }
    dlgVisible.value = false
    await loadModels()
  } finally {
    saving.value = false
  }
}

async function switchModel(p) {
  await http.post('/ai/providers/switch', { id: p.id })
  ElMessage.success(`已切换到 ${p.name}`)
  await loadModels()
  pingResult.value = null
}

async function pingOne(p) {
  pingResult.value = await http.post(`/ai/providers/${p.id}/ping`)
  if (pingResult.value.ok) ElMessage.success('连通成功')
  else ElMessage.error(pingResult.value.reason || '连通失败')
}

async function removeOne(p) {
  await ElMessageBox.confirm(`确定删除通道「${p.name}」？`, '删除确认')
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
.panel { padding: 16px; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.warn-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.5;
}
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
.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.tiny { font-size: 12px; margin-top: 2px; }
.ops { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; align-items: center; }
.ping {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 13px;
  line-height: 1.5;
}
.ping.ok {
  background: #ecfdf5;
  color: #047857;
}
.report {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border);
}
.report p { margin: 6px 0 0; }
.cat-form { display: flex; gap: 10px; margin-bottom: 12px; }
@media (max-width: 700px) {
  .model-row { flex-direction: column; align-items: flex-start; }
}
</style>
