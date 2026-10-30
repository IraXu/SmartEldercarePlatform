<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { App } from 'antdv-next'
import {
  ApiOutlined,
  BankOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FireOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  SettingOutlined,
} from '@antdv-next/icons'
import {
  integrations,
  isComplianceAdmin,
  saveIntegrationConfig,
  toggleIntegration,
  type Integration,
  type IntegrationStatus,
} from '@/composables/useCompliance'
import { addAudit } from '@/composables/useAuth'

const { message, modal } = App.useApp()

const integrationIcons: Record<string, typeof BankOutlined> = {
  civil: BankOutlined,
  insurance: MedicineBoxOutlined,
  address: EnvironmentOutlined,
  emergency120: PhoneOutlined,
  emergency119: FireOutlined,
}

const statusColors: Record<IntegrationStatus, string> = {
  已启用: 'success',
  未启用: 'default',
  联调中: 'warning',
}

const scopeOptions = [
  '老人基础档案',
  '事件统计',
  '设备覆盖统计',
  '工单摘要',
  '证据索引',
  '签认结果',
  '标准地址',
  '门牌信息',
  '事件摘要',
  '老人地址',
  '联系人',
].map((item) => ({ value: item, label: item }))

const frequencyOptions = ['实时', '每日 02:00', '每周一 03:00', '事件触发'].map((item) => ({
  value: item,
  label: item,
}))

const testingKey = ref('')
const configOpen = ref(false)
const activeIntegration = ref<Integration | null>(null)
const submitting = ref(false)
const configForm = reactive({
  scope: [] as string[],
  frequency: '',
  endpoint: '',
  contact: '',
})

const disableOpen = ref(false)
const disableTarget = ref<Integration | null>(null)
const disableReason = ref('')

function handleToggle(integration: Integration, checked: unknown) {
  if (Boolean(checked)) {
    modal.confirm({
      title: '启用外部集成',
      content: `启用后平台将按已配置的数据范围与「${integration.name}」交换数据，是否继续？`,
      okText: '确认启用',
      cancelText: '取消',
      onOk() {
        const result = toggleIntegration(integration.key, true)
        if (result.ok) message.success(result.message)
        else message.error(result.message)
      },
    })
    return
  }
  disableTarget.value = integration
  disableReason.value = ''
  disableOpen.value = true
}

async function confirmDisable() {
  if (!disableTarget.value) return
  if (!disableReason.value.trim()) {
    message.warning('请填写关闭原因')
    return
  }
  const result = toggleIntegration(disableTarget.value.key, false, disableReason.value)
  if (result.ok) message.success(result.message)
  else message.error(result.message)
  disableOpen.value = false
}

async function testConnection(integration: Integration) {
  testingKey.value = integration.key
  await new Promise((resolve) => window.setTimeout(resolve, 800))
  testingKey.value = ''
  if (integration.status === '未启用') {
    message.warning('集成未启用，请先启用后再测试')
    return
  }
  message.success('连接正常（模拟）')
  addAudit('集成测试', integration.name, '成功', '模拟连通性检查通过')
}

function openConfig(integration: Integration) {
  activeIntegration.value = integration
  configForm.scope = [...integration.scope]
  configForm.frequency = integration.frequency
  configForm.endpoint = integration.endpoint
  configForm.contact = integration.contact
  configOpen.value = true
}

async function handleSaveConfig() {
  if (!activeIntegration.value) return
  if (configForm.scope.length === 0) {
    message.warning('请至少选择一项数据范围')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = saveIntegrationConfig(activeIntegration.value.key, { ...configForm })
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  configOpen.value = false
}

const enabledCount = computed(() => integrations.filter((item) => item.status !== '未启用').length)
</script>

<template>
  <div class="integration-panel">
    <a-alert
      type="info"
      show-icon
      message="本期仅提供集成配置与模拟测试，不产生真实外部调用"
      description="正式对接需完成安全评估、白名单与数据共享协议。120/119 仅在 L3 事件触发，不允许手工批量调用。"
    />

    <div class="integration-head">
      <div class="head-text">
        <span class="head-strong">{{ enabledCount }}</span>
        <span> / {{ integrations.length }} 个集成已启用</span>
      </div>
      <a-tag color="blue">配置变更全部写入审计</a-tag>
    </div>

    <div class="integration-grid">
      <div v-for="item in integrations" :key="item.key" class="card integration-card">
        <div class="card-head">
          <span class="integration-icon"><component :is="integrationIcons[item.key]" /></span>
          <div class="card-title">
            <div class="integration-name">{{ item.name }}</div>
            <a-tag :color="statusColors[item.status as IntegrationStatus]">{{ item.status }}</a-tag>
          </div>
          <a-switch
            class="integration-switch"
            :checked="item.status !== '未启用'"
            :disabled="!isComplianceAdmin"
            @change="handleToggle(item, $event)"
          />
        </div>

        <div class="integration-desc">{{ item.desc }}</div>

        <div class="integration-meta">
          <div class="meta-row">
            <span class="meta-label">共享方向</span>
            <a-tag>{{ item.direction }}</a-tag>
          </div>
          <div class="meta-row">
            <span class="meta-label">数据范围</span>
            <div class="scope-tags">
              <a-tag v-for="scope in item.scope" :key="scope" color="cyan">{{ scope }}</a-tag>
            </div>
          </div>
          <div class="meta-row">
            <span class="meta-label">同步频率</span>
            <span class="meta-value">{{ item.frequency }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">最近同步</span>
            <span class="meta-value">{{ item.lastSync }}</span>
          </div>
        </div>

        <div class="card-foot">
          <a-button size="small" :disabled="!isComplianceAdmin" @click="openConfig(item)">
            <template #icon><SettingOutlined /></template>
            配置
          </a-button>
          <a-button
            size="small"
            :loading="testingKey === item.key"
            :disabled="item.status === '未启用'"
            @click="testConnection(item)"
          >
            <template #icon><ApiOutlined /></template>
            {{ testingKey === item.key ? '测试中…' : '测试连接' }}
          </a-button>
        </div>
      </div>
    </div>

    <a-drawer v-model:open="configOpen" :title="`集成配置 · ${activeIntegration?.name ?? ''}`" :width="560" destroy-on-hidden>
      <div v-if="activeIntegration" class="config-body">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="当前状态">
            <a-tag :color="statusColors[activeIntegration.status as IntegrationStatus]">
              {{ activeIntegration.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="共享方向">{{ activeIntegration.direction }}</a-descriptions-item>
          <a-descriptions-item label="最近同步">{{ activeIntegration.lastSync }}</a-descriptions-item>
        </a-descriptions>

        <a-form layout="vertical">
          <a-form-item label="数据范围" required>
            <a-checkbox-group v-model:value="configForm.scope" :options="scopeOptions" class="scope-group" />
          </a-form-item>
          <a-form-item label="同步频率" required>
            <a-select v-model:value="configForm.frequency" :options="frequencyOptions" />
          </a-form-item>
          <a-form-item label="接口地址">
            <a-input v-model:value="configForm.endpoint" placeholder="https://" />
            <div class="field-hint">接口地址需使用 HTTPS，并在政务网白名单内。</div>
          </a-form-item>
          <a-form-item label="业务联系人">
            <a-input v-model:value="configForm.contact" placeholder="对接单位与联系人" />
          </a-form-item>
        </a-form>

        <a-alert
          type="warning"
          show-icon
          message="保存后立即生效"
          description="数据范围变更会影响对外共享内容，请与对接单位确认后再保存。"
        />

        <div class="config-foot">
          <a-button @click="configOpen = false">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="handleSaveConfig">
            {{ submitting ? '保存中…' : '保存配置' }}
          </a-button>
        </div>
      </div>
    </a-drawer>

    <a-modal
      v-model:open="disableOpen"
      title="关闭外部集成"
      :width="480"
      ok-text="确认关闭"
      :ok-button-props="{ danger: true }"
      destroy-on-hidden
      @ok="confirmDisable"
    >
      <div class="disable-body">
        <a-alert
          type="warning"
          show-icon
          message="关闭后将停止数据交换"
          :description="`关闭「${disableTarget?.name ?? ''}」后，平台不再向对方推送或拉取数据，历史数据保留。`"
        />
        <div class="reason-label">关闭原因 <span class="required">*</span></div>
        <a-textarea
          v-model:value="disableReason"
          :rows="3"
          :maxlength="100"
          show-count
          placeholder="请说明关闭原因，便于审计追溯"
        />
        <div class="sync-tip">
          <CheckCircleOutlined />
          <span>重新启用后可恢复原有数据范围与频率配置。</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.integration-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.integration-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.head-text {
  font-size: 13px;
  color: #5b6779;
}

.head-strong {
  font-size: 20px;
  font-weight: 600;
  color: #1f6feb;
}

.integration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.integration-card {
  padding: 18px 20px;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.integration-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #1f6feb;
  background: #eaf1fe;
}

.card-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.integration-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.integration-switch {
  flex-shrink: 0;
}

.integration-desc {
  margin-top: 10px;
  min-height: 38px;
  font-size: 12px;
  line-height: 19px;
  color: #8a96a8;
}

.integration-meta {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
}

.meta-label {
  flex-shrink: 0;
  width: 64px;
  color: #8a96a8;
}

.meta-value {
  color: #5b6779;
}

.scope-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
}

.config-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scope-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 0;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8a96a8;
}

.config-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px dashed #eef2f7;
}

.disable-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reason-label {
  font-size: 13px;
  color: #5b6779;
}

.required {
  color: #d64545;
}

.sync-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a96a8;
}

@media (max-width: 1400px) {
  .integration-grid {
    grid-template-columns: 1fr;
  }
}
</style>
