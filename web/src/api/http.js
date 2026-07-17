import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  // AI 调用经常超过 15s
  const url = config.url || ''
  if (url.includes('/ai/')) {
    config.timeout = config.timeout && config.timeout > 15000 ? config.timeout : 90000
  }
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败'
    let text = Array.isArray(msg) ? msg.join(', ') : msg
    if (err.code === 'ECONNABORTED' || /timeout/i.test(String(err.message || ''))) {
      text = '请求超时，AI 响应较慢，请再试一次'
    }
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      // 仅登录相关 401 才清会话，避免误伤
      if (!url.includes('/ai/')) {
        const auth = useAuthStore()
        auth.logout()
      }
    }
    ElMessage.error(text)
    return Promise.reject(err)
  },
)

export default http
