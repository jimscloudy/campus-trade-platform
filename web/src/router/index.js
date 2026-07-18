import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MainLayout from '../layouts/MainLayout.vue'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import ItemDetail from '../views/ItemDetail.vue'
import Publish from '../views/Publish.vue'
import Orders from '../views/Orders.vue'
import Messages from '../views/Messages.vue'
import Mine from '../views/Mine.vue'
import Treehole from '../views/Treehole.vue'
import Favorites from '../views/Favorites.vue'
import Notifications from '../views/Notifications.vue'
import Admin from '../views/Admin.vue'
import AiChat from '../views/AiChat.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', component: Home },
        { path: 'login', component: Login },
        { path: 'items/:id', component: ItemDetail },
        { path: 'treehole', component: Treehole },
        { path: 'ai', component: AiChat },
        { path: 'publish', component: Publish, meta: { auth: true } },
        { path: 'orders', component: Orders, meta: { auth: true } },
        { path: 'messages', component: Messages, meta: { auth: true } },
        { path: 'messages/:peerId', component: Messages, meta: { auth: true } },
        { path: 'mine', component: Mine, meta: { auth: true } },
        { path: 'favorites', component: Favorites, meta: { auth: true } },
        { path: 'notifications', component: Notifications, meta: { auth: true } },
      ],
    },
    // 独立全屏管理后台（不嵌套前台壳）
    {
      path: '/admin',
      component: Admin,
      meta: { auth: true, admin: true, standalone: true },
    },
    {
      path: '/admin/login',
      redirect: (to) => ({ path: '/login', query: { redirect: '/admin', ...to.query } }),
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.admin && auth.user?.role !== 'admin') {
    return { path: '/login', query: { redirect: '/admin' } }
  }
})

export default router
