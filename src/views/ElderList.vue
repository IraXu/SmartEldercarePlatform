<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { activeCommunities, businessNodeOptions, projectNodes } from '@/composables/useOrg'
import {
  AlertOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import RiskTag from '@/components/RiskTag.vue'
import StatusTag from '@/components/StatusTag.vue'
import ElderFormDrawer from '@/components/ElderFormDrawer.vue'
import ImportModal from '@/components/ImportModal.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import {
  disabilityOptions,
  elders,
  maskIdCard,
  maskPhone,
  riskTagOptions,
  statusOptions,
  type Elder,
  type ElderStatus,
  type Disability,
} from '@/mock/elders'

const route = useRoute()
const router = useRouter()
const { message, modal } = App.useApp()

type SearchMode = 'person' | 'house' | 'relation'

const searchMode = ref<SearchMode>('person')
const initialLoading = ref(true)
const queryLoading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const formOpen = ref(false)
const editingElder = ref<Elder | null>(null)
const importOpen = ref(false)
const highlightId = ref('')

const filters = reactive({
  keyword: '',
  community: '',
  nodeName: '',
  building: '',
  room: '',
  relationKeyword: '',
  relationType: '',
  region: [] as string[],
  riskTags: [] as string[],
  disability: undefined as Disability | undefined,
  status: undefined as ElderStatus | undefined,
})

const applied = ref({ ...filters, region: [] as string[], riskTags: [] as string[] })

function applyRegionQuery() {
  const community = String(route.query.community ?? '')
  const grid = String(route.query.grid ?? '')
  if (!community && !grid) return
  searchMode.value = 'person'
  filters.region = [
    String(route.query.district ?? '安宁区'),
    String(route.query.street ?? '安康街道'),
    community,
    grid,
  ]
  applied.value = { ...filters, region: [...filters.region], riskTags: [...filters.riskTags] }
}

onMounted(() => {
  applyRegionQuery()
  window.setTimeout(() => {
    initialLoading.value = false
  }, 600)
})

watch(() => route.query.community, applyRegionQuery)
watch(() => route.query.grid, applyRegionQuery)

const projectNodeTotal = computed(
  () => projectNodes.value.filter((item) => item.parentId).length,
)

const stats = computed(() => {
  if (demoState.value === 'empty') {
    return { total: 0, keyCount: 0, completeness: '0.0', newCount: 0 }
  }
  const total = elders.length
  const keyCount = elders.filter((item) =>
    item.riskTags.some((tag) => ['独居', '空巢', '失能', '高龄'].includes(tag)),
  ).length
  const completeness = (
    elders.reduce((sum, item) => sum + item.completeness, 0) / Math.max(1, total)
  ).toFixed(1)
  return { total, keyCount, completeness, newCount: Math.round(total * 0.05) }
})

const filtered = computed(() => {
  if (demoState.value === 'empty') return []
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  const relationKeyword = condition.relationKeyword.trim().toLowerCase()
  const list = elders.filter((item) => {
    if (condition.status) {
      if (item.status !== condition.status) return false
    } else if (item.status === '已归档') {
      return false
    }
    if (condition.nodeName) {
      if (item.community !== condition.nodeName && item.grid !== condition.nodeName) return false
    }
    if (condition.region.length > 0) {
      const [district, street, community, grid] = condition.region
      if (district && item.district !== district) return false
      if (street && item.street !== street) return false
      if (community && item.community !== community) return false
      if (grid && item.grid !== grid) return false
    }
    if (condition.riskTags.length > 0 && !condition.riskTags.every((tag) => item.riskTags.includes(tag))) {
      return false
    }
    if (condition.disability && item.disability !== condition.disability) return false
    if (searchMode.value === 'person') {
      if (!keyword) return true
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.phone.includes(keyword) ||
        item.idCard.slice(-4).includes(keyword) ||
        item.room.includes(keyword)
      )
    }
    if (searchMode.value === 'house') {
      if (condition.community && !item.community.includes(condition.community)) return false
      if (condition.building && !item.building.includes(condition.building)) return false
      if (condition.room && !item.room.includes(condition.room)) return false
      return true
    }
    if (!relationKeyword && !condition.relationType) return true
    return item.relations.some((relation) => {
      const nameMatch = !relationKeyword
        ? true
        : relation.name.toLowerCase().includes(relationKeyword) ||
          relation.phone.slice(-4).includes(relationKeyword)
      const typeMatch = !condition.relationType ? true : relation.relation === condition.relationType
      return nameMatch && typeMatch
    })
  })
  const riskOrder: Record<string, number> = { 高风险: 0, 中风险: 1, 低风险: 2 }
  return list.sort((a, b) => {
    if (a.id === highlightId.value) return -1
    if (b.id === highlightId.value) return 1
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    if (riskDiff !== 0) return riskDiff
    return b.updatedAt.localeCompare(a.updatedAt)
  })
})

const effectiveLoading = computed(
  () => initialLoading.value || queryLoading.value || demoState.value === 'loading',
)

const hasResult = computed(() => filtered.value.length > 0)

const emptyTitle = computed(() =>
  applied.value.keyword ||
  applied.value.relationKeyword ||
  applied.value.community ||
  applied.value.building ||
  applied.value.room ||
  applied.value.riskTags.length ||
  applied.value.disability ||
  applied.value.region.length
    ? '没有找到符合条件的老人档案'
    : '辖区还没有老人档案',
)

function goDetail(record: Elder) {
  if (demoState.value === 'forbidden') {
    message.warning('当前账号无权查看该辖区档案')
    return
  }
  router.push(`/elders/${record.id}`)
}

function rowClick(record: Elder) {
  return {
    onClick: () => goDetail(record),
  }
}

function applyFilters() {
  highlightId.value = ''
  applied.value = {
    ...filters,
    region: [...filters.region],
    riskTags: [...filters.riskTags],
  }
  page.value = 1
  queryLoading.value = true
  window.setTimeout(() => {
    queryLoading.value = false
  }, 360)
  if (demoState.value === 'forbidden') {
    message.warning('当前账号无权查看该辖区档案')
  }
}

function resetFilters() {
  highlightId.value = ''
  filters.keyword = ''
  filters.community = ''
  filters.nodeName = ''
  filters.building = ''
  filters.room = ''
  filters.relationKeyword = ''
  filters.relationType = ''
  filters.region = []
  filters.riskTags = []
  filters.disability = undefined
  filters.status = undefined
  applied.value = { ...filters, region: [], riskTags: [] }
  page.value = 1
}

function handleTableChange(pagination: { current?: number; pageSize?: number }) {
  page.value = pagination.current ?? 1
  pageSize.value = pagination.pageSize ?? 10
}

function openCreate() {
  editingElder.value = null
  formOpen.value = true
}

function openEdit(record: Elder) {
  editingElder.value = record
  formOpen.value = true
}

function handleSaved(saved: Elder) {
  const isCreate = !editingElder.value
  formOpen.value = false
  if (isCreate) {
    searchMode.value = 'person'
    resetFilters()
    highlightId.value = saved.id
    document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  message.success(isCreate ? `档案已保存，编号 ${saved.id}` : '档案已保存')
}

function rowClassName(record: Elder) {
  return record.id === highlightId.value ? 'row-highlight' : ''
}

function openImport() {
  importOpen.value = true
}

function handleImported(count: number) {
  importOpen.value = false
  message.success(`成功导入 ${count} 条档案`)
}

function handleExport() {
  modal.confirm({
    title: '导出老人档案',
    content: '将按当前筛选条件导出档案，敏感字段按当前角色脱敏，操作会记录审计日志。',
    okText: '确认导出',
    cancelText: '取消',
    onOk: () => {
      message.success('导出任务已创建，文件生成后可在导出记录中下载')
    },
  })
}

function completenessColor(value: number) {
  if (value < 60) return '#D64545'
  if (value < 80) return '#D97706'
  return '#2E9E5B'
}

function sharedHouse(record: Elder) {
  return elders.filter((item) => item.houseId === record.houseId).length > 1
}

const columns = [
  { key: 'elder', title: '老人', width: 190, fixed: 'left' as const },
  { key: 'address', title: '居住地址', width: 280 },
  { key: 'riskTags', title: '风险标签', width: 230 },
  { key: 'disability', title: '失能等级', width: 110 },
  { key: 'devices', title: '设备', width: 110 },
  { key: 'lastEvent', title: '最近事件', width: 210 },
  { key: 'completeness', title: '档案完整度', width: 150 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'actions', title: '操作', width: 180, fixed: 'right' as const },
]
</script>

<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">老人档案</h1>
          <p class="page-subtitle">一人一档 · 一房一图 · 辖区共 {{ stats.total.toLocaleString() }} 位老人</p>
        </div>
        <div v-if="!isCivil" class="page-actions">
          <a-button @click="openImport">
            <template #icon><ImportOutlined /></template>
            导入档案
          </a-button>
          <a-button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增档案
          </a-button>
        </div>
      </div>

      <a-alert
        v-if="isCivil"
        type="info"
        show-icon
        class="readonly-alert"
        message="民政只读视角"
        description="当前视角仅支持查询、查看与脱敏导出，新增、编辑、建模与归档入口已隐藏。"
      />

      <div class="stat-grid">
        <div class="stat-card card">
          <div class="stat-icon blue"><UserOutlined /></div>
          <div>
            <div class="stat-label">辖区老人</div>
            <div class="stat-value">{{ stats.total.toLocaleString() }}</div>
            <div class="stat-hint">覆盖 {{ activeCommunities.length }} 个节点（共 {{ projectNodeTotal }} 个）</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon orange"><TeamOutlined /></div>
          <div>
            <div class="stat-label">重点老人</div>
            <div class="stat-value">{{ stats.keyCount.toLocaleString() }}</div>
            <div class="stat-hint">独居、空巢、失能、高龄</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon green"><CheckCircleOutlined /></div>
          <div>
            <div class="stat-label">档案完整率</div>
            <div class="stat-value">{{ stats.completeness }}%</div>
            <div class="stat-hint">目标 ≥ 95%</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon cyan"><PlusCircleOutlined /></div>
          <div>
            <div class="stat-label">本月新增</div>
            <div class="stat-value">{{ stats.newCount }}</div>
            <div class="stat-hint">较上月 +12</div>
          </div>
        </div>
      </div>

      <div class="filter-card card">
        <a-tabs v-model:activeKey="searchMode" class="filter-tabs" @change="applyFilters">
          <a-tab-pane key="person" tab="以人查" />
          <a-tab-pane key="house" tab="以房查" />
          <a-tab-pane key="relation" tab="以关系查" />
        </a-tabs>

        <div class="filter-row">
          <template v-if="searchMode === 'person'">
            <a-input
              v-model:value="filters.keyword"
              allow-clear
              class="filter-keyword"
              placeholder="姓名 / 手机号 / 身份证后四位 / 门牌号"
              @press-enter="applyFilters"
            >
              <template #prefix><SearchOutlined class="text-weak" /></template>
            </a-input>
            <a-select
              v-model:value="filters.nodeName"
              :options="businessNodeOptions"
              placeholder="所属节点"
              class="filter-region"
              show-search
              allow-clear
            />
            <a-select
              v-model:value="filters.riskTags"
              mode="multiple"
              :options="riskTagOptions.map((item) => ({ value: item, label: item }))"
              placeholder="风险标签"
              class="filter-tags"
              :max-tag-count="1"
              allow-clear
            />
            <a-select
              v-model:value="filters.disability"
              :options="disabilityOptions.map((item) => ({ value: item, label: item }))"
              placeholder="失能等级"
              class="filter-small"
              allow-clear
            />
            <a-select
              v-model:value="filters.status"
              :options="statusOptions.map((item) => ({ value: item, label: item }))"
              placeholder="档案状态"
              class="filter-small"
              allow-clear
            />
          </template>

          <template v-else-if="searchMode === 'house'">
            <a-select
              v-model:value="filters.community"
              :options="activeCommunities.map((item) => ({ value: item.name, label: item.name }))"
              placeholder="选择社区"
              class="filter-region"
              allow-clear
            />
            <a-input v-model:value="filters.building" allow-clear placeholder="楼栋，如 3栋" class="filter-small" />
            <a-input v-model:value="filters.room" allow-clear placeholder="房号，如 401" class="filter-small" />
            <a-select
              v-model:value="filters.status"
              :options="statusOptions.map((item) => ({ value: item, label: item }))"
              placeholder="档案状态"
              class="filter-small"
              allow-clear
            />
          </template>

          <template v-else>
            <a-input
              v-model:value="filters.relationKeyword"
              allow-clear
              class="filter-keyword"
              placeholder="关系人姓名 / 手机号后四位"
            >
              <template #prefix><SearchOutlined class="text-weak" /></template>
            </a-input>
            <a-select
              v-model:value="filters.relationType"
              :options="['儿子', '女儿', '配偶', '监护人', '主要照护者', '网格员'].map((item) => ({ value: item, label: item }))"
              placeholder="关系类型"
              class="filter-small"
              allow-clear
            />
            <a-select
              v-model:value="filters.nodeName"
              :options="businessNodeOptions"
              placeholder="所属节点"
              class="filter-region"
              show-search
              allow-clear
            />
          </template>

          <div class="filter-actions">
            <a-button type="primary" :loading="queryLoading" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">重置</a-button>
          </div>
        </div>
      </div>

      <div class="list-card card">
        <div class="list-toolbar">
          <div class="list-summary">
            共 <strong>{{ stats.total.toLocaleString() }}</strong> 条，当前筛选
            <strong>{{ filtered.length.toLocaleString() }}</strong> 条
          </div>
          <div class="toolbar-actions">
            <a-button size="small" @click="handleExport">
              <template #icon><ExportOutlined /></template>
              导出
            </a-button>
          </div>
        </div>

        <div v-if="demoState === 'forbidden'" class="state-block">
          <a-result
            status="403"
            title="当前账号无权查看该辖区档案"
            sub-title="请切换辖区，或联系项目管理员申请数据权限。"
          >
            <template #extra>
              <a-button type="primary" @click="demoState = 'normal'">返回正常数据</a-button>
            </template>
          </a-result>
        </div>

        <div v-else-if="demoState === 'error'" class="state-block">
          <a-result status="warning" title="档案加载失败" sub-title="请检查网络后重试，已保留当前筛选条件。">
            <template #extra>
              <a-button type="primary" @click="demoState = 'normal'">重试</a-button>
            </template>
          </a-result>
        </div>

        <div v-else-if="effectiveLoading" class="state-block loading-block">
          <a-skeleton active :paragraph="{ rows: 8 }" />
        </div>

        <div v-else-if="demoState === 'empty' || !hasResult" class="state-block">
          <a-empty
            :description="
              demoState === 'empty'
                ? '辖区还没有老人档案'
                : emptyTitle
            "
          >
            <template #description>
              <div class="empty-title">{{ demoState === 'empty' ? '辖区还没有老人档案' : emptyTitle }}</div>
              <div class="empty-desc">
                {{ demoState === 'empty' ? '新增或导入档案，建立第一份底账' : '调整筛选条件后再试' }}
              </div>
            </template>
            <div class="empty-actions">
              <template v-if="demoState === 'empty'">
                <a-button v-if="!isCivil" type="primary" @click="openCreate">新增档案</a-button>
                <a-button v-if="!isCivil" @click="openImport">导入档案</a-button>
              </template>
              <a-button v-else @click="resetFilters">清空筛选条件</a-button>
            </div>
          </a-empty>
        </div>

        <a-table
          v-else
          :data-source="filtered"
          :columns="columns"
          :row-key="(record: Elder) => record.id"
          :scroll="{ x: 1560 }"
          :on-row="rowClick"
          :row-class-name="rowClassName"
          :pagination="{
            current: page,
            pageSize,
            total: filtered.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total: number) => `共 ${total} 条`,
            size: 'small',
          }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'elder'">
              <div class="elder-cell">
                <a-avatar
                  :size="36"
                  :style="{
                    background: record.riskLevel === '高风险' ? '#FDECEC' : '#EAF1FE',
                    color: record.riskLevel === '高风险' ? '#D64545' : '#1F6FEB',
                    fontWeight: 600,
                  }"
                >
                  {{ record.name.slice(0, 1) }}
                </a-avatar>
                <div class="elder-main">
                  <div class="elder-name">
                    {{ isCivil ? record.name.slice(0, 1) + '**' : record.name }}
                    <span class="elder-meta">{{ record.gender }} · {{ record.age }}岁</span>
                    <a-tag v-if="sharedHouse(record)" color="default" class="shared-tag">同住</a-tag>
                  </div>
                  <div class="elder-id">{{ isCivil ? maskIdCard(record.idCard) : record.id }}</div>
                </div>
              </div>
            </template>

            <template v-else-if="column.key === 'address'">
              <div class="address-main">{{ record.community }} · {{ record.grid }}</div>
              <div class="address-sub">{{ record.building }} {{ record.unit }} {{ record.room }}</div>
            </template>

            <template v-else-if="column.key === 'riskTags'">
              <div class="tag-line">
                <RiskTag v-for="tag in record.riskTags.slice(0, 3)" :key="tag" :tag="tag" />
                <a-tag v-if="record.riskTags.length > 3" color="default">+{{ record.riskTags.length - 3 }}</a-tag>
                <span v-if="record.riskTags.length === 0" class="text-weak">—</span>
              </div>
            </template>

            <template v-else-if="column.key === 'disability'">
              <span :class="{ 'text-weak': record.disability === '未评估' }">{{ record.disability }}</span>
            </template>

            <template v-else-if="column.key === 'devices'">
              <span v-if="record.devicesTotal === 0" class="text-weak">未接入</span>
              <span v-else>
                <span
                  :class="[
                    'status-dot',
                    record.devicesOnline === 0 ? 'warning' : record.devicesOnline < record.devicesTotal ? 'warning' : 'online',
                  ]"
                />
                {{ record.devicesOnline }}/{{ record.devicesTotal }} 在线
              </span>
            </template>

            <template v-else-if="column.key === 'lastEvent'">
              <div v-if="record.lastEvent" class="event-cell">
                <StatusTag :level="record.lastEvent.level" />
                <span class="event-type">{{ record.lastEvent.type }}</span>
                <span class="event-time">{{ record.lastEvent.time }}</span>
              </div>
              <span v-else class="text-weak">暂无</span>
            </template>

            <template v-else-if="column.key === 'completeness'">
              <div class="completeness-cell">
                <a-progress
                  :percent="record.completeness"
                  :show-info="false"
                  :stroke-color="completenessColor(record.completeness)"
                  size="small"
                  class="completeness-bar"
                />
                <span :style="{ color: completenessColor(record.completeness) }">
                  {{ record.completeness }}%
                </span>
              </div>
            </template>

            <template v-else-if="column.key === 'status'">
              <StatusTag :status="record.status" />
            </template>

            <template v-else-if="column.key === 'actions'">
              <div class="row-actions" @click.stop>
                <a-button type="link" size="small" @click="goDetail(record)">查看</a-button>
                <template v-if="!isCivil">
                  <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" @click="router.push(`/elders/${record.id}/house`)">建模</a-button>
                </template>
              </div>
            </template>
          </template>
        </a-table>
      </div>

      <ElderFormDrawer
        :open="formOpen"
        :elder="editingElder"
        @update:open="formOpen = $event"
        @saved="handleSaved"
      />

      <ImportModal :open="importOpen" @update:open="importOpen = $event" @imported="handleImported" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.readonly-alert {
  margin-top: 16px;
  border-radius: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 20px;
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-icon.blue {
  background: #eaf1fe;
  color: #1f6feb;
}

.stat-icon.orange {
  background: #fff4e5;
  color: #d97706;
}

.stat-icon.green {
  background: #eaf7ef;
  color: #2e9e5b;
}

.stat-icon.cyan {
  background: #e6f7f7;
  color: #13a8a8;
}

.stat-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 18px;
}

.stat-value {
  font-size: 26px;
  line-height: 34px;
  font-weight: 600;
  color: var(--elder-text);
}

.stat-hint {
  font-size: 11px;
  line-height: 16px;
  color: var(--elder-text-weak);
}

.filter-card {
  margin-top: 16px;
  padding: 16px 20px 20px;
}

.filter-tabs {
  margin-bottom: 4px;
}

.filter-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}

.filter-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 8px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-keyword {
  width: 320px;
}

.filter-region {
  width: 240px;
}

.filter-tags {
  width: 220px;
}

.filter-small {
  width: 150px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.list-card {
  margin-top: 16px;
  overflow: hidden;
}

.list-toolbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--elder-divider);
}

.list-summary {
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.list-summary strong {
  color: var(--elder-text);
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.state-block {
  padding: 32px 24px 40px;
}

.loading-block {
  padding: 28px 24px 40px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--elder-text);
  line-height: 24px;
}

.empty-desc {
  font-size: 13px;
  color: var(--elder-text-weak);
  line-height: 22px;
  margin-top: 4px;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
}

.elder-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.elder-main {
  min-width: 0;
}

.elder-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--elder-text);
  line-height: 22px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.elder-meta {
  font-size: 12px;
  font-weight: 400;
  color: var(--elder-text-weak);
}

.shared-tag {
  border-radius: 4px;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.elder-id {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 16px;
}

.address-main {
  font-size: 13px;
  line-height: 20px;
  color: var(--elder-text);
}

.address-sub {
  font-size: 12px;
  line-height: 18px;
  color: var(--elder-text-secondary);
}

.tag-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 0;
}

.tag-line :deep(.ant-tag) {
  margin-inline-end: 6px;
}

.event-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.event-type {
  font-size: 12px;
  color: var(--elder-text);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  font-size: 11px;
  color: var(--elder-text-weak);
  flex-shrink: 0;
}

.completeness-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.completeness-bar {
  width: 76px;
  margin: 0;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.row-actions :deep(.ant-btn-link) {
  padding-inline: 4px;
}

:deep(.row-highlight > td) {
  background: #fff9e6 !important;
}
</style>
