<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: string; size?: number; label?: string }>()

const cells = 25

function buildMatrix(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  let state = hash >>> 0
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const matrix = Array.from({ length: cells }, () => Array.from({ length: cells }, () => false))
  const setFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4
        matrix[startY + y][startX + x] = edge || inner
      }
    }
  }
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      matrix[y][x] = rand() > 0.55
    }
  }
  setFinder(0, 0)
  setFinder(cells - 7, 0)
  setFinder(0, cells - 7)
  return matrix
}

const flatCells = computed(() => buildMatrix(props.value).flat())
const size = computed(() => props.size ?? 220)
</script>

<template>
  <div class="qr-wrap">
    <div
      class="qr-grid"
      :style="{
        width: `${size}px`,
        height: `${size}px`,
        gridTemplateColumns: `repeat(${cells}, 1fr)`,
        gridTemplateRows: `repeat(${cells}, 1fr)`,
      }"
    >
      <span v-for="(cell, index) in flatCells" :key="index" :class="['qr-cell', { filled: cell }]" />
    </div>
    <div v-if="label" class="qr-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qr-grid {
  display: grid;
  padding: 10px;
  background: #fff;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
}

.qr-cell {
  display: block;
  width: 100%;
  height: 100%;
  background: #fff;
}

.qr-cell.filled {
  background: #14213d;
}

.qr-label {
  font-size: 12px;
  color: var(--elder-text-weak);
}
</style>
