<script setup lang="ts">
import { computed } from 'vue'
import { App } from 'antdv-next'
import { DownloadOutlined, PrinterOutlined } from '@antdv-next/icons'
import QrPlaceholder from '@/components/QrPlaceholder.vue'
import type { House } from '@/mock/elders'

const props = defineProps<{ open: boolean; house: House | null; elderNames: string[] }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const { message } = App.useApp()

const address = computed(() =>
  props.house
    ? `${props.house.community} ${props.house.building} ${props.house.unit} ${props.house.room}`
    : '',
)
const roomCount = computed(() => props.house?.rooms.length ?? 0)
const deviceCount = computed(() =>
  (props.house?.rooms ?? []).reduce((sum, room) => sum + room.devices.length, 0),
)

function close() {
  emit('update:open', false)
}

function printQr() {
  message.success('打印预览已生成（原型模拟）')
}

function downloadQr() {
  message.success('二维码图片已下载（原型模拟）')
}
</script>

<template>
  <a-modal :open="open" :width="480" :footer="null" centered @cancel="close">
    <div class="qr-modal">
      <div class="qr-title">门牌二维码</div>
      <div class="qr-subtitle">扫码可查看老人、房型与设备清单，敏感信息已脱敏</div>

      <div class="qr-body">
        <QrPlaceholder :value="house?.id ?? 'house'" :size="220" label="原型示意，非真实二维码" />
        <div class="qr-address">{{ address }}</div>
        <div class="qr-tags">
          <a-tag v-for="name in elderNames" :key="name" color="blue">{{ name }}</a-tag>
          <a-tag>{{ roomCount }} 个房间</a-tag>
          <a-tag>{{ deviceCount }} 台设备</a-tag>
        </div>
        <div class="qr-note">二维码与房屋唯一绑定，房屋归档后失效</div>
      </div>

      <div class="qr-actions">
        <a-button @click="downloadQr">
          <template #icon><DownloadOutlined /></template>
          下载图片
        </a-button>
        <a-button type="primary" @click="printQr">
          <template #icon><PrinterOutlined /></template>
          打印门牌码
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.qr-modal {
  padding: 4px 4px 0;
}

.qr-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}

.qr-subtitle {
  font-size: 12px;
  line-height: 18px;
  color: var(--elder-text-weak);
  margin-top: 2px;
}

.qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 0 12px;
}

.qr-address {
  font-size: 15px;
  font-weight: 600;
  text-align: center;
}

.qr-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
}

.qr-note {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.qr-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--elder-divider);
}
</style>
