<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  BankOutlined,
  ClusterOutlined,
  CopyOutlined,
  GlobalOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { addAudit, isPlatformAdmin, platformUsers } from '@/composables/useAuth'
import {
  createProject,
  currentProjectId,
  projectNodeCount,
  projects,
  resetRegistrationCode,
  switchProject,
  toggleProject,
  type Project,
} from '@/composables/useOrg'

const router = useRouter()
const { message, modal } = App.useApp()

const createOpen = ref(false)
const linkOpen = ref(false)
const submitting = ref(false)
const linkProjectId = ref('')
const linkProject = computed(
  () => projects.find((item) => item.id === linkProjectId.value) ?? null,
)

const form = reactive({
  city: '',
  district: '',
  dataRegion: '',
  contact: '',
  rootName: '',
})

const stats = computed(() => ({
  total: projects.length,
  running: projects.filter((item) => item.status === '运行').length,
  cities: new Set(projects.map((item) => item.city)).size,
  nodes: projects.reduce((sum, item) => sum + projectNodeCount(item.id).nodes, 0),
}))

const rows = computed(() =>
  projects.map((project) => {
    const count = projectNodeCount(project.id)
    const accounts = platformUsers.filter((item) => item.projectId === project.id).length
    return {
      ...project,
      nodeCount: count.nodes,
      accounts,
    }
  }),
)

type ProjectRow = Project & { nodeCount: number; accounts: number }

const rowKey = (record: ProjectRow) => record.id

const columns = [
  { key: 'project', title: '项目', width: 260 },
  { key: 'city', title: '城市 / 区县', width: 160 },
  { key: 'dataRegion', title: '数据区域', width: 140 },
  { key: 'node', title: '节点数', width: 100 },
  { key: 'accounts', title: '账号数', width: 90 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'createdAt', title: '创建时间', width: 160 },
  { key: 'actions', title: '操作', width: 250 },
]

function registrationLink(code: string) {
  return `${window.location.origin}/register?code=${code}`
}

function openCreate() {
  form.city = ''
  form.district = ''
  form.dataRegion = ''
  form.contact = ''
  form.rootName = ''
  createOpen.value = true
}

async function submitCreate() {
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = createProject(form)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  if (result.project) {
    addAudit('创建项目', result.project.id, '成功', result.project.name)
    linkProjectId.value = result.project.id
    linkOpen.value = true
  }
  message.success(result.message)
  createOpen.value = false
}

function enterProject(project: Project) {
  if (project.status === '停用') {
    message.warning('项目已停用，请先启用')
    return
  }
  const result = switchProject(project.id)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(`已进入 ${project.name}`)
  router.push('/settings?tab=orgs')
}

function openLink(project: Project) {
  linkProjectId.value = project.id
  linkOpen.value = true
}

async function copyLink() {
  if (!linkProject.value) return
  const link = registrationLink(linkProject.value.registrationCode)
  try {
    await navigator.clipboard.writeText(link)
    message.success('注册链接已复制')
    return
  } catch {
    // 浏览器未聚焦或未授权时退回输入框选中复制
  }
  const textarea = document.createElement('textarea')
  textarea.value = link
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (ok) message.success('注册链接已复制')
  else message.warning('复制失败，请手动选择链接复制')
}

function handleResetCode() {
  if (!linkProject.value) return
  modal.confirm({
    title: '重置注册链接',
    content: '重置后旧链接立即失效，已注册的管理员不受影响，是否继续？',
    okText: '重置',
    cancelText: '取消',
    onOk() {
      const project = linkProject.value
      if (!project) return
      const result = resetRegistrationCode(project.id)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      addAudit('重置项目注册码', project.id, '成功', result.code ?? '')
      message.success(result.message)
    },
  })
}

function handleToggle(project: Project) {
  modal.confirm({
    title: project.status === '停用' ? '启用项目' : '停用项目',
    content:
      project.status === '停用'
        ? `启用后「${project.name}」可恢复登录与维护。`
        : `停用后该项目账号无法登录，数据保留但不可访问，是否继续？`,
    okText: project.status === '停用' ? '启用' : '停用',
    okType: project.status === '停用' ? 'primary' : 'danger',
    cancelText: '取消',
    onOk() {
      const result = toggleProject(project.id)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      addAudit('调整项目状态', project.id, '成功', result.message)
      message.success(result.message)
    },
  })
}
</script>

<template>
  <AdminLayout>
    <div class="page project-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">项目管理</h1>
          <p class="page-subtitle">
            一个签约区县一个养老服务项目；平台运营方开通项目并生成专属注册链接，数据在项目之间互相隔离。
          </p>
        </div>
        <div v-if="isPlatformAdmin" class="page-actions">
          <a-button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增项目
          </a-button>
        </div>
      </div>

      <template v-if="!isPlatformAdmin">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无项目管理权限"
            sub-title="项目开通与注册链接仅平台运营方可操作，项目管理员请前往系统设置维护本项目。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <div class="stat-grid">
          <div class="card stat-card">
            <span class="stat-icon tone-primary"><BankOutlined /></span>
            <div>
              <div class="stat-label">项目总数</div>
              <div class="stat-value">{{ stats.total }}</div>
            </div>
          </div>
          <div class="card stat-card">
            <span class="stat-icon tone-success"><GlobalOutlined /></span>
            <div>
              <div class="stat-label">运行中</div>
              <div class="stat-value">{{ stats.running }}</div>
            </div>
          </div>
          <div class="card stat-card">
            <span class="stat-icon tone-purple"><ClusterOutlined /></span>
            <div>
              <div class="stat-label">覆盖城市</div>
              <div class="stat-value">{{ stats.cities }}</div>
            </div>
          </div>
          <div class="card stat-card">
            <span class="stat-icon tone-warning"><TeamOutlined /></span>
            <div>
              <div class="stat-label">项目节点数</div>
              <div class="stat-value">{{ stats.nodes }}</div>
            </div>
          </div>
        </div>

        <a-alert
          class="project-alert"
          type="info"
          show-icon
          message="数据隔离原则"
          description="每个项目独立组织节点、账号体系、业务数据与审计日志；平台运营方默认不查看项目业务数据，跨项目排障需审批并留痕。"
        />

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">项目列表</h3>
              <p class="section-desc">
                当前维护项目：{{ projects.find((item) => item.id === currentProjectId)?.name }}
              </p>
            </div>
            <a-tag color="blue">共 {{ rows.length }} 个项目</a-tag>
          </div>

          <a-table
            :data-source="rows"
            :columns="columns"
            :row-key="rowKey"
            size="middle"
            :pagination="false"
            :scroll="{ x: 1260 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'project'">
                <div class="project-name">
                  {{ record.name }}
                  <a-tag v-if="record.id === currentProjectId" color="blue">当前维护</a-tag>
                </div>
                <div class="project-id mono">{{ record.id }}</div>
              </template>
              <template v-else-if="column.key === 'city'">
                {{ record.city }} · {{ record.district }}
              </template>
              <template v-else-if="column.key === 'dataRegion'">
                <a-tag color="purple">{{ record.dataRegion }}</a-tag>
              </template>
              <template v-else-if="column.key === 'node'">{{ record.nodeCount }}</template>
              <template v-else-if="column.key === 'accounts'">{{ record.accounts }}</template>
              <template v-else-if="column.key === 'createdAt'">{{ record.createdAt }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag
                  :color="record.status === '运行' ? 'success' : record.status === '筹备' ? 'warning' : 'default'"
                >
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4">
                  <a-button type="link" size="small" @click="enterProject(record as Project)">
                    进入项目
                  </a-button>
                  <a-button type="link" size="small" @click="openLink(record as Project)">
                    注册链接
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    :danger="record.status !== '停用'"
                    @click="handleToggle(record as Project)"
                  >
                    {{ record.status === '停用' ? '启用' : '停用' }}
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <a-modal
        v-model:open="createOpen"
        title="新增项目"
        :width="560"
        ok-text="开通项目"
        :ok-button-props="{ disabled: !form.city.trim() || !form.district.trim() }"
        :confirm-loading="submitting"
        @ok="submitCreate"
      >
        <a-alert
          class="create-tip"
          type="info"
          show-icon
          message="开通后自动生成专属注册链接"
          description="项目默认「筹备」状态；把注册链接发给当地政府负责人，对方注册后即成为该项目管理员。"
        />
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="城市" required>
                <a-input v-model:value="form.city" placeholder="如：南京市" :maxlength="20" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="区县" required>
                <a-input v-model:value="form.district" placeholder="如：六合区" :maxlength="20" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="数据区域">
                <a-input v-model:value="form.dataRegion" placeholder="如：华东 · 南京" :maxlength="30" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="联系单位">
                <a-input v-model:value="form.contact" placeholder="如：六合区民政局" :maxlength="30" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="根节点名称">
            <a-input v-model:value="form.rootName" placeholder="默认与区县同名，如：六合区" :maxlength="20" />
            <div class="field-hint">根节点是项目组织树的起点，后续节点由项目管理员自定义。</div>
          </a-form-item>
        </a-form>
      </a-modal>

      <a-modal
        v-model:open="linkOpen"
        title="项目注册链接"
        :width="600"
        :footer="null"
      >
        <template v-if="linkProject">
          <a-alert
            class="create-tip"
            type="success"
            show-icon
            :message="`${linkProject.name} · ${linkProject.city} · ${linkProject.district}`"
            description="把下面的链接发给当地政府负责人；对方打开后完成注册即成为该项目的项目管理员。"
          />
          <a-form layout="vertical">
            <a-form-item label="注册链接">
              <a-input
                :value="registrationLink(linkProject.registrationCode)"
                readonly
                class="link-input"
              >
                <template #prefix><LinkOutlined /></template>
              </a-input>
            </a-form-item>
            <a-form-item label="注册码">
              <a-input :value="linkProject.registrationCode" readonly class="mono" />
            </a-form-item>
          </a-form>
          <div class="link-actions">
            <a-button type="primary" @click="copyLink">
              <template #icon><CopyOutlined /></template>
              复制注册链接
            </a-button>
            <a-button @click="handleResetCode">
              <template #icon><ReloadOutlined /></template>
              重置注册链接
            </a-button>
          </div>
          <div class="field-hint">
            重置后旧链接立即失效；已注册的项目管理员不受影响。链接请通过正式渠道线下交付。
          </div>
        </template>
      </a-modal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.project-page {
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

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
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

.project-alert {
  border-radius: 10px;
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

.project-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-text);
}

.project-id {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.create-tip {
  margin-bottom: 16px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.link-input :deep(input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.link-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
</style>
