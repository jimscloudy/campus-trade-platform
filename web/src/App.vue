<template>
  <div class="app-shell">
    <aside class="sidebar">
      <router-link to="/" class="brand">
        <span class="brand-logo">易</span>
        <span class="brand-copy">
          <strong>校园易物</strong>
          <small>Campus Trade</small>
        </span>
      </router-link>

      <div class="nav-group-label">校园生活</div>
      <nav class="side-nav">
        <router-link to="/" class="side-link" custom v-slot="{ href, navigate, isExactActive }">
          <a :href="href" class="side-link" :class="{ active: isExactActive }" @click="navigate">
            <span class="ico">🛒</span><span>闲置广场</span>
          </a>
        </router-link>
        <router-link to="/treehole" class="side-link" active-class="active">
          <span class="ico">🌳</span><span>校园树洞</span>
        </router-link>
        <router-link to="/ai" class="side-link" active-class="active">
          <span class="ico">🤖</span><span>AI 问答</span>
        </router-link>
        <router-link to="/publish" class="side-link" active-class="active">
          <span class="ico">✨</span><span>发布闲置</span>
        </router-link>
        <router-link to="/favorites" class="side-link" active-class="active">
          <span class="ico">💛</span><span>我的收藏</span>
        </router-link>
        <router-link to="/orders" class="side-link" active-class="active">
          <span class="ico">📦</span><span>我的订单</span>
        </router-link>
        <router-link to="/messages" class="side-link" active-class="active">
          <span class="ico">💬</span><span>消息中心</span>
        </router-link>
        <router-link to="/notifications" class="side-link" active-class="active">
          <span class="ico">🔔</span><span>系统通知</span>
          <em v-if="unread > 0" class="badge">{{ unread > 99 ? '99+' : unread }}</em>
        </router-link>
        <router-link to="/mine" class="side-link" active-class="active">
          <span class="ico">👤</span><span>个人中心</span>
        </router-link>
        <router-link v-if="auth.user?.role === 'admin'" to="/admin" class="side-link" active-class="active">
          <span class="ico">🛠</span><span>管理后台</span>
        </router-link>
      </nav>

      <div class="side-footer">
        <div class="tip-card">
          <strong>🌳 树洞小贴士</strong>
          <p>匿名说说心里话，也欢迎在广场淘闲置</p>
        </div>
      </div>
    </aside>

    <div class="main-col">
      <header class="topbar">
        <div class="crumbs">
          <span class="muted">校园易物</span>
          <span class="sep">/</span>
          <span class="current">{{ pageTitle }}</span>
        </div>
        <div class="top-actions">
          <template v-if="auth.isLogin">
            <button class="bell" type="button" @click="$router.push('/notifications')">
              🔔
              <i v-if="unread > 0">{{ unread > 99 ? '99+' : unread }}</i>
            </button>
            <el-button type="primary" class="pub" @click="$router.push('/publish')">+ 发布</el-button>
            <div class="user" @click="$router.push('/mine')">
              <span class="av">{{ avatarChar }}</span>
              <span class="uname">{{ auth.user?.nickname || '用户' }}</span>
            </div>
            <button class="ghost" type="button" @click="logout">退出</button>
          </template>
          <el-button v-else type="primary" round @click="$router.push('/login')">登录 / 注册</el-button>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>

    <nav class="mobile-tab">
      <router-link to="/" class="tab" custom v-slot="{ href, navigate, isExactActive }">
        <a :href="href" class="tab" :class="{ active: isExactActive }" @click="navigate">
          <span>🛒</span><small>广场</small>
        </a>
      </router-link>
      <router-link to="/treehole" class="tab" active-class="active">
        <span>🌳</span><small>树洞</small>
      </router-link>
      <router-link to="/ai" class="tab" active-class="active">
        <span>🤖</span><small>AI</small>
      </router-link>
      <router-link to="/publish" class="tab" active-class="active">
        <span>✨</span><small>发布</small>
      </router-link>
      <router-link to="/orders" class="tab" active-class="active">
        <span>📦</span><small>订单</small>
      </router-link>
      <router-link :to="auth.isLogin ? '/mine' : '/login'" class="tab" active-class="active">
        <span>👤</span><small>{{ auth.isLogin ? '我的' : '登录' }}</small>
      </router-link>
    </nav>

    <AiFloat />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import http from './api/http'
import AiFloat from './components/AiFloat.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const unread = ref(0)
let timer = null
const avatarChar = computed(() => (auth.user?.nickname || auth.user?.username || 'U').slice(0, 1))

const pageTitle = computed(() => {
  const map = {
    '/': '闲置广场',
    '/treehole': '校园树洞',
    '/ai': 'AI 问答',
    '/publish': '发布闲置',
    '/orders': '我的订单',
    '/messages': '消息中心',
    '/mine': '个人中心',
    '/login': '登录注册',
    '/favorites': '我的收藏',
    '/notifications': '系统通知',
    '/admin': '管理后台',
  }
  if (route.path.startsWith('/items/')) return '商品详情'
  if (route.path.startsWith('/messages/')) return '会话详情'
  return map[route.path] || '校园易物'
})

async function refreshUnread() {
  if (!auth.isLogin) {
    unread.value = 0
    return
  }
  try {
    const data = await http.get('/notifications/unread-count')
    unread.value = data.count || 0
  } catch {
    unread.value = 0
  }
}

function logout() {
  auth.logout()
  unread.value = 0
  router.push('/login')
}

watch(
  () => auth.isLogin,
  (v) => {
    if (v) refreshUnread()
    else unread.value = 0
  },
)

watch(
  () => route.path,
  () => {
    if (auth.isLogin) refreshUnread()
  },
)

onMounted(() => {
  refreshUnread()
  timer = setInterval(refreshUnread, 20000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 18px 14px;
  border-right: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 18px;
}
.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
  box-shadow: 0 8px 20px rgba(47, 158, 107, 0.28);
}
.brand-copy { display: flex; flex-direction: column; line-height: 1.15; }
.brand-copy strong { font-size: 15px; font-weight: 800; }
.brand-copy small { font-size: 11px; color: var(--muted); letter-spacing: 0.04em; }
.nav-group-label {
  padding: 8px 14px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}
.side-nav { display: flex; flex-direction: column; gap: 4px; }
.side-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 14px;
  color: #5f7268;
  font-size: 14px;
  font-weight: 550;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}
.side-link .ico { width: 22px; text-align: center; }
.side-link:hover { color: var(--text); background: #f3f8f4; }
.side-link.active {
  color: var(--primary-dark);
  background: linear-gradient(90deg, #e7f7ef, #eef7ff);
  border-color: #c7e6d5;
  font-weight: 700;
}
.side-link .badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  display: inline-grid;
  place-items: center;
}
.bell {
  position: relative;
  border: 1px solid var(--border);
  background: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 15px;
}
.bell i {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  display: grid;
  place-items: center;
}
.side-footer { margin-top: auto; padding: 10px; }
.tip-card {
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(160deg, #e7f7ef, #eaf2ff);
  border: 1px solid #d5ebdf;
}
.tip-card strong { display: block; font-size: 13px; margin-bottom: 4px; }
.tip-card p { margin: 0; font-size: 12px; color: var(--muted); line-height: 1.5; }
.main-col { min-width: 0; display: flex; flex-direction: column; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(221, 232, 225, 0.9);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(14px);
}
.crumbs { display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; }
.sep { color: #cbd5e1; }
.current { color: var(--text); font-weight: 650; }
.top-actions { display: flex; align-items: center; gap: 10px; }
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: #f3f8f4;
  border: 1px solid var(--border);
  cursor: pointer;
}
.av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2f9e6b, #3b82f6);
}
.uname {
  font-size: 13px;
  font-weight: 600;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ghost {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
}
.ghost:hover { color: var(--danger); background: #fff1f2; }
.content { flex: 1; padding: 18px 18px 28px; }
.mobile-tab { display: none; }

@media (max-width: 900px) {
  .app-shell { grid-template-columns: 1fr; padding-bottom: 72px; }
  .sidebar { display: none; }
  .topbar { padding: 0 14px; }
  .pub, .ghost, .uname { display: none; }
  .content { padding: 12px 10px 20px; }
  .mobile-tab {
    display: flex;
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 40;
    height: 64px;
    justify-content: space-around;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(12px);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 56px;
    padding: 6px 8px;
    border-radius: 12px;
    color: var(--muted);
    font-size: 11px;
  }
  .tab span { font-size: 17px; }
  .tab.active {
    color: var(--primary-dark);
    background: var(--primary-soft);
    font-weight: 700;
  }
}
</style>
