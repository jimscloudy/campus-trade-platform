<template>
  <div class="page">
    <h1 class="page-title">我的收藏</h1>
    <div v-loading="loading" class="grid-items">
      <div
        v-for="row in list"
        :key="row.favoriteId"
        class="card item-card"
        @click="$router.push(`/items/${row.item.id}`)"
      >
        <div class="item-cover" :class="'tone-' + categoryMeta(row.item.title).tone">
          <img v-if="row.item.images?.[0]" :src="row.item.images[0]" class="cover-img" alt="" />
          <template v-else>
            <span class="emoji">{{ categoryMeta(row.item.title).emoji }}</span>
          </template>
        </div>
        <div class="item-body">
          <h3 class="item-title">{{ row.item.title }}</h3>
          <div class="price"><span class="yen">¥</span>{{ formatPrice(row.item.price) }}</div>
          <div class="item-meta">
            <span class="chip">{{ row.item.campus }}</span>
            <span>{{ row.item.status }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!loading && !list.length" class="empty-box card">
      <div class="empty-icon">💛</div>
      <p>还没有收藏，去广场逛逛吧</p>
      <el-button type="primary" @click="$router.push('/')">去广场</el-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import http from '../api/http'
import { categoryMeta, formatPrice } from '../utils/display'

const list = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    list.value = await http.get('/favorites')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
}
.item-cover {
  position: relative;
}
</style>
