export function conditionLabel(c) {
  return (
    {
      like_new: '几乎全新',
      good: '轻微使用',
      fair: '明显使用',
      poor: '有瑕疵',
    }[c] || c
  )
}

export function statusLabel(s) {
  return (
    {
      on_sale: '在售',
      sold: '已售',
      off: '已下架',
      pending: '待确认',
      agreed: '约定中',
      completed: '已完成',
      cancelled: '已取消',
    }[s] || s
  )
}

const CATEGORY_META = {
  数码: { emoji: '📱', tone: 0 },
  图书教材: { emoji: '📚', tone: 1 },
  服饰鞋包: { emoji: '👟', tone: 2 },
  生活日用: { emoji: '🏠', tone: 3 },
  运动户外: { emoji: '⚽', tone: 4 },
  其他: { emoji: '✨', tone: 5 },
}

export function categoryMeta(name) {
  return CATEGORY_META[name] || { emoji: '🛒', tone: (name || '').length % 6 }
}

export function formatPrice(n) {
  const num = Number(n)
  if (Number.isNaN(num)) return '0'
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}
