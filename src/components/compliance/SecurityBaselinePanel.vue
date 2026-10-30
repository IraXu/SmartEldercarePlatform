<script setup lang="ts">
import { computed, ref } from 'vue'
import { App } from 'antdv-next'
import {
  CheckCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@antdv-next/icons'
import {
  baselineItems,
  handleSecurityAlert,
  isComplianceAdmin,
  saveSecuritySettings,
  securityAlerts,
  securitySettings,
  type BaselineStatus,
  type SecurityAlert,
} from '@/composables/useCompliance'

const { message, modal } = App.useApp()

const saving = ref(false)

const statusColors: Record<BaselineStatus, string> = {
  已满足: 'success',
  待整改: 'error',
  联调中: 'warning',
}

const satisfiedCount = computed(() => baselineItems.filter((item) => item.status === '已满足').length)
const pendingCount = computed(() => baselineItems.filter((item) => item.status === '待整改').length)
const tuningCount = computed(() => baselineItems.filter((item) => item.status === '联调中').length)
const score = computed(() => Math.round((satisfiedCount.value / baselineItems.length) * 100))

const sessionOptions = [15, 30, 60].map((item) => ({ value: item, label: `${item} 分钟` }))

const baselineColumns = [
  { key: 'name', title: '检查项', width: 180 },
  { key: 'requirement', title: '要求', width: 300 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'note', title: '说明', width: 300 },
  { key: 'actions', title: '操作', width: 100 },
]

const alertColumns = [
  { key: 'time', title: '时间', width: 160 },
  { key: 'type', title: '类型', width: 140 },
  { key: 'target', title: '对象', width: 200 },
  { key: 'risk', title: '风险', width: 90 },
  { key: 'detail', title: '说明', width: 320 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'actions', title: '操作', width: 110 },
]

const riskColors: Record<string, string> = {
  高: 'red',
  中: 'orange',
  低: 'blue',
}

async function handleSave() {
  saving.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = saveSecuritySettings({ sessionTimeout: securitySettings.sessionTimeout })
  saving.value = false
  if (result.ok) message.success(result.message)
  else message.error(result.message)
}

function handleBaselineAction(status: BaselineStatus, name: string) {
  if (status === '已满足') return
  modal.info({
    title: `${name} · 整改建议`,
    content:
      status === '待整改'
        ? '正式环境需将密码策略提升为至少 8 位并包含字母与数字，原型保留 6 位便于评审。'
        : '该检查项依赖外部系统联调，待医保监管字段清单确认后关闭。',
    okText: '知道了',
  })
}

function handleAlert(alert: SecurityAlert) {
  modal.confirm({
    title: '标记告警为已处理',
    content: `确认已核实「${alert.type}」并完成处置？标记后将记录处理人与时间。`,
    okText: '确认处理',
    cancelText: '取消',
    onOk() {
      const result = handleSecurityAlert(alert.id)
      if (result.ok) message.success(result.message)
      else message.error(result.message)
    },
  })
}

function exportReport() {
  modal.confirm({
    title: '导出安全基线报告',
    content: '将生成当前基线满足率、检查项与告警摘要，导出行为写入审计。',
    okText: '确认导出',
    cancelText: '取消',
    onOk() {
      message.success('报告已生成（模拟）')
    },
  })
}

const exportTip = '该项为安全基线强制要求，不允许关闭'
</script>

<template>
  <div class="security-panel">
    <div class="score-card card">
      <div class="score-left">
        <a-progress
          type="circle"
          :percent="score"
          :size="104"
          :stroke-color="score >= 90 ? '#0E9384' : '#D97706'"
        />
        <div class="score-text">
          <div class="score-title">安全基线满足率</div>
          <div class="score-desc">共 {{ baselineItems.length }} 项适用检查项，最近检查 2026-10-28 09:30</div>
          <div class="score-tags">
            <a-tag color="success">已满足 {{ satisfiedCount }}</a-tag>
            <a-tag color="error">待整改 {{ pendingCount }}</a-tag>
            <a-tag color="warning">联调中 {{ tuningCount }}</a-tag>
          </div>
        </div>
      </div>
      <div class="score-right">
        <a-alert
          v-if="pendingCount > 0"
          type="warning"
          show-icon
          message="存在待整改项"
          description="建议在等保测评前完成密码策略升级与医保字段清单确认。"
        />
        <a-button @click="exportReport">
          <template #icon><DownloadOutlined /></template>
          导出基线报告
        </a-button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-head">
        <div>
          <h3 class="section-title">基线检查项</h3>
          <p class="section-desc">覆盖登录安全、会话、密码、导出、脱敏、日志留存与第三方授权。</p>
        </div>
        <a-tag color="blue"><SafetyCertificateOutlined /> 产品侧自查</a-tag>
      </div>
      <a-table
        :data-source="baselineItems"
        :columns="baselineColumns"
        row-key="key"
        :pagination="false"
        :scroll="{ x: 990 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="baseline-name">{{ record.name }}</span>
          </template>
          <template v-else-if="column.key === 'requirement'">
            <span>{{ record.requirement }}</span>
          </template>
          <template v-else-if="column.key === 'note'">
            <span class="text-secondary">{{ record.note }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status as BaselineStatus]">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              v-if="record.status !== '已满足'"
              type="link"
              size="small"
              @click="handleBaselineAction(record.status as BaselineStatus, record.name)"
            >
              去处理
            </a-button>
            <span v-else class="text-weak">—</span>
          </template>
        </template>
      </a-table>
    </div>

    <div class="security-body">
      <div class="card setting-card">
        <div class="table-head">
          <div>
            <h3 class="section-title">安全设置</h3>
            <p class="section-desc">会话与导出管控的全局配置，保存后写入审计日志。</p>
          </div>
        </div>

        <a-form layout="vertical">
          <a-form-item label="会话超时">
            <a-select
              v-model:value="securitySettings.sessionTimeout"
              :options="sessionOptions"
              :disabled="!isComplianceAdmin"
              style="width: 200px"
            />
            <div class="field-hint">无操作超过该时长自动退出登录。</div>
          </a-form-item>
          <a-form-item label="登录失败锁定">
            <a-input value="连续 5 次失败锁定 15 分钟" disabled style="width: 260px" />
            <div class="field-hint">固定安全基线，不支持调整。</div>
          </a-form-item>
          <a-form-item label="导出水印">
            <a-switch v-model:checked="securitySettings.exportWatermark" disabled />
            <span class="switch-hint">{{ exportTip }}</span>
          </a-form-item>
          <a-form-item label="导出二次确认">
            <a-switch v-model:checked="securitySettings.exportConfirm" disabled />
            <span class="switch-hint">{{ exportTip }}</span>
          </a-form-item>
        </a-form>

        <div class="setting-foot">
          <a-button
            type="primary"
            :disabled="!isComplianceAdmin"
            :loading="saving"
            @click="handleSave"
          >
            <template #icon><SaveOutlined /></template>
            {{ saving ? '保存中…' : '保存设置' }}
          </a-button>
        </div>
      </div>

      <div class="card alert-card">
        <div class="table-head">
          <div>
            <h3 class="section-title">安全告警</h3>
            <p class="section-desc">批量导出、异地登录、越权访问与授权到期提醒，告警不可删除。</p>
          </div>
          <a-tag color="warning">
            <WarningOutlined /> 待处理 {{ securityAlerts.filter((item) => item.status === '待处理').length }}
          </a-tag>
        </div>

        <a-table
          :data-source="securityAlerts"
          :columns="alertColumns"
          row-key="id"
          :pagination="false"
          :scroll="{ x: 1120 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              <span class="mono">{{ record.time }}</span>
            </template>
            <template v-else-if="column.key === 'type'">
              <a-tag>{{ record.type }}</a-tag>
            </template>
            <template v-else-if="column.key === 'target'">
              <span>{{ record.target }}</span>
            </template>
            <template v-else-if="column.key === 'detail'">
              <span class="text-secondary">{{ record.detail }}</span>
            </template>
            <template v-else-if="column.key === 'risk'">
              <a-tag :color="riskColors[record.risk]">{{ record.risk }}</a-tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="record.status === '待处理' ? 'warning' : 'default'">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button
                v-if="record.status === '待处理'"
                type="link"
                size="small"
                @click="handleAlert(record as SecurityAlert)"
              >
                标记已处理
              </a-button>
              <span v-else class="text-weak">已处理</span>
            </template>
          </template>
        </a-table>

        <div class="alert-foot">
          <ExclamationCircleOutlined />
          <span>告警处理结果写入审计日志，并同步至 M0 审计列表。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.security-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
}

.score-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.score-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.score-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #8a96a8;
}

.score-tags {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.score-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-right :deep(.ant-alert) {
  max-width: 420px;
}

.table-card {
  padding: 18px 20px 12px;
}

.table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.baseline-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.security-body {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.setting-card,
.alert-card {
  padding: 18px 20px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8a96a8;
}

.switch-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #8a96a8;
}

.setting-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px dashed #eef2f7;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.alert-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
  font-size: 12px;
  color: #8a96a8;
}

@media (max-width: 1400px) {
  .security-body {
    grid-template-columns: 1fr;
  }
  .score-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
