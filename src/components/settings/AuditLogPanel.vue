<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { App } from 'antdv-next'
import {
  DownloadOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@antdv-next/icons'
import { addAudit, auditLogs, type AuditLog } from '@/composables/useAuth'

const { message, modal } = App.useApp()

const auditActions = [
  '登录',
  '登录失败',
  '退出登录',
  '注册申请',
  '审核通过',
  '审核驳回',
  '停用账号',
  '启用账号',
  '重置密码',
  '找回密码',
  '权限保存',
  '通知配置',
  '新增用户',
  '导出',
  '隐私配置',
]

const actionOptions = auditActions.map((item) => ({ value: item, label: item }))
const resultOptions = ['成功', '失败', '待审核'].map((item) => ({ value: item, label: item }))
const rangeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '近 7 天' },
]

const filters = reactive({
  keyword: '',
  action: undefined as string | undefined,
  result: undefined as string | undefined,
  range: 'all',
})
const applied = ref({ ...filters })

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  const today = dateString(new Date())
  const weekAgo = dateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))
  return auditLogs.filter((item) => {
    if (condition.action && item.action !== condition.action) return false
    if (condition.result && item.result !== condition.result) return false
    const day = item.time.slice(0, 10)
    if (condition.range === 'today' && day !== today) return false
    if (condition.range === 'week' && day < weekAgo) return false
    if (keyword && !`${item.operator}${item.target}${item.note}`.toLowerCase().includes(keyword)) {
      return false
    }
    return true
  })
})

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.action = undefined
  filters.result = undefined
  filters.range = 'all'
  applied.value = { ...filters }
}

const columns = [
  { key: 'time', title: '时间', width: 160 },
  { key: 'operator', title: '操作人', width: 120 },
  { key: 'role', title: '角色', width: 120 },
  { key: 'action', title: '动作', width: 120 },
  { key: 'target', title: '对象', width: 170 },
  { key: 'result', title: '结果', width: 100 },
  { key: 'ip', title: 'IP', width: 130 },
  { key: 'note', title: '备注', width: 260 },
]

const resultColors: Record<string, string> = {
  成功: 'success',
  失败: 'error',
  待审核: 'warning',
}

function handleExport() {
  modal.confirm({
    title: '导出审计日志',
    content: `将导出当前筛选结果 ${filtered.value.length} 条记录。审计日志导出同样会写入审计，是否继续？`,
    okText: '确认导出',
    cancelText: '取消',
    onOk() {
      addAudit('导出', '审计日志', '成功', `导出审计日志 ${filtered.value.length} 条`)
      message.success('导出任务已创建（原型不生成文件）')
    },
  })
}
</script>

<template>
  <div class="audit-panel">
    <div class="card filter-card">
      <div class="filter-row">
        <a-input
          v-model:value="filters.keyword"
          class="filter-keyword"
          placeholder="搜索操作人 / 对象 / 备注"
          allow-clear
          @press-enter="applyFilters"
        >
          <template #prefix><SearchOutlined class="text-weak" /></template>
        </a-input>
        <a-select v-model:value="filters.range" class="filter-select" :options="rangeOptions" />
        <a-select
          v-model:value="filters.action"
          class="filter-select"
          :options="actionOptions"
          placeholder="全部动作"
          allow-clear
        />
        <a-select
          v-model:value="filters.result"
          class="filter-select"
          :options="resultOptions"
          placeholder="全部结果"
          allow-clear
        />
        <a-button type="primary" @click="applyFilters">查询</a-button>
        <a-button @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
        <div class="filter-spacer" />
        <a-button type="primary" ghost @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          导出日志
        </a-button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-head">
        <div>
          <h3 class="section-title">审计日志</h3>
          <p class="section-desc">记录登录、注册审核、账号状态、权限、通知与导出等关键操作，日志不可编辑或删除。</p>
        </div>
        <a-tag color="blue"><FileSearchOutlined /> 共 {{ filtered.length }} 条</a-tag>
      </div>

      <a-table
        :data-source="filtered"
        :columns="columns"
        :row-key="(record: AuditLog) => record.id"
        :scroll="{ x: 1180 }"
        :pagination="{ pageSize: 10, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
        :locale="{ emptyText: '暂无符合条件的审计记录' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'time'">
            <span class="mono">{{ record.time }}</span>
          </template>
          <template v-else-if="column.key === 'operator'">
            <span class="operator">{{ record.operator }}</span>
          </template>
          <template v-else-if="column.key === 'role'">
            <span class="text-secondary">{{ record.role }}</span>
          </template>
          <template v-else-if="column.key === 'target'">
            <span class="target">{{ record.target }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-tag>{{ record.action }}</a-tag>
          </template>
          <template v-else-if="column.key === 'result'">
            <a-tag :color="resultColors[record.result] ?? 'default'">{{ record.result }}</a-tag>
          </template>
          <template v-else-if="column.key === 'ip'">
            <span class="mono text-weak">{{ record.ip }}</span>
          </template>
          <template v-else-if="column.key === 'note'">
            <span class="note">{{ record.note || '-' }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<style scoped>
.audit-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-keyword {
  width: 260px;
}

.filter-select {
  width: 150px;
}

.filter-spacer {
  flex: 1;
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

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.operator {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.target {
  font-size: 12px;
  color: #5b6779;
}

.note {
  font-size: 12px;
  color: #5b6779;
}
</style>
