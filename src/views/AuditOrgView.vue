<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  BankOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { addAudit, currentUser } from '@/composables/useAuth'
import { auditOrgs, auditStaff, type AuditStaff } from '@/composables/useEvidence'

const router = useRouter()
const { message } = App.useApp()

const role = computed(() => currentUser.value?.role ?? '')
const canView = computed(() =>
  ['platform_admin', 'insurance_auditor', 'civil_viewer'].includes(role.value),
)
const readonly = computed(() => role.value === 'civil_viewer')

const selectedOrg = ref<string>('')

const stats = computed(() => {
  const compliance =
    auditStaff.reduce((sum, item) => sum + item.compliance, 0) / (auditStaff.length || 1)
  const expiring =
    auditOrgs.filter((item) => item.status !== '有效').length +
    auditStaff.filter((item) => item.status !== '正常').length
  return [
    { key: 'org', label: '定点机构', value: auditOrgs.length, icon: BankOutlined, tone: 'primary' },
    { key: 'staff', label: '在册人员', value: auditStaff.length, icon: TeamOutlined, tone: 'purple' },
    {
      key: 'compliance',
      label: '平均合规率',
      value: `${compliance.toFixed(1)}%`,
      icon: SafetyCertificateOutlined,
      tone: 'success',
    },
    { key: 'expiring', label: '临期资质', value: expiring, icon: WarningOutlined, tone: 'warning' },
  ]
})

const staffList = computed(() =>
  selectedOrg.value
    ? auditStaff.filter((item) => item.org === selectedOrg.value)
    : auditStaff,
)

const columns = [
  { key: 'name', title: '姓名', width: 110 },
  { key: 'org', title: '机构', width: 200 },
  { key: 'title', title: '岗位', width: 110 },
  { key: 'qualifications', title: '资质项目', width: 240 },
  { key: 'license', title: '证件有效期', width: 130 },
  { key: 'orders', title: '接单量', width: 90 },
  { key: 'compliance', title: '合规率', width: 90 },
  { key: 'rating', title: '评分', width: 80 },
  { key: 'status', title: '状态', width: 90 },
]

function toggleOrg(id: string) {
  selectedOrg.value = selectedOrg.value === id ? '' : id
}

function handleExport() {
  addAudit('导出机构台账', '机构与人员', '成功', `${auditOrgs.length} 家机构 · ${auditStaff.length} 名人员`)
  message.success('机构台账导出任务已创建（模拟）')
}
</script>

<template>
  <AdminLayout>
    <div class="page org-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">机构与人员</h1>
          <p class="page-subtitle">
            定点资格、合规率与人员资质统一台账；合规率 = 通过审核工单 / 纳入审核工单。
          </p>
        </div>
        <div v-if="canView" class="page-actions">
          <a-tag v-if="readonly" color="default">民政查看 · 只读</a-tag>
          <a-button @click="router.push('/audit/workorders')">返回待审工单</a-button>
          <a-button v-if="!readonly" type="primary" ghost @click="handleExport">导出机构台账</a-button>
        </div>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无机构管理权限"
            sub-title="机构与人员面向医保审核员、民政查看与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
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

        <div class="org-grid">
          <div
            v-for="org in auditOrgs"
            :key="org.id"
            class="card org-card"
            :class="{ 'org-active': selectedOrg === org.name }"
            @click="toggleOrg(org.name)"
          >
            <div class="org-head">
              <div>
                <div class="org-name">{{ org.name }}</div>
                <div class="org-sub">{{ org.license }} · 有效期至 {{ org.validUntil }}</div>
              </div>
              <a-tag :color="org.status === '有效' ? 'success' : org.status === '临期' ? 'warning' : 'error'">
                {{ org.status }}
              </a-tag>
            </div>

            <div class="org-metric">
              <span class="org-metric-label">合规率</span>
              <a-progress
                :percent="org.compliance"
                :show-info="false"
                size="small"
                :stroke-color="org.compliance >= 90 ? '#2e9e5b' : '#d97706'"
              />
              <span class="org-metric-value">{{ org.compliance.toFixed(1) }}%</span>
            </div>

            <div class="org-numbers">
              <div class="org-number">
                <div class="org-number-value">{{ org.score.toFixed(1) }}</div>
                <div class="org-number-label">绩效评分</div>
              </div>
              <div class="org-number">
                <div class="org-number-value">{{ org.orders }}</div>
                <div class="org-number-label">本月审核工单</div>
              </div>
              <div class="org-number">
                <div class="org-number-value">{{ org.exceptions }}</div>
                <div class="org-number-label">异常工单</div>
              </div>
              <div class="org-number">
                <div class="org-number-value">{{ org.staffCount }}</div>
                <div class="org-number-label">在册人员</div>
              </div>
            </div>

            <div class="org-foot">{{ org.address }}</div>
          </div>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">
                人员资质与绩效
                <span v-if="selectedOrg" class="table-filter">已筛选：{{ selectedOrg }}</span>
              </h3>
              <p class="section-desc">点击上方机构卡筛选人员；资质到期前 60 天标记为临期。</p>
            </div>
            <a-space>
              <a-button v-if="selectedOrg" size="small" @click="selectedOrg = ''">查看全部机构</a-button>
              <a-tag color="blue">共 {{ staffList.length }} 人</a-tag>
            </a-space>
          </div>

          <a-table
            :data-source="staffList"
            :columns="columns"
            :row-key="(record: AuditStaff) => `${record.org}-${record.name}`"
            size="middle"
            :pagination="false"
            :locale="{ emptyText: '该机构暂无在册人员' }"
            :scroll="{ x: 1100 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <span class="staff-name">{{ record.name }}</span>
              </template>
              <template v-else-if="column.key === 'org'">{{ record.org }}</template>
              <template v-else-if="column.key === 'title'">{{ record.title }}</template>
              <template v-else-if="column.key === 'qualifications'">
                <div class="qual-row">
                  <a-tag v-for="item in record.qualifications.slice(0, 3)" :key="item" color="blue">
                    {{ item }}
                  </a-tag>
                  <a-tag v-if="record.qualifications.length > 3" color="default">
                    +{{ record.qualifications.length - 3 }}
                  </a-tag>
                </div>
              </template>
              <template v-else-if="column.key === 'license'">
                <span :class="{ 'license-warning': record.status === '临期' }">
                  {{ record.validUntil }}
                </span>
              </template>
              <template v-else-if="column.key === 'orders'">{{ record.orders }}</template>
              <template v-else-if="column.key === 'compliance'">
                {{ record.compliance.toFixed(1) }}%
              </template>
              <template v-else-if="column.key === 'rating'">{{ record.rating.toFixed(1) }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === '正常' ? 'success' : record.status === '临期' ? 'warning' : 'error'">
                  {{ record.status }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.org-page {
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

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
}

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}

.tone-warning {
  color: #d97706;
  background: #fff4e5;
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

.org-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.org-card {
  padding: 18px 20px;
  cursor: pointer;
  transition: border-color 0.18s ease;
}

.org-card:hover,
.org-active {
  border-color: var(--elder-primary);
}

.org-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.org-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--elder-text);
}

.org-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--elder-text-weak);
}

.org-metric {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.org-metric-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
  flex: none;
}

.org-metric :deep(.ant-progress) {
  flex: 1;
  margin: 0;
}

.org-metric-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-text);
}

.org-numbers {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.org-number {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f9fc;
}

.org-number-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--elder-text);
}

.org-number-label {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.org-foot {
  margin-top: 12px;
  font-size: 11px;
  color: var(--elder-text-weak);
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

.table-filter {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--elder-primary);
}

.staff-name {
  font-weight: 600;
  color: var(--elder-text);
}

.qual-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.license-warning {
  color: var(--elder-warning);
  font-weight: 600;
}
</style>
