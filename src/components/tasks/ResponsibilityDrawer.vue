<script setup lang="ts">
import { computed } from 'vue'
import { SafetyCertificateOutlined } from '@antdv-next/icons'
import { currentUser } from '@/composables/useAuth'

const props = defineProps<{
  open: boolean
  rewardType?: '公益' | '计费'
  agreedBy?: string
  agreedAt?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const operator = computed(() => props.agreedBy ?? currentUser.value?.name ?? '社区管理员')
const agreedAt = computed(() => props.agreedAt ?? '2026-10-28 10:00')
const reward = computed(() => props.rewardType ?? '公益')
</script>

<template>
  <a-drawer v-model:open="visible" title="责任告知" :width="560" destroy-on-hidden>
    <div class="responsibility-body">
      <a-alert
        type="info"
        show-icon
        message="请在派发前向委托人与执行人说明以下内容"
        description="物业接单即视为已知悉本告知，任务详情会保留告知记录。"
      />

      <div class="notice-card">
        <div class="notice-head">
          <SafetyCertificateOutlined />
          <span>服务边界与免责说明</span>
        </div>
        <ol class="notice-list">
          <li>本次任务为社区组织的居家养老协助服务，执行人按检查清单提供上门探视、代购、陪同就医、检查水电或开门配合等协助。</li>
          <li>执行人不提供医疗诊断、治疗与护理操作；如老人出现身体不适，应立即联系家属、社区并拨打 120。</li>
          <li>涉及开门配合时，执行人须核验委托人身份并按约定方式开门；离开时须确认门锁关闭。</li>
          <li>执行过程中禁止拍摄老人面部特写，照片仅用于服务回执，按平台留存策略保存与销毁。</li>
          <li>公益协助不收取费用；计费服务仅登记金额与支付方式，平台不代收代付。</li>
          <li>因老人或家属隐瞒重要信息、拒绝配合导致的后果，按双方约定与相关法律处理。</li>
        </ol>
      </div>

      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="报酬方式">
          <a-tag :color="reward === '公益' ? 'green' : 'blue'">{{ reward }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="告知人">{{ operator }}</a-descriptions-item>
        <a-descriptions-item label="告知时间">{{ agreedAt }}</a-descriptions-item>
        <a-descriptions-item label="文本版本">v2.0-20261028</a-descriptions-item>
      </a-descriptions>

      <div class="responsibility-foot">
        <a-button type="primary" @click="visible = false">我已阅读</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.responsibility-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-card {
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid #d6e6ff;
  background: #f7fbff;
}

.notice-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f6feb;
}

.notice-list {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 21px;
  color: #5b6779;
}

.notice-list li {
  margin-bottom: 6px;
}

.responsibility-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
}
</style>
