import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
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
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/items/:id', component: ItemDetail },
    { path: '/treehole', component: Treehole },
    { path: '/ai', component: AiChat },
    { path: '/publish', component: Publish, meta: { auth: true } },
    { path: '/orders', component: Orders, meta: { auth: true } },
    { path: '/messages', component: Messages, meta: { auth: true } },
    { path: '/messages/:peerId', component: Messages, meta: { auth: true } },
    { path: '/mine', component: Mine, meta: { auth: true } },
    { path: '/favorites', component: Favorites, meta: { auth: true } },
    { path: '/notifications', component: Notifications, meta: { auth: true } },
    { path: '/admin', component: Admin, meta: { auth: true, admin: true } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.admin && auth.user?.role !== 'admin') {
    return { path: '/' }
  }
})

export default router
