<template>
  <div class="page narrow">
    <div class="card form-card">
      <div class="head-icon">✨</div>
      <h2>发布闲置</h2>
      <p class="sub">支持最多 6 张图片；可用 AI 生成文案与估价</p>
      <div class="ai-bar">
        <el-button @click="aiCopy" :loading="aiLoading">✍️ AI 写文案</el-button>
        <el-button @click="aiPrice" :loading="aiLoading">💰 AI 估价</el-button>
        <el-button @click="aiModerate" :loading="aiLoading">🛡 内容审核</el-button>
      </div>
      <el-form :model="form" label-position="top" size="large">
        <el-form-item label="商品图片">
          <div class="imgs">
            <div v-for="(url, idx) in form.images" :key="url" class="thumb">
              <img :src="url" alt="" />
              <button type="button" class="rm" @click="form.images.splice(idx, 1)">×</button>
            </div>
            <label v-if="form.images.length < 6" class="uploader">
              <input type="file" accept="image/*" multiple hidden @change="onPick" />
              <span>{{ uploading ? '上传中…' : '+ 上传' }}</span>
            </label>
          </div>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="60" show-word-limit placeholder="例：几乎全新 iPad Air 5" />
        </el-form-item>
        <el-form-item label="描述" required>
          <el-input v-model="form.description" type="textarea" :rows="5" placeholder="成色、配件、是否可刀、期望交易地点…" />
        </el-form-item>
        <div class="row-2">
          <el-form-item label="价格" required>
            <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="成色">
            <el-select v-model="form.condition" style="width: 100%">
              <el-option label="几乎全新" value="like_new" />
              <el-option label="轻微使用" value="good" />
              <el-option label="明显使用" value="fair" />
              <el-option label="有瑕疵" value="poor" />
            </el-select>
          </el-form-item>
        </div>
        <div class="row-2">
          <el-form-item label="分类">
            <el-select v-model="form.categoryId" clearable placeholder="选择分类" style="width: 100%">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="校区">
            <el-select v-model="form.campus" style="width: 100%">
              <el-option label="主校区" value="主校区" />
              <el-option label="东校区" value="东校区" />
              <el-option label="西校区" value="西校区" />
            </el-select>
          </el-form-item>
        </div>
        <el-button type="primary" class="submit" size="large" :loading="loading" @click="submit">立即发布</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const categories = ref([])
const loading = ref(false)
const uploading = ref(false)
const aiLoading = ref(false)
const form = reactive({
  title: '',
  description: '',
  price: 0,
  categoryId: undefined,
  condition: 'good',
  campus: auth.user?.campus || '主校区',
  images: [],
})

async function onPick(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const left = 6 - form.images.length
  const pick = files.slice(0, left)
  const fd = new FormData()
  pick.forEach((f) => fd.append('files', f))
  uploading.value = true
  try {
    const { data } = await axios.post('/api/upload/images', fd, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
    form.images.push(...(data.urls || []))
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '上传失败')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function aiCopy() {
  aiLoading.value = true
  try {
    const cat = categories.value.find((c) => c.id === form.categoryId)
    const r = await http.post('/ai/copywrite', {
      title: form.title || '校园闲置',
      description: form.description,
      category: cat?.name,
      condition: form.condition,
      campus: form.campus,
      price: form.price,
    })
    form.title = r.title || form.title
    form.description = r.description || form.description
    ElMessage.success('文案已生成，可再微调')
  } finally {
    aiLoading.value = false
  }
}

async function aiPrice() {
  if (!form.title) {
    ElMessage.warning('先填个标题/关键词')
    return
  }
  aiLoading.value = true
  try {
    const cat = categories.value.find((c) => c.id === form.categoryId)
    const r = await http.post('/ai/price-suggest', {
      title: form.title,
      description: form.description,
      condition: form.condition,
      category: cat?.name,
    })
    form.price = r.suggest
    ElMessage.success(`建议 ¥${r.suggest}（${r.min}-${r.max}）`)
  } finally {
    aiLoading.value = false
  }
}

async function aiModerate() {
  aiLoading.value = true
  try {
    const r = await http.post('/ai/moderate', {
      content: `${form.title}\n${form.description}`,
    })
    if (r.pass) ElMessage.success('内容审核通过')
    else ElMessage.warning(r.reason || '可能存在违规内容')
  } finally {
    aiLoading.value = false
  }
}

async function submit() {
  if (!form.title || !form.description) {
    ElMessage.warning('请填写标题和描述')
    return
  }
  const mod = await http.post('/ai/moderate', { content: `${form.title}\n${form.description}` })
  if (!mod.pass) {
    ElMessage.error(mod.reason || '内容未通过审核')
    return
  }
  loading.value = true
  try {
    const item = await http.post('/items', form)
    ElMessage.success('发布成功')
    router.push(`/items/${item.id}`)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  categories.value = await http.get('/items/categories')
})
</script>

<style scoped>
.narrow { max-width: 640px; }
.ai-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.head-icon {
  width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center;
  font-size: 24px; background: var(--primary-soft); border: 1px solid #c7e6d5; margin-bottom: 14px;
}
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.submit { width: 100%; margin-top: 8px; height: 46px; }
.imgs { display: flex; flex-wrap: wrap; gap: 10px; }
.thumb, .uploader {
  width: 88px; height: 88px; border-radius: 12px; overflow: hidden;
  border: 1px dashed #c7e6d5; position: relative; background: #f7fbf8;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.rm {
  position: absolute; top: 2px; right: 4px; border: none; background: rgba(0,0,0,.55);
  color: #fff; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; line-height: 1;
}
.uploader {
  display: grid; place-items: center; cursor: pointer; color: var(--muted); font-size: 13px;
}
@media (max-width: 520px) { .row-2 { grid-template-columns: 1fr; } }
</style>
