<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { App } from 'antdv-next'
import { DeleteOutlined, EditOutlined, PlusOutlined, TagsOutlined, UserOutlined } from '@antdv-next/icons'
import { currentProject } from '@/composables/useOrg'
import {
  addDictItem,
  addStaff,
  exceptionTypeDict,
  removeDictItem,
  removeStaff,
  serviceItemDict,
  serviceItemOptions,
  staffDict,
  taskTypeDict,
  toggleDictItem,
  toggleStaff,
  updateDictItem,
  updateStaff,
  type DictKind,
  type DictItem,
  type StaffItem,
} from '@/composables/useDict'

const { message, modal } = App.useApp()

const activeTab = ref<'taskTypes' | 'serviceItems' | 'exceptionTypes' | 'staff'>('taskTypes')

const kindMeta: Record<DictKind, { title: string; desc: string; placeholder: string }> = {
  taskTypes: {
    title: '任务类型',
    desc: '任务协同中派发任务可选的类型，停用后不再出现在新建任务里，历史任务不受影响。',
    placeholder: '如：陪同取药',
  },
  serviceItems: {
    title: '服务项目',
    desc: '服务计划与工单可配置的服务项目；医保结算口径以此为准，停用后不再出现在新计划里。',
    placeholder: '如：助行训练',
  },
  exceptionTypes: {
    title: '工单异常类型',
    desc: '服务人员上报工单异常时可选的原因分类。',
    placeholder: '如：天气原因无法上门',
  },
}

const dictTabs = computed(() => [
  { key: 'taskTypes' as const, label: '任务类型', count: taskTypeDict.length },
  { key: 'serviceItems' as const, label: '服务项目', count: serviceItemDict.length },
  { key: 'exceptionTypes' as const, label: '工单异常', count: exceptionTypeDict.length },
  { key: 'staff' as const, label: '服务机构人员', count: staffDict.length },
])

const currentDict = computed<DictItem[]>(() => {
  if (activeTab.value === 'taskTypes') return taskTypeDict
  if (activeTab.value === 'serviceItems') return serviceItemDict
  return exceptionTypeDict
})

const dictColumns = computed(() => {
  const columns = [
    { key: 'label', title: '名称', width: 200 },
    { key: 'note', title: '说明', width: 320 },
    { key: 'enabled', title: '状态', width: 100 },
    { key: 'actions', title: '操作', width: 180 },
  ]
  if (activeTab.value === 'taskTypes') {
    columns.splice(1, 0, { key: 'short', title: '简称', width: 120 })
  }
  return columns
})

const staffColumns = [
  { key: 'name', title: '姓名', width: 120 },
  { key: 'org', title: '所属机构', width: 180 },
  { key: 'title', title: '岗位', width: 120 },
  { key: 'phone', title: '手机号', width: 140 },
  { key: 'qualifications', title: '服务资质', width: 300 },
  { key: 'enabled', title: '状态', width: 100 },
  { key: 'actions', title: '操作', width: 200 },
]

const dictModalOpen = ref(false)
const editingItem = ref<DictItem | null>(null)
const dictForm = reactive({ label: '', short: '', note: '' })

const staffModalOpen = ref(false)
const editingStaff = ref<StaffItem | null>(null)
const staffForm = reactive({
  name: '',
  org: '',
  phone: '',
  title: '',
  qualifications: [] as string[],
})

function openCreate() {
  editingItem.value = null
  dictForm.label = ''
  dictForm.short = ''
  dictForm.note = ''
  dictModalOpen.value = true
}

function openEdit(item: DictItem) {
  editingItem.value = item
  dictForm.label = item.label
  dictForm.short = item.short ?? ''
  dictForm.note = item.note ?? ''
  dictModalOpen.value = true
}

function submitDict() {
  if (activeTab.value === 'staff') return
  const kind = activeTab.value as DictKind
  const result = editingItem.value
    ? updateDictItem(kind, editingItem.value.id, dictForm)
    : addDictItem(kind, dictForm)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  dictModalOpen.value = false
}

function handleToggle(item: DictItem) {
  if (activeTab.value === 'staff') return
  const result = toggleDictItem(activeTab.value as DictKind, item.id)
  if (result.ok) message.success(result.message)
}

function handleRemove(item: DictItem) {
  if (activeTab.value === 'staff') return
  modal.confirm({
    title: `删除「${item.label}」`,
    content: '删除后不影响历史任务与工单，但新单据不能再选择该值。是否继续？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const result = removeDictItem(activeTab.value as DictKind, item.id)
      if (result.ok) message.success(result.message)
      else message.error(result.message)
    },
  })
}

function openStaffCreate() {
  editingStaff.value = null
  staffForm.name = ''
  staffForm.org = ''
  staffForm.phone = ''
  staffForm.title = ''
  staffForm.qualifications = []
  staffModalOpen.value = true
}

function openStaffEdit(item: StaffItem) {
  editingStaff.value = item
  staffForm.name = item.name
  staffForm.org = item.org
  staffForm.phone = item.phone
  staffForm.title = item.title
  staffForm.qualifications = [...item.qualifications]
  staffModalOpen.value = true
}

function submitStaff() {
  if (!staffForm.name.trim() || !staffForm.org.trim()) {
    message.error('请填写姓名与所属机构')
    return
  }
  if (!/^1\d{10}$/.test(staffForm.phone.trim())) {
    message.error('请填写 11 位手机号')
    return
  }
  if (!staffForm.title.trim()) {
    message.error('请填写岗位')
    return
  }
  const result = editingStaff.value
    ? updateStaff(editingStaff.value.id, staffForm)
    : addStaff(staffForm)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  staffModalOpen.value = false
}

function handleStaffToggle(item: StaffItem) {
  const result = toggleStaff(item.id)
  if (result.ok) message.success(result.message)
}

function handleStaffRemove(item: StaffItem) {
  modal.confirm({
    title: `删除服务人员「${item.name}」`,
    content: '删除后不能再被派单，已生成的工单保留原服务人员信息。是否继续？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const result = removeStaff(item.id)
      if (result.ok) message.success(result.message)
      else message.error(result.message)
    },
  })
}
</script>

<template>
  <div class="dict-panel">
    <div class="panel-head">
      <div>
        <h3 class="section-title">业务字典</h3>
        <p class="section-desc">
          维护当前项目（{{ currentProject.name }}）的任务类型、服务项目、工单异常与服务机构人员；
          任务派发、服务计划、工单异常上报均从这里取值。
        </p>
      </div>
    </div>

    <a-tabs v-model:active-key="activeTab" class="dict-tabs">
      <a-tab-pane v-for="tab in dictTabs" :key="tab.key">
        <template #tab>
          <span class="tab-label">
            <TagsOutlined v-if="tab.key !== 'staff'" />
            <UserOutlined v-else />
            {{ tab.label }}
            <span class="tab-count">{{ tab.count }}</span>
          </span>
        </template>
      </a-tab-pane>
    </a-tabs>

    <a-alert
      class="dict-tip"
      type="info"
      show-icon
      :message="activeTab === 'staff' ? '服务机构人员台账' : kindMeta[activeTab as DictKind].title"
      :description="
        activeTab === 'staff'
          ? '服务工单派单时从在册且启用的机构人员中选择，所属机构与资质随工单留痕；任务协同的执行人（物业、网格员）由组织节点维护，不在本台账。'
          : kindMeta[activeTab as DictKind].desc
      "
    />

    <div class="table-head">
      <span class="text-weak">
        {{
          activeTab === 'staff'
            ? `共 ${staffDict.length} 人，启用 ${staffDict.filter((item) => item.enabled).length} 人`
            : `共 ${currentDict.length} 项，启用 ${currentDict.filter((item) => item.enabled).length} 项`
        }}
      </span>
      <a-button v-if="activeTab !== 'staff'" type="primary" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        新增{{ kindMeta[activeTab as DictKind].title }}
      </a-button>
      <a-button v-else type="primary" @click="openStaffCreate">
        <template #icon><PlusOutlined /></template>
        新增机构人员
      </a-button>
    </div>

    <a-table
      v-if="activeTab !== 'staff'"
      :data-source="currentDict"
      :columns="dictColumns"
      row-key="id"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'label'">
          <span class="dict-label">{{ record.label }}</span>
        </template>
        <template v-else-if="column.key === 'short'">
          <span class="text-weak">{{ record.short || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'note'">
          <span class="text-weak">{{ record.note || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'enabled'">
          <a-tag :color="record.enabled ? 'success' : 'default'">
            {{ record.enabled ? '启用' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button type="link" size="small" @click="openEdit(record)">
            <EditOutlined /> 编辑
          </a-button>
          <a-button type="link" size="small" @click="handleToggle(record)">
            {{ record.enabled ? '停用' : '启用' }}
          </a-button>
          <a-button type="link" size="small" danger @click="handleRemove(record)">
            <DeleteOutlined />
          </a-button>
        </template>
      </template>
    </a-table>

    <a-table
      v-else
      :data-source="staffDict"
      :columns="staffColumns"
      row-key="id"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <span class="dict-label">{{ record.name }}</span>
        </template>
        <template v-else-if="column.key === 'qualifications'">
          <div class="qual-list">
            <a-tag v-for="item in record.qualifications" :key="item" color="blue">{{ item }}</a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'enabled'">
          <a-tag :color="record.enabled ? 'success' : 'default'">
            {{ record.enabled ? '启用' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button type="link" size="small" @click="openStaffEdit(record)">
            <EditOutlined /> 编辑
          </a-button>
          <a-button type="link" size="small" @click="handleStaffToggle(record)">
            {{ record.enabled ? '停用' : '启用' }}
          </a-button>
          <a-button type="link" size="small" danger @click="handleStaffRemove(record)">
            删除
          </a-button>
        </template>
        <template v-else>
          <span class="text-weak">{{ record[column.key] || '—' }}</span>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="dictModalOpen"
      :title="
        activeTab === 'staff'
          ? '新增服务人员'
          : `${editingItem ? '编辑' : '新增'}${kindMeta[activeTab as DictKind].title}`
      "
      ok-text="保存"
      cancel-text="取消"
      @ok="submitDict"
    >
      <a-form layout="vertical">
        <a-form-item label="名称" required>
          <a-input
            v-model:value="dictForm.label"
            :placeholder="activeTab === 'staff' ? '姓名' : kindMeta[activeTab as DictKind].placeholder"
            :maxlength="20"
          />
        </a-form-item>
        <a-form-item v-if="activeTab === 'taskTypes'" label="简称">
          <a-input v-model:value="dictForm.short" placeholder="用于看板角标，如：取药" :maxlength="6" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="dictForm.note" :rows="2" :maxlength="60" show-count />
        </a-form-item>
        <a-alert v-if="activeTab === 'serviceItems'" type="warning" show-icon :message="`停用该服务项目后，服务计划中已引用的项目仍需人工调整；当前共 ${serviceItemOptions.length} 项启用。`" />
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="staffModalOpen"
      :title="editingStaff ? '编辑服务机构人员' : '新增服务机构人员'"
      ok-text="保存"
      cancel-text="取消"
      @ok="submitStaff"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名" required>
              <a-input v-model:value="staffForm.name" placeholder="如：陈晓" :maxlength="10" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属机构" required>
              <a-input v-model:value="staffForm.org" placeholder="如：安康居家护理站" :maxlength="20" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="岗位" required>
              <a-input v-model:value="staffForm.title" placeholder="如：护理员" :maxlength="10" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号" required>
              <a-input v-model:value="staffForm.phone" placeholder="11 位手机号" :maxlength="11" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="服务资质">
          <a-select
            v-model:value="staffForm.qualifications"
            mode="multiple"
            :options="serviceItemOptions.map((item) => ({ value: item, label: item }))"
            placeholder="从服务项目中选择"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.dict-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--elder-text);
}

.section-desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-weak);
}

.dict-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.dict-tip {
  margin-top: 12px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.text-weak {
  font-size: 12px;
  color: var(--elder-text-weak);
}

.dict-label {
  font-weight: 500;
  color: var(--elder-text);
}

.qual-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
