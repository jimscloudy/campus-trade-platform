<template>
  <div class="login-page">
    <div class="login-shell card">
      <aside class="panel-left">
        <div class="badge">🎓 Campus Trade</div>
        <h1>同校闲置<br />当面更放心</h1>
        <ul>
          <li>校园身份，交易更可信</li>
          <li>就近约定，当面验货</li>
          <li>树洞吐槽，匿名更自在</li>
        </ul>
      </aside>
      <div class="panel-right">
        <div class="tabs">
          <button type="button" :class="{ on: !isRegister }" @click="isRegister = false">登录</button>
          <button type="button" :class="{ on: isRegister }" @click="isRegister = true">注册</button>
        </div>
        <p class="hint">演示账号 <code>demo</code> / <code>123456</code></p>
        <el-form :model="form" label-position="top" size="large" @submit.prevent>
          <el-form-item label="用户名">
            <el-input v-model="form.username" placeholder="学号 / 用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
          </el-form-item>
          <template v-if="isRegister">
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" placeholder="展示给买家看的名字" />
            </el-form-item>
            <el-form-item label="校区">
              <el-select v-model="form.campus" style="width: 100%">
                <el-option label="主校区" value="主校区" />
                <el-option label="东校区" value="东校区" />
                <el-option label="西校区" value="西校区" />
              </el-select>
            </el-form-item>
          </template>
          <el-button type="primary" class="submit" :loading="loading" @click="submit">
            {{ isRegister ? '创建账号并登录' : '立即登录' }}
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const isRegister = ref(false)
const loading = ref(false)
const form = reactive({ username: 'demo', password: '123456', nickname: '', campus: '主校区' })

async function submit() {
  loading.value = true
  try {
    if (isRegister.value) {
      await auth.register(form)
      ElMessage.success('注册成功')
    } else {
      await auth.login(form.username, form.password)
      ElMessage.success('欢迎回来')
    }
    router.replace(route.query.redirect || '/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 4px 24px;
}
.login-shell {
  width: min(900px, 100%);
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  overflow: hidden;
}
.panel-left {
  padding: 40px 34px;
  color: #fff;
  background: linear-gradient(150deg, #1f7a55, #2f9e6b 45%, #3b82f6);
}
.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin-bottom: 18px;
}
.panel-left h1 {
  margin: 0 0 18px;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.25;
}
.panel-left ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  opacity: 0.95;
}
.panel-right { padding: 36px 32px; }
.tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: #f3f8f4;
  border-radius: 14px;
  margin-bottom: 14px;
}
.tabs button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 650;
  color: var(--muted);
  cursor: pointer;
}
.tabs button.on {
  background: #fff;
  color: var(--text);
  box-shadow: var(--shadow);
}
.hint { margin: 0 0 18px; font-size: 13px; color: var(--muted); }
.hint code {
  background: var(--primary-soft);
  color: var(--primary-dark);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.submit { width: 100%; margin-top: 8px; height: 44px; }
@media (max-width: 760px) {
  .login-shell { grid-template-columns: 1fr; }
  .panel-left { padding: 28px 22px; }
  .panel-left h1 { font-size: 24px; }
  .panel-right { padding: 24px 18px 28px; }
}
</style>
