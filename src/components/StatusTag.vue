<script setup lang="ts">
import { computed } from 'vue'
import type { ElderStatus, EventLevel } from '@/mock/elders'

const props = defineProps<{ status?: ElderStatus; level?: EventLevel }>()

const statusColor = computed(() => {
  if (props.status === '正常') return 'green'
  if (props.status === '待完善') return 'orange'
  return 'default'
})

const levelColor = computed(() => {
  if (props.level === 'L3') return 'red'
  if (props.level === 'L2') return 'orange'
  return 'blue'
})

const label = computed(() => props.status ?? props.level ?? '')
</script>

<template>
  <a-tag v-if="status" :color="statusColor" :style="{ borderRadius: '4px' }">{{ label }}</a-tag>
  <a-tag v-else :color="levelColor" :style="{ borderRadius: '4px' }">{{ label }}</a-tag>
</template>
