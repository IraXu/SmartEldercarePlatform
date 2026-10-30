<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import LeadHandleModal from '@/components/audit/LeadHandleModal.vue'
import { hasPermission } from '@/composables/useAuth'
import {
  auditLeads,
  leadStats,
  riskColor,
  type AuditLead,
  type LeadStatus,
  type LeadType,
  type RiskLevel,
} from '@/composables/useEvidence'

const router = useRouter()

const canView = computed(() => hasPermission('audit'))

const typeOptions = (
  ['集中异常', '重复申报', '影像缺失', '金额异常', '设备离线'] as LeadType[]
).map((item) => ({ value: item, label: item }))
const riskOptions = (['高', '中', '低'] as RiskLevel[]).map((item) => ({
  value: item,
  label: `${item}风险`,
}))
const statusOptions = (['待处理', '处理中', '已关闭'] as LeadStatus[]).map((item) => ({
  value: item,
  label: item,
}))

const filters = reactive({
  keyword: '',
  type: undefined as LeadType | undefined,
  risk: undefined as RiskLevel | undefined,
  status: undefined as LeadStatus | undefined,
})
const applied = ref({ ...filters })

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  const weight: Record<RiskLevel, number> = { 高: 0, 中: 1, 低: 2 }
  return auditLeads
    .filter((item) => {
      if (condition.type && item.type !== condition.type) return false
      if (condition.risk && item.risk !== condition.risk) return false
      if (condition.status && item.status !== condition.status) return false
      if (keyword && !`${item.id}${item.target}${item.description}`.toLowerCase().includes(keyword)) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const gap = weight[a.risk] - weight[b.risk]
      if (gap !== 0) return gap
      return b.foundAt.localeCompare(a.foundAt)
    })
})

const columns = [
  { key: 'id', title: '线索编号', width: 150 },
  { key: 'type', title: '类型', width: 120 },
  { key: 'target', title: '涉及对象', width: 200 },
  { key: 'description', title: '线索描述', width: 300 },
  { key: 'related', title: '关联工单', width: 160 },
  { key: 'risk', title: '风险', width: 90 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'foundAt', title: '发现时间', width: 150 },
  { key: 'actions', title: '操作', width: 140 },
]

const stats = computed(() => [
  { key: 'pending', label: '待处理', value: leadStats.value.pending, icon: FileSearchOutlined, tone: 'primary' },
  { key: 'high', label: '高风险', value: leadStats.value.high, icon: AlertOutlined, tone: 'danger' },
  { key: 'month', label: '本月新增', value: leadStats.value.month, icon: SearchOutlined, tone: 'purple' },
  { key: 'closed', label: '已关闭', value: leadStats.value.closed, icon: CheckCircleOutlined, tone: 'success' },
])

const drawerOpen = ref(false)
const activeLead = ref<AuditLead | null>(null)
const handleOpen = ref(false)

function openDetail(lead: AuditLead) {
  activeLead.value = lead
  drawerOpen.value = true
}

function openHandle(lead: AuditLead) {
  activeLead.value = lead
  handleOpen.value = true
}

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.type = undefined
  filters.risk = undefined
  filters.status = undefined
  applied.value = { ...filters }
}
</script>

<template>
  <AdminLayout>
    <div class="page lead-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">稽核线索</h1>
          <p class="page-subtitle">
            基于机审、结算与证据数据主动生成线索；高风险线索 3 个工作日内处置。
          </p>
        </div>
        <div v-if="canView" class="page-actions">
          <a-button @click="router.push('/audit/workorders')">返回待审工单</a-button>
        </div>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无稽核权限"
            sub-title="稽核线索面向医保审核员与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <a-alert
          v-if="leadStats.high > 0"
          type="error"
          show-icon
          :message="`有 ${leadStats.high} 条高风险线索，请 3 个工作日内处置`"
          description="高风险线索涉及集中时长不足、影像缺失等基金风险，需优先转人工复核。"
        />

        <div class="stat-grid">
          <div v-for="card in stats" :key="card.key" class="card stat-card">
            <span class="stat-icon" :class="`tone-${card.tone}`">
              <component :is="card.icon" />
            </span>
            <div>
              <div class="stat-label">{{ card.label }}</div>
              <div class="stat-value">{{ card.value }}</div>
            </div>
          </div>
        </div>

        <div class="card filter-card">
          <div class="filter-row">
            <a-input
              v-model:value="filters.keyword"
              class="filter-keyword"
              placeholder="搜索线索编号 / 对象 / 描述"
              allow-clear
              @press-enter="applyFilters"
            >
              <template #prefix><SearchOutlined class="text-weak" /></template>
            </a-input>
            <a-select
              v-model:value="filters.type"
              class="filter-select"
              :options="typeOptions"
              placeholder="全部类型"
              allow-clear
            />
            <a-select
              v-model:value="filters.risk"
              class="filter-select-sm"
              :options="riskOptions"
              placeholder="全部风险"
              allow-clear
            />
            <a-select
              v-model:value="filters.status"
              class="filter-select-sm"
              :options="statusOptions"
              placeholder="全部状态"
              allow-clear
            />
            <a-button type="primary" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
          </div>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">线索列表</h3>
              <p class="section-desc">按风险与发现时间排序；点击线索查看触发规则与关联工单。</p>
            </div>
            <a-tag color="blue">共 {{ filtered.length }} 条</a-tag>
          </div>

          <a-table
            :data-source="filtered"
            :columns="columns"
            :row-key="(record: AuditLead) => record.id"
            size="middle"
            :scroll="{ x: 1380 }"
            :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
            :locale="{ emptyText: '暂无符合条件的稽核线索' }"
            :on-row="(record: AuditLead) => ({ onClick: () => openDetail(record), style: 'cursor: pointer' })"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'id'">
                <span class="mono">{{ record.id }}</span>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag>{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'target'">
                {{ record.target }}
              </template>
              <template v-else-if="column.key === 'description'">
                <span class="lead-desc">{{ record.description }}</span>
              </template>
              <template v-else-if="column.key === 'related'">
                <span v-if="record.related.length === 0" class="text-weak">-</span>
                <a
                  v-for="item in record.related"
                  :key="item"
                  class="related-link"
                  @click.stop="router.push(`/audit/workorders/${item}`)"
                >
                  {{ item }}
                </a>
              </template>
              <template v-else-if="column.key === 'risk'">
                <a-tag :color="riskColor(record.risk as RiskLevel)">{{ record.risk }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === '待处理' ? 'warning' : record.status === '处理中' ? 'blue' : 'default'">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'foundAt'">{{ record.foundAt }}</template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4" @click.stop>
                  <a-button type="link" size="small" @click.stop="openDetail(record as AuditLead)">
                    查看
                  </a-button>
                  <a-button
                    v-if="record.status !== '已关闭'"
                    type="link"
                    size="small"
                    @click.stop="openHandle(record as AuditLead)"
                  >
                    处置
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <a-drawer
        v-model:open="drawerOpen"
        title="线索详情"
        :width="620"
        placement="right"
      >
        <div v-if="activeLead" class="drawer-body">
          <div class="drawer-head">
            <div>
              <div class="drawer-title">{{ activeLead.id }}</div>
              <div class="drawer-sub">{{ activeLead.type }} · {{ activeLead.target }}</div>
            </div>
            <a-tag :color="riskColor(activeLead.risk)">{{ activeLead.risk }}风险</a-tag>
          </div>

          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="线索描述">{{ activeLead.description }}</a-descriptions-item>
            <a-descriptions-item label="触发规则">{{ activeLead.rule }}</a-descriptions-item>
            <a-descriptions-item label="建议动作">{{ activeLead.suggestion }}</a-descriptions-item>
            <a-descriptions-item label="发现时间">{{ activeLead.foundAt }}</a-descriptions-item>
            <a-descriptions-item label="当前状态">{{ activeLead.status }}</a-descriptions-item>
            <a-descriptions-item v-if="activeLead.conclusion" label="关闭结论">
              {{ activeLead.conclusion }}
            </a-descriptions-item>
          </a-descriptions>

          <div class="drawer-block">
            <div class="drawer-block-title">关联工单</div>
            <div v-if="activeLead.related.length === 0" class="text-weak">无关联工单</div>
            <div v-else class="related-list">
              <a
                v-for="item in activeLead.related"
                :key="item"
                class="related-card"
                @click="router.push(`/audit/workorders/${item}`)"
              >
                <span class="mono">{{ item }}</span>
                <span class="related-more">查看取证 →</span>
              </a>
            </div>
          </div>

          <div class="drawer-block">
            <div class="drawer-block-title">处置记录</div>
            <a-timeline v-if="activeLead.records.length > 0">
              <a-timeline-item
                v-for="item in activeLead.records"
                :key="`${item.time}-${item.action}`"
                :color="item.tone ?? 'blue'"
              >
                <div class="record-title">{{ item.action }} · {{ item.operator }}</div>
                <div class="record-meta">{{ item.time }}</div>
                <div v-if="item.note" class="record-note">{{ item.note }}</div>
              </a-timeline-item>
            </a-timeline>
            <div v-else class="text-weak">暂无处置记录</div>
          </div>

          <div v-if="activeLead.status !== '已关闭'" class="drawer-footer">
            <a-button type="primary" @click="openHandle(activeLead)">处置线索</a-button>
          </div>
        </div>
      </a-drawer>

      <LeadHandleModal v-model:open="handleOpen" :lead="activeLead" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.lead-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forbidden-card {
  padding: 48px 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-danger {
  color: #d64545;
  background: #fdecec;
}

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
}

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}

.stat-label {
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.stat-value {
  font-size: 21px;
  line-height: 26px;
  font-weight: 600;
  color: #1f2937;
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

.filter-select-sm {
  width: 130px;
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

.lead-desc {
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.related-link {
  display: block;
  font-size: 12px;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.drawer-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.drawer-block-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  background: #fafcff;
}

.related-more {
  font-size: 11px;
  color: var(--elder-primary);
}

.record-title {
  font-size: 13px;
  color: var(--elder-text);
}

.record-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.record-note {
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.drawer-footer {
  padding-top: 12px;
  border-top: 1px solid var(--elder-divider);
  text-align: right;
}
</style>
