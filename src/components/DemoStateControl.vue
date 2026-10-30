<script setup lang="ts">
import { ref } from 'vue'
import { demoState, type DemoState } from '@/composables/useAppState'

const expanded = ref(false)

const options: Array<{ value: DemoState; label: string }> = [
  { value: 'normal', label: '正常数据' },
  { value: 'loading', label: '加载中' },
  { value: 'empty', label: '空数据' },
  { value: 'error', label: '加载失败' },
  { value: 'forbidden', label: '无权限' },
]
</script>

<template>
  <div class="demo-wrap">
    <div v-if="expanded" class="demo-panel">
      <div class="demo-head">
        <span class="demo-title">原型演示</span>
        <a class="demo-collapse" @click="expanded = false">收起</a>
      </div>
      <a-select v-model:value="demoState" size="small" :options="options" style="width: 100%" />
      <div class="demo-hint">仅用于评审，不属于产品功能</div>
    </div>
    <button class="demo-toggle" :class="{ active: expanded }" @click="expanded = !expanded">原型</button>
  </div>
</template>

<style scoped>
.demo-wrap {
  position: fixed;
  right: 24px;
  bottom: 90px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.demo-toggle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--elder-border);
  background: rgba(255, 255, 255, 0.96);
  color: var(--elder-text-secondary);
  font-size: 11px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(15, 42, 71, 0.14);
}

.demo-toggle.active {
  border-color: var(--elder-primary);
  color: var(--elder-primary);
}

.demo-panel {
  width: 188px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid var(--elder-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 42, 71, 0.12);
}

.demo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.demo-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--elder-text-secondary);
}

.demo-collapse {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.demo-hint {
  margin-top: 8px;
  font-size: 11px;
  line-height: 16px;
  color: var(--elder-text-weak);
}
</style>
