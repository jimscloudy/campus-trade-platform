import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '../api/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLogin = computed(() => !!token.value)

  function setSession(data) {
    token.value = data.accessToken
    user.value = data.user
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function login(username, password) {
    const data = await http.post('/auth/login', { username, password })
    setSession(data)
    return data
  }

  async function register(payload) {
    const data = await http.post('/auth/register', payload)
    setSession(data)
    return data
  }

  async function refreshMe() {
    if (!token.value) return
    const data = await http.get('/users/me')
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
  }

  return { token, user, isLogin, login, register, logout, refreshMe, setSession }
})
