<template>
  <div class="page narrow">
    <div class="card profile" v-if="auth.user">
      <div class="banner"></div>
      <div class="profile-body">
        <div class="avatar">{{ auth.user.nickname?.[0] || 'U' }}</div>
        <div class="info">
          <h1>{{ auth.user.nickname }}</h1>
          <p class="muted">@{{ auth.user.username }} · {{ auth.user.campus }}</p>
          <div class="stats">
            <div class="stat"><strong>{{ auth.user.creditScore }}</strong><span>信用分</span></div>
            <div class="stat"><strong>{{ myItems.length }}</strong><span>在售</span></div>
          </div>
          <div class="quick">
            <el-button @click="$router.push('/favorites')">我的收藏</el-button>
            <el-button @click="$router.push('/notifications')">系统通知</el-button>
            <el-button v-if="auth.user.role === 'admin'" type="primary" @click="$router.push('/admin')">管理后台</el-button>
          </div>
          <p class="bio">{{ auth.user.bio || '这个人很懒，还没有简介' }}</p>
        </div>
      </div>
    </div>

    <div class="card form-card section">
      <h3>编辑资料</h3>
      <el-form :model="form" label-position="top">
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="校区">
          <el-select v-model="form.campus" style="width: 100%">
            <el-option label="主校区" value="主校区" />
            <el-option label="东校区" value="东校区" />
            <el-option label="西校区" value="西校区" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.bio" type="textarea" :rows="3" placeholder="介绍一下自己吧" />
        </el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
      </el-form>
    </div>

    <div class="card form-card section">
      <div class="section-head" style="margin-bottom: 12px">
        <h3 style="margin: 0">我发布的</h3>
        <el-button type="primary" link @click="$router.push('/publish')">+ 去发布</el-button>
      </div>
      <div class="grid-items">
        <div v-for="item in myItems" :key="item.id" class="card item-card" @click="$router.push(`/items/${item.id}`)">
          <div class="item-cover" :class="'tone-' + categoryMeta(item.category?.name).tone">
            <span class="emoji">{{ categoryMeta(item.category?.name).emoji }}</span>
            <span class="cat-label">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="item-body">
            <h3 class="item-title">{{ item.title }}</h3>
            <div class="price"><span class="yen">¥</span>{{ formatPrice(item.price) }}</div>
          </div>
        </div>
      </div>
      <div v-if="!myItems.length" class="empty-box" style="padding: 32px 12px">
        <div class="empty-icon">🪴</div>
        <p>还没有发布过商品</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { categoryMeta, formatPrice, statusLabel } from '../utils/display'

const auth = useAuthStore()
const saving = ref(false)
const myItems = ref([])
const form = reactive({
  nickname: auth.user?.nickname || '',
  campus: auth.user?.campus || '主校区',
  bio: auth.user?.bio || '',
})

async function save() {
  saving.value = true
  try {
    const user = await http.put('/users/me', form)
    auth.user = user
    localStorage.setItem('user', JSON.stringify(user))
    ElMessage.success('已保存')
  } finally { saving.value = false }
}
onMounted(async () => {
  await auth.refreshMe()
  form.nickname = auth.user.nickname
  form.campus = auth.user.campus
  form.bio = auth.user.bio || ''
  const data = await http.get('/items', {
    params: { sellerId: auth.user.id, status: 'on_sale', pageSize: 50 },
  })
  myItems.value = data.list
})
</script>

<style scoped>
.narrow { max-width: 760px; }
.profile { overflow: hidden; margin-bottom: 16px; }
.banner {
  height: 100px;
  background: linear-gradient(120deg, #1f7a55, #2f9e6b 45%, #3b82f6);
}
.profile-body {
  display: flex; gap: 16px; padding: 0 20px 20px; margin-top: -28px; align-items: flex-end;
}
.avatar {
  width: 72px; height: 72px; border-radius: 20px; display: grid; place-items: center;
  font-size: 28px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
  border: 4px solid #fff; box-shadow: var(--shadow); flex-shrink: 0;
}
.info { flex: 1; padding-top: 32px; min-width: 0; }
.info h1 { margin: 0 0 4px; font-size: 22px; font-weight: 800; }
.stats { display: flex; gap: 20px; margin: 12px 0; }
.stat { display: flex; flex-direction: column; }
.stat strong { font-size: 18px; font-weight: 800; color: var(--primary-dark); }
.stat span { font-size: 12px; color: var(--muted); }
.bio { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
.quick { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.section { margin-bottom: 16px; }
.section h3 { margin: 0 0 14px; font-size: 16px; font-weight: 750; }
@media (max-width: 520px) {
  .profile-body { flex-direction: column; align-items: flex-start; }
  .info { padding-top: 8px; }
}
</style>
