<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  ApartmentOutlined,
  AuditOutlined,
  BankOutlined,
  ClusterOutlined,
  LockOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import { communityStats } from '@/mock/analytics'
import {
  addNode,
  addOrgUnit,
  childrenOf,
  currentProject,
  currentProjectId,
  deleteNode,
  descendantIds,
  nodePath,
  projectNodes,
  projectRootNodes,
  projectUnits,
  renameNode,
  toggleNode,
  toggleOrgUnit,
  type OrgNode,
  type OrgUnitType,
} from '@/composables/useOrg'

const { message, modal } = App.useApp()

const selectedKeys = ref<string[]>([projectRootNodes.value[0]?.id ?? ''])
const selectedNode = computed<OrgNode>(
  () => projectNodes.value.find((item) => item.id === selectedKeys.value[0]) ?? projectRootNodes.value[0],
)

watch(currentProjectId, () => {
  selectedKeys.value = [projectRootNodes.value[0]?.id ?? '']
})

const statByName = computed(() => new Map(communityStats.map((item) => [item.name, item])))

function subtreeNames(node: OrgNode) {
  const ids = new Set([node.id, ...descendantIds(node.id)])
  return projectNodes.value.filter((item) => ids.has(item.id)).map((item) => item.name)
}

function statsOf(node: OrgNode) {
  const names = subtreeNames(node)
  const matched = names.map((name) => statByName.value.get(name)).filter(Boolean)
  return {
    elders: matched.reduce((sum, item) => sum + (item?.elders ?? 0), 0),
    devices: matched.reduce((sum, item) => sum + (item?.devices ?? 0), 0),
    children: descendantIds(node.id).length,
  }
}

const selectedStats = computed(() => statsOf(selectedNode.value))

const treeData = computed(() => {
  const build = (node: OrgNode): { key: string; title: string; children?: unknown[] } => {
    const children = childrenOf(node.id).map((child) => build(child))
    const stat = statsOf(node)
    const suffix = stat.elders > 0 ? ` · ${stat.elders} 位老人` : ''
    return {
      key: node.id,
      title: `${node.name}${suffix}${node.status === '停用' ? '（已停用）' : ''}`,
      children: children.length > 0 ? children : undefined,
    }
  }
  return projectRootNodes.value.map((node) => build(node))
})

const nodeCount = computed(() => projectNodes.value.length)
const leafCount = computed(
  () => projectNodes.value.filter((item) => childrenOf(item.id).length === 0).length,
)

const addOpen = ref(false)
const renameOpen = ref(false)
const addUnitOpen = ref(false)
const submitting = ref(false)

const addForm = reactive({ parentId: '', name: '' })
const renameForm = reactive({ name: '' })
const unitForm = reactive({ name: '', type: '服务机构' as OrgUnitType })

function openAddChild() {
  addForm.parentId = selectedNode.value?.id ?? ''
  addForm.name = ''
  addOpen.value = true
}

function openRename() {
  renameForm.name = selectedNode.value?.name ?? ''
  renameOpen.value = true
}

function openAddUnit() {
  unitForm.name = ''
  unitForm.type = '服务机构'
  addUnitOpen.value = true
}

async function submitAdd() {
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 220))
  const result = addNode(addForm)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  addOpen.value = false
  if (result.node) selectedKeys.value = [addForm.parentId]
}

async function submitRename() {
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 220))
  const result = renameNode(selectedNode.value.id, renameForm.name)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  renameOpen.value = false
}

async function submitUnit() {
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 220))
  const result = addOrgUnit(unitForm)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  addUnitOpen.value = false
}

function handleToggleNode() {
  const result = toggleNode(selectedNode.value.id)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
}

function handleDeleteNode() {
  const node = selectedNode.value
  modal.confirm({
    title: '删除节点',
    content: `删除「${node.name}」后不可恢复；节点下的老人档案不会迁移，请先确认。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const result = deleteNode(node.id)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      selectedKeys.value = [node.parentId || projectRootNodes.value[0]?.id || '']
      message.success(result.message)
    },
  })
}

function handleToggleUnit(id: string) {
  const result = toggleOrgUnit(id)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
}

const scopeRules = [
  {
    role: '平台运营',
    icon: BankOutlined,
    scope: '跨项目',
    desc: '开通项目、生成专属注册链接、停用项目；默认不查看项目业务数据。',
    tone: 'primary',
  },
  {
    role: '项目管理员',
    icon: ClusterOutlined,
    scope: '本项目',
    desc: '由项目注册链接注册产生；维护本项目节点树、成员账号、权限与审计。',
    tone: 'success',
  },
  {
    role: '项目成员',
    icon: TeamOutlined,
    scope: '所属节点及下级',
    desc: '按所属节点查看并处理老人档案、设备、事件、任务与工单。',
    tone: 'warning',
  },
  {
    role: '民政查看',
    icon: LockOutlined,
    scope: '本项目只读',
    desc: '查看本项目汇总与明细，手机号、证件号等敏感信息脱敏展示。',
    tone: 'muted',
  },
  {
    role: '医保审核员',
    icon: AuditOutlined,
    scope: '证据与结算',
    desc: '查看工单、五要素证据与结算数据；影像证据调阅需填写事由并留痕。',
    tone: 'primary',
  },
]
</script>

<template>
  <div class="org-panel">
    <div class="card tree-card">
      <div class="panel-head">
        <div>
          <h3 class="section-title">组织节点</h3>
          <p class="section-desc">
            共 {{ nodeCount }} 个节点，其中 {{ leafCount }} 个末端节点；名称与层级由项目管理员自定义
          </p>
        </div>
      </div>

      <div class="org-actions">
        <a-tag color="blue" class="project-tag">{{ currentProject.name }}</a-tag>
      </div>
      <div class="org-actions">
        <a-button type="primary" size="small" @click="openAddChild">
          <template #icon><PlusOutlined /></template>
          新增子节点
        </a-button>
        <a-button size="small" @click="openRename">重命名</a-button>
        <a-button
          size="small"
          :danger="selectedNode.status === '启用'"
          :disabled="!selectedNode.parentId"
          @click="handleToggleNode"
        >
          {{ selectedNode.status === '启用' ? '停用节点' : '启用节点' }}
        </a-button>
        <a-button size="small" danger :disabled="!selectedNode.parentId" @click="handleDeleteNode">
          删除节点
        </a-button>
      </div>

      <a-tree
        v-model:selected-keys="selectedKeys"
        :tree-data="treeData"
        :default-expand-all="true"
        block-node
        class="org-tree"
      />

      <a-alert
        class="org-tip"
        type="info"
        show-icon
        message="节点不限定层级"
        description="项目内组织统一为节点，可自行命名为街道、社区、网格、片区等；节点路径用于账号数据域与业务筛选。"
      />
    </div>

    <div class="org-right">
      <div class="card summary-card">
        <div class="summary-head">
          <span class="summary-icon"><ClusterOutlined /></span>
          <div>
            <div class="summary-name">
              {{ selectedNode.name }}
              <a-tag :color="selectedNode.status === '启用' ? 'success' : 'default'" class="summary-tag">
                {{ selectedNode.status }}
              </a-tag>
            </div>
            <div class="summary-level">{{ nodePath(selectedNode) }}</div>
          </div>
        </div>
        <div class="summary-metrics">
          <div class="summary-metric">
            <span class="metric-value">{{ selectedStats.elders }}</span>
            <span class="metric-label">老人档案</span>
          </div>
          <div class="summary-metric">
            <span class="metric-value">{{ selectedStats.devices }}</span>
            <span class="metric-label">接入设备</span>
          </div>
          <div class="summary-metric">
            <span class="metric-value">{{ selectedStats.children }}</span>
            <span class="metric-label">下级节点</span>
          </div>
        </div>
        <div class="summary-scope">
          <ApartmentOutlined />
          <span>{{ selectedNode.name }}及其下级节点的老人档案、设备与事件</span>
        </div>
      </div>

      <div class="card unit-card">
        <div class="panel-head">
          <div>
            <h3 class="section-title">机构池</h3>
            <p class="section-desc">民政局、医保局与服务机构，用于账号归属与代建开户。</p>
          </div>
          <a-button size="small" @click="openAddUnit">
            <template #icon><PlusOutlined /></template>
            新增机构
          </a-button>
        </div>
        <div class="unit-list">
          <div v-for="unit in projectUnits" :key="unit.id" class="unit-row">
            <div>
              <div class="unit-name">{{ unit.name }}</div>
              <div class="unit-meta">
                <a-tag>{{ unit.type }}</a-tag>
                <span v-if="unit.contact">联系人：{{ unit.contact }}</span>
              </div>
            </div>
            <div class="unit-actions">
              <a-tag :color="unit.status === '启用' ? 'success' : 'default'">{{ unit.status }}</a-tag>
              <a-button
                v-if="unit.type === '服务机构'"
                type="link"
                size="small"
                @click="handleToggleUnit(unit.id)"
              >
                {{ unit.status === '启用' ? '停用' : '启用' }}
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <div class="card rule-card">
        <div class="panel-head">
          <div>
            <h3 class="section-title">数据域规则</h3>
            <p class="section-desc">角色决定可见范围，数据域与账号所属节点绑定。</p>
          </div>
        </div>
        <div class="rule-list">
          <div v-for="rule in scopeRules" :key="rule.role" class="rule-item">
            <span class="rule-icon" :class="`tone-${rule.tone}`">
              <component :is="rule.icon" />
            </span>
            <div class="rule-body">
              <div class="rule-title">
                {{ rule.role }}
                <a-tag class="rule-tag" :color="rule.tone === 'muted' ? 'default' : 'blue'">{{ rule.scope }}</a-tag>
              </div>
              <div class="rule-desc">{{ rule.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      v-model:open="addOpen"
      title="新增子节点"
      :width="520"
      ok-text="创建节点"
      :confirm-loading="submitting"
      @ok="submitAdd"
    >
      <a-form layout="vertical">
        <a-form-item label="上级节点" required>
          <a-select
            v-model:value="addForm.parentId"
            :options="projectNodes.map((item) => ({ value: item.id, label: nodePath(item) }))"
            placeholder="请选择上级节点"
          />
        </a-form-item>
        <a-form-item label="节点名称" required>
          <a-input v-model:value="addForm.name" placeholder="如：安康社区、第3网格、东片区" :maxlength="20" />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          :message="`归属项目：${currentProject.name}`"
          description="同一上级节点下不可重名；节点创建后可继续新增下级节点。"
        />
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="renameOpen"
      title="重命名节点"
      :width="520"
      ok-text="保存"
      :confirm-loading="submitting"
      @ok="submitRename"
    >
      <a-form layout="vertical">
        <a-form-item label="节点名称" required>
          <a-input v-model:value="renameForm.name" :maxlength="20" />
        </a-form-item>
        <a-alert
          type="warning"
          show-icon
          message="重命名会影响按名称匹配的业务筛选"
          description="已绑定该节点名称的账号与档案需要同步调整，请谨慎操作。"
        />
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="addUnitOpen"
      title="新增机构"
      :width="520"
      ok-text="创建机构"
      :confirm-loading="submitting"
      @ok="submitUnit"
    >
      <a-form layout="vertical">
        <a-form-item label="机构名称" required>
          <a-input v-model:value="unitForm.name" placeholder="如：安宁区第二护理站" :maxlength="30" />
        </a-form-item>
        <a-form-item label="机构类型" required>
          <a-select
            v-model:value="unitForm.type"
            :options="['民政局', '医保局', '服务机构'].map((item) => ({ value: item, label: item }))"
          />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          message="民政局与医保局为项目基础机构，不可停用；服务机构可在列表中启停。"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.org-panel {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.tree-card {
  padding: 18px 20px 20px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.org-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.project-tag {
  margin-right: auto;
}

.org-tree {
  font-size: 13px;
}

.org-tip {
  margin-top: 12px;
}

.org-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card {
  padding: 18px 20px;
}

.summary-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
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

.summary-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.summary-tag {
  font-size: 10px;
}

.summary-level {
  font-size: 12px;
  color: #8a96a8;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-metric {
  padding: 12px 14px;
  border-radius: 10px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
}

.metric-value {
  display: block;
  font-size: 20px;
  line-height: 26px;
  font-weight: 600;
  color: #1f2937;
}

.metric-label {
  font-size: 12px;
  color: #8a96a8;
}

.summary-scope {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #eef2f7;
  font-size: 12px;
  line-height: 20px;
  color: #5b6779;
}

.unit-card {
  padding: 18px 20px;
}

.unit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #fbfcfe;
}

.unit-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.unit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.unit-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.rule-card {
  padding: 18px 20px 20px;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #eef2f7;
  background: #fbfcfe;
}

.rule-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.rule-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.rule-tag {
  font-size: 10px;
  line-height: 16px;
}

.rule-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 19px;
  color: #8a96a8;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}

.tone-warning {
  color: #d97706;
  background: #fff4e5;
}

.tone-muted {
  color: #5b6779;
  background: #f0f3f7;
}
</style>
