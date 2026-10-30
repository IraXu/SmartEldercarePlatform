<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ tag: string; size?: 'default' | 'small' }>()

const colorMap: Record<string, string> = {
  独居: 'red',
  空巢: 'orange',
  失能: 'volcano',
  高龄: 'gold',
  低保: 'blue',
  特困: 'magenta',
  家庭养老床位: 'cyan',
  长护险: 'green',
}

const color = computed(() => colorMap[props.tag] ?? 'default')
</script>

<template>
  <a-tag :color="color" :style="{ marginInlineEnd: '6px', borderRadius: '4px' }">{{ tag }}</a-tag>
</template>
