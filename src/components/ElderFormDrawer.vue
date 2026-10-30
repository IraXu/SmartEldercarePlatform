<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { CheckCircleOutlined, CloseOutlined } from '@antdv-next/icons'
import {
  elders,
  makeElder,
  regionOptions,
  type Disability,
  type Elder,
  type Gender,
  type PolicyTag,
  type Relation,
} from '@/mock/elders'

const props = defineProps<{ open: boolean; elder?: Elder | null }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'saved', elder: Elder): void
}>()

const { message, modal } = App.useApp()
const formRef = ref()
const saving = ref(false)
const idCardError = ref('')
const entryError = ref('')
const activeSection = ref('basic')
const baseline = ref('')

const form = reactive({
  name: '',
  gender: '女' as Gender | '未知',
  birthDate: '',
  idCard: '',
  phone: '',
  region: [] as string[],
  building: '',
  unit: '',
  room: '',
  floor: 1,
  elevator: true,
  livingStatus: '',
  disability: '' as Disability | '',
  chronic: [] as string[],
  mobility: '自主行走',
  cognition: '正常',
  hearing: '正常',
  medication: '',
  emergencyName: '',
  emergencyRelation: '儿子',
  emergencyPhone: '',
  sameCity: true,
  guardian: false,
  gridWorker: '',
  policies: [] as string[],
  keyHolder: '',
  smartLock: false,
  smartLockPassword: '',
  propertyOpen: false,
  entryNote: '',
})

const isEdit = computed(() => Boolean(props.elder))
const title = computed(() => (isEdit.value ? '编辑老人档案' : '新增老人档案'))

const completeness = computed(() => {
  const checks = [
    Boolean(form.name && form.name.length >= 2),
    Boolean(form.birthDate),
    /^\d{17}[\dXx]$/.test(form.idCard),
    Boolean(form.phone),
    form.region.length === 4,
    Boolean(form.building),
    Boolean(form.unit),
    Boolean(form.room),
    Boolean(form.livingStatus),
    Boolean(form.disability),
    Boolean(form.emergencyName),
    Boolean(form.emergencyPhone),
    Boolean(form.gridWorker),
    Boolean(form.keyHolder || form.smartLock || form.propertyOpen),
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
})

const missingCount = computed(() => {
  const checks = [
    Boolean(form.name && form.name.length >= 2),
    Boolean(form.birthDate),
    /^\d{17}[\dXx]$/.test(form.idCard),
    Boolean(form.phone),
    form.region.length === 4,
    Boolean(form.building),
    Boolean(form.unit),
    Boolean(form.room),
    Boolean(form.livingStatus),
    Boolean(form.disability),
    Boolean(form.emergencyName),
    Boolean(form.emergencyPhone),
    Boolean(form.gridWorker),
    Boolean(form.keyHolder || form.smartLock || form.propertyOpen),
  ]
  return checks.filter((item) => !item).length
})

const isDirty = computed(() => Boolean(baseline.value) && JSON.stringify(form) !== baseline.value)

const rules: Record<string, any[]> = {
  name: [
    { required: true, message: '请输入老人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为 2–20 个字符', trigger: 'blur' },
  ],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入 18 位身份证号', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    {
      pattern: /^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/,
      message: '请输入 11 位手机号或带区号固话',
      trigger: 'blur',
    },
  ],
  region: [
    {
      validator: (_rule: unknown, value: string[]) =>
        value && value.length === 4
          ? Promise.resolve()
          : Promise.reject('请选择完整的区县 / 街道 / 社区 / 网格'),
      trigger: 'change',
    },
  ],
  building: [{ required: true, message: '请输入楼栋', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单元', trigger: 'blur' }],
  room: [{ required: true, message: '请输入房号', trigger: 'blur' }],
  livingStatus: [{ required: true, message: '请选择居住状态', trigger: 'change' }],
  disability: [{ required: true, message: '请选择失能等级', trigger: 'change' }],
  emergencyName: [{ required: true, message: '请输入紧急联系人姓名', trigger: 'blur' }],
  emergencyPhone: [
    { required: true, message: '请输入紧急联系人电话', trigger: 'blur' },
    { pattern: /^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/, message: '请输入正确的联系电话', trigger: 'blur' },
  ],
  gridWorker: [{ required: true, message: '请选择责任网格员', trigger: 'change' }],
}

function initForm() {
  const elder = props.elder
  idCardError.value = ''
  entryError.value = ''
  if (!elder) {
    form.name = ''
    form.gender = '女'
    form.birthDate = ''
    form.idCard = ''
    form.phone = ''
    form.region = []
    form.building = ''
    form.unit = ''
    form.room = ''
    form.floor = 1
    form.elevator = true
    form.livingStatus = ''
    form.disability = ''
    form.chronic = []
    form.mobility = '自主行走'
    form.cognition = '正常'
    form.hearing = '正常'
    form.medication = ''
    form.emergencyName = ''
    form.emergencyRelation = '儿子'
    form.emergencyPhone = ''
    form.sameCity = true
    form.guardian = false
    form.gridWorker = ''
    form.policies = []
    form.keyHolder = ''
    form.smartLock = false
    form.smartLockPassword = ''
    form.propertyOpen = false
    form.entryNote = ''
  } else {
    form.name = elder.name
    form.gender = elder.gender
    form.birthDate = elder.birthDate
    form.idCard = elder.idCard
    form.phone = elder.phone
    form.region = [elder.district, elder.street, elder.community, elder.grid]
    form.building = elder.building
    form.unit = elder.unit
    form.room = elder.room
    form.floor = 4
    form.elevator = true
    form.livingStatus = elder.livingStatus
    form.disability = elder.disability
    form.chronic = [...elder.health.chronic]
    form.mobility = elder.health.mobility
    form.cognition = elder.health.cognition
    form.hearing = elder.health.hearing
    form.medication = elder.health.medication
    const emergency = elder.relations.find((item) => item.isEmergency)
    form.emergencyName = emergency?.name ?? ''
    form.emergencyRelation = emergency?.relation ?? '儿子'
    form.emergencyPhone = emergency?.phone ?? ''
    form.sameCity = emergency?.sameCity ?? true
    form.guardian = emergency?.guardian ?? false
    form.gridWorker = elder.relations.find((item) => item.relation === '网格员')?.name ?? '王敏'
    form.policies = elder.policies.map((item) => item.name)
    form.keyHolder = elder.entry.keyHolder
    form.smartLock = elder.entry.smartLock
    form.smartLockPassword = elder.entry.smartLockPassword
    form.propertyOpen = elder.entry.propertyOpen
    form.entryNote = elder.entry.note
  }
  nextTick(() => {
    baseline.value = JSON.stringify(form)
    formRef.value?.clearValidate()
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) initForm()
  },
)

watch(
  () => form.idCard,
  () => {
    idCardError.value = ''
  },
)

const age = computed(() => {
  if (!form.birthDate) return ''
  return Math.max(0, 2026 - Number(form.birthDate.slice(0, 4)))
})

const policyOptions = ['低保', '特困', '高龄津贴', '家庭养老床位', '长护险待遇']
const chronicOptions = ['高血压', '糖尿病', '冠心病', '慢阻肺', '关节炎', '白内障']

function scrollTo(section: string) {
  activeSection.value = section
  const element = document.getElementById(`elder-form-${section}`)
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function requestClose() {
  if (!isDirty.value) {
    emit('update:open', false)
    return
  }
  modal.confirm({
    title: '有未保存的修改',
    content: '离开后，本页未保存的档案修改将丢失。',
    okText: '确认离开',
    cancelText: '继续编辑',
    okButtonProps: { danger: true },
    onOk: () => emit('update:open', false),
  })
}

function deriveTags() {
  const tags: string[] = []
  if (form.livingStatus === '独居') tags.push('独居')
  if (form.livingStatus === '空巢') tags.push('空巢')
  if (form.disability !== '' && form.disability !== '能力完好' && form.disability !== '未评估') tags.push('失能')
  if (age.value !== '' && Number(age.value) >= 80) tags.push('高龄')
  if (form.policies.includes('低保')) tags.push('低保')
  if (form.policies.includes('特困')) tags.push('特困')
  if (form.policies.includes('家庭养老床位')) tags.push('家庭养老床位')
  if (form.policies.includes('长护险待遇')) tags.push('长护险')
  return Array.from(new Set(tags))
}

function deriveRiskLevel(tags: string[]) {
  if (form.disability === '重度失能') return '高风险'
  if (
    form.disability === '中度失能' &&
    (tags.includes('独居') || tags.includes('空巢'))
  ) {
    return '高风险'
  }
  if (tags.length > 0) return '中风险'
  return '低风险'
}

function buildPolicies(): PolicyTag[] {
  return form.policies.map((name) => ({
    name,
    status: '生效中',
    updatedAt: '2026-10-27',
  }))
}

function buildEmergencyRelation(elderId: string): Relation {
  return {
    id: `R-${elderId}-EM`,
    name: form.emergencyName,
    relation: form.emergencyRelation,
    phone: form.emergencyPhone,
    sameCity: form.sameCity,
    guardian: form.guardian,
    caregiver: true,
    authorized: '已授权',
    isEmergency: true,
  }
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    message.error('还有必填信息未填写，请检查标红字段')
    return
  }
  if (!form.keyHolder && !form.smartLock && !form.propertyOpen) {
    entryError.value = '请至少登记一种进门方式'
    scrollTo('residence')
    return
  }
  entryError.value = ''
  const duplicate = elders.find(
    (item) => item.idCard === form.idCard && item.id !== props.elder?.id,
  )
  if (duplicate) {
    idCardError.value = `该身份证已建档，档案编号 ${duplicate.id}`
    scrollTo('basic')
    return
  }

  saving.value = true
  window.setTimeout(() => {
    const tags = deriveTags()
    const riskLevel = deriveRiskLevel(tags)
    const [district, street, community, grid] = form.region
    const address = `${community} ${form.building} ${form.unit} ${form.room}`
    const health = {
      chronic: [...form.chronic],
      mobility: form.mobility,
      cognition: form.cognition,
      hearing: form.hearing,
      medication: form.medication,
    }
    const entry = {
      keyHolder: form.keyHolder,
      smartLock: form.smartLock,
      smartLockPassword: form.smartLockPassword,
      propertyOpen: form.propertyOpen,
      note: form.entryNote,
    }

    if (props.elder) {
      const elder = props.elder
      elder.name = form.name
      elder.gender = form.gender as Gender
      elder.birthDate = form.birthDate
      elder.age = Number(age.value) || 0
      elder.idCard = form.idCard
      elder.phone = form.phone
      elder.district = district
      elder.street = street
      elder.community = community
      elder.grid = grid
      elder.building = form.building
      elder.unit = form.unit
      elder.room = form.room
      elder.address = address
      elder.livingStatus = form.livingStatus
      elder.disability = form.disability as Disability
      elder.riskTags = tags
      elder.riskLevel = riskLevel
      elder.completeness = completeness.value
      elder.missingCount = missingCount.value
      elder.status = completeness.value < 80 ? '待完善' : '正常'
      elder.health = health
      elder.entry = entry
      elder.policies = buildPolicies()
      elder.updatedAt = '2026-10-27 10:00'
      const emergency = elder.relations.find((item) => item.isEmergency)
      if (emergency) {
        emergency.name = form.emergencyName
        emergency.relation = form.emergencyRelation
        emergency.phone = form.emergencyPhone
        emergency.sameCity = form.sameCity
        emergency.guardian = form.guardian
      } else {
        elder.relations.unshift(buildEmergencyRelation(elder.id))
      }
      const gridRelation = elder.relations.find((item) => item.relation === '网格员')
      if (gridRelation) gridRelation.name = form.gridWorker
      else
        elder.relations.push({
          id: `R-${elder.id}-GRID`,
          name: form.gridWorker,
          relation: '网格员',
          phone: '13900001234',
          sameCity: true,
          guardian: false,
          caregiver: false,
          authorized: '已授权',
          isEmergency: false,
        })
      elder.changes.unshift({
        id: `CH-${Date.now()}`,
        time: '2026-10-27 10:00',
        operator: '吕建成',
        field: '档案信息',
        before: '编辑前',
        after: '已更新',
        reason: '手工编辑',
      })
      saving.value = false
      baseline.value = JSON.stringify(form)
      emit('saved', elder)
    } else {
      const nextId = `E${String(elders.length + 1).padStart(5, '0')}`
      const newElder = makeElder({
        id: nextId,
        name: form.name,
        gender: form.gender as Gender,
        birthDate: form.birthDate,
        phone: form.phone,
        idCard: form.idCard,
        district,
        street,
        community,
        grid,
        building: form.building,
        unit: form.unit,
        room: form.room,
        address,
        livingStatus: form.livingStatus,
        disability: form.disability as Disability,
        riskTags: tags,
        riskLevel,
        completeness: completeness.value,
        missingCount: missingCount.value,
        status: completeness.value < 80 ? '待完善' : '正常',
        health,
        entry,
        policies: buildPolicies(),
        relations: [
          buildEmergencyRelation(nextId),
          {
            id: `R-${nextId}-GRID`,
            name: form.gridWorker,
            relation: '网格员',
            phone: '13900001234',
            sameCity: true,
            guardian: false,
            caregiver: false,
            authorized: '已授权',
            isEmergency: false,
          },
        ],
        changes: [
          {
            id: `CH-${Date.now()}`,
            time: '2026-10-27 10:00',
            operator: '吕建成',
            field: '新建档案',
            before: '—',
            after: '已建档',
            reason: '社区新增',
          },
        ],
        updatedAt: '2026-10-27 10:00',
        devicesOnline: 0,
        devicesTotal: 0,
        lastEvent: null,
      })
      elders.unshift(newElder)
      saving.value = false
      baseline.value = JSON.stringify(form)
      emit('saved', newElder)
    }
  }, 700)
}

function disabledDate(current: any) {
  return current && current.valueOf() > Date.now()
}
</script>

<template>
  <a-drawer
    :open="open"
    :size="960"
    placement="right"
    :closable="false"
    :mask-closable="false"
    :keyboard="false"
    :styles="{ body: { padding: '0' } }"
  >
    <div class="drawer-shell">
      <div class="drawer-header">
        <div>
          <div class="drawer-title">{{ title }}</div>
          <div class="drawer-subtitle">一人一档 · 带 * 为必填项，保存前会校验身份证唯一性与进门方式</div>
        </div>
        <div class="drawer-header-right">
          <div class="completeness">
            <a-progress
              type="circle"
              :percent="completeness"
              :size="44"
              :stroke-color="completeness < 80 ? '#D97706' : '#2E9E5B'"
            />
            <div class="completeness-text">
              <div class="completeness-label">档案完整度</div>
              <div class="completeness-hint">
                {{ missingCount > 0 ? `还有 ${missingCount} 项待补充` : '必填项已完整' }}
              </div>
            </div>
          </div>
          <a-button type="text" shape="circle" @click="requestClose">
            <template #icon><CloseOutlined /></template>
          </a-button>
        </div>
      </div>

      <div class="drawer-main">
        <div class="anchor-nav">
          <div
            v-for="item in [
              { key: 'basic', label: '基本信息' },
              { key: 'residence', label: '居住信息' },
              { key: 'health', label: '健康与能力' },
              { key: 'relation', label: '社会关系' },
              { key: 'policy', label: '政策标签' },
            ]"
            :key="item.key"
            :class="['anchor-item', { active: activeSection === item.key }]"
            @click="scrollTo(item.key)"
          >
            {{ item.label }}
          </div>
          <div class="anchor-tip">
            <CheckCircleOutlined />
            <span>敏感字段查看与保存会记录审计日志</span>
          </div>
        </div>

        <div class="form-wrap">
          <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" required-mark>
            <section id="elder-form-basic" class="form-section">
              <div class="form-section-title">基本信息</div>
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="姓名" name="name">
                    <a-input v-model:value="form.name" placeholder="请输入老人姓名" :maxlength="20" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="性别" name="gender">
                    <a-radio-group v-model:value="form.gender">
                      <a-radio value="男">男</a-radio>
                      <a-radio value="女">女</a-radio>
                      <a-radio value="未知">未知</a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="出生日期" name="birthDate">
                    <a-date-picker
                      v-model:value="form.birthDate"
                      value-format="YYYY-MM-DD"
                      placeholder="请选择出生日期"
                      style="width: 100%"
                      :disabled-date="disabledDate"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="年龄">
                    <a-input :value="age ? `${age} 岁` : '按出生日期自动计算'" disabled />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item
                    label="身份证号"
                    name="idCard"
                    :validate-status="idCardError ? 'error' : undefined"
                    :help="idCardError || undefined"
                  >
                    <a-input v-model:value="form.idCard" placeholder="请输入 18 位身份证号" :maxlength="18" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="联系电话" name="phone">
                    <a-input v-model:value="form.phone" placeholder="11 位手机号或带区号固话" :maxlength="20" />
                  </a-form-item>
                </a-col>
              </a-row>
            </section>

            <section id="elder-form-residence" class="form-section">
              <div class="form-section-title">居住信息</div>
              <a-row :gutter="16">
                <a-col :span="24">
                  <a-form-item label="所属区域" name="region" required>
                    <a-cascader
                      v-model:value="form.region"
                      :options="regionOptions"
                      placeholder="请选择区县 / 街道 / 社区 / 网格"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="小区" name="building">
                    <a-input v-model:value="form.building" placeholder="如 幸福里 3栋" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="单元" name="unit">
                    <a-input v-model:value="form.unit" placeholder="如 2单元" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="房号" name="room">
                    <a-input v-model:value="form.room" placeholder="如 401" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="楼层">
                    <a-input-number v-model:value="form.floor" :min="-2" :max="99" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="有无电梯">
                    <a-switch v-model:checked="form.elevator" checked-children="有" un-checked-children="无" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="居住状态" name="livingStatus">
                    <a-select
                      v-model:value="form.livingStatus"
                      :options="['独居', '与配偶同住', '与子女同住', '空巢', '机构居住', '其他'].map((item) => ({ value: item, label: item }))"
                      placeholder="请选择居住状态"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="进门方式" :validate-status="entryError ? 'error' : undefined" :help="entryError || undefined">
                    <div class="entry-grid">
                      <a-input v-model:value="form.keyHolder" placeholder="钥匙在谁手上，如 儿子李伟处" />
                      <div class="entry-switch">
                        <a-switch v-model:checked="form.smartLock" size="small" />
                        <span>已设置智能门锁临时密码</span>
                      </div>
                      <a-input
                        v-if="form.smartLock"
                        v-model:value="form.smartLockPassword"
                        placeholder="临时密码（仅社区可见）"
                      />
                      <div class="entry-switch">
                        <a-switch v-model:checked="form.propertyOpen" size="small" />
                        <span>物业可代开</span>
                      </div>
                      <a-input v-model:value="form.entryNote" placeholder="进门补充说明，如 需提前电话确认" />
                    </div>
                    <div class="field-hint">钥匙持有人、智能门锁、物业代开至少登记一种；密码仅社区可见并留痕。</div>
                  </a-form-item>
                </a-col>
              </a-row>
            </section>

            <section id="elder-form-health" class="form-section">
              <div class="form-section-title">健康与能力</div>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="失能等级" name="disability">
                    <a-select
                      v-model:value="form.disability"
                      :options="['能力完好', '轻度失能', '中度失能', '重度失能', '未评估'].map((item) => ({ value: item, label: item }))"
                      placeholder="请选择失能等级"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="16">
                  <a-form-item label="慢病标签">
                    <a-select
                      v-model:value="form.chronic"
                      mode="multiple"
                      :options="chronicOptions.map((item) => ({ value: item, label: item }))"
                      placeholder="仅用于照护安排，不做医学诊断"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="行动能力">
                    <a-select
                      v-model:value="form.mobility"
                      :options="['自主行走', '需助行器', '卧床'].map((item) => ({ value: item, label: item }))"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="认知状况">
                    <a-select
                      v-model:value="form.cognition"
                      :options="['正常', '轻度认知障碍', '中度认知障碍', '重度认知障碍', '未评估'].map((item) => ({ value: item, label: item }))"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="听力视力">
                    <a-select
                      v-model:value="form.hearing"
                      :options="['正常', '听力下降', '视力下降', '听力视力均下降'].map((item) => ({ value: item, label: item }))"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="用药提醒">
                    <a-input v-model:value="form.medication" placeholder="如 早晚各一次降压药" :maxlength="100" />
                  </a-form-item>
                </a-col>
              </a-row>
            </section>

            <section id="elder-form-relation" class="form-section">
              <div class="form-section-title">社会关系</div>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="紧急联系人姓名" name="emergencyName">
                    <a-input v-model:value="form.emergencyName" placeholder="如 李伟" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="与老人关系">
                    <a-select
                      v-model:value="form.emergencyRelation"
                      :options="['儿子', '女儿', '配偶', '监护人', '主要照护者', '其他亲属'].map((item) => ({ value: item, label: item }))"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="联系电话" name="emergencyPhone">
                    <a-input v-model:value="form.emergencyPhone" placeholder="11 位手机号" :maxlength="20" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="是否同城">
                    <a-switch v-model:checked="form.sameCity" checked-children="是" un-checked-children="否" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="是否监护人">
                    <a-switch v-model:checked="form.guardian" checked-children="是" un-checked-children="否" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="责任网格员" name="gridWorker">
                    <a-select
                      v-model:value="form.gridWorker"
                      :options="['王敏', '李静', '李强', '赵敏'].map((item) => ({ value: item, label: item }))"
                      placeholder="请选择责任网格员"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </section>

            <section id="elder-form-policy" class="form-section">
              <div class="form-section-title">政策标签</div>
              <a-form-item label="政策对象与待遇">
                <a-checkbox-group v-model:value="form.policies" :options="policyOptions" />
              </a-form-item>
              <div class="field-hint">政策标签会影响区域统计、政策对象筛选与后续服务计划，不在名单内请勿勾选。</div>
            </section>
          </a-form>
        </div>
      </div>

      <div class="drawer-footer">
        <a-button @click="requestClose">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">
          {{ isEdit ? '保存修改' : '保存并建档' }}
        </a-button>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.drawer-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-divider);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}

.drawer-subtitle {
  font-size: 12px;
  line-height: 18px;
  color: var(--elder-text-weak);
  margin-top: 2px;
}

.drawer-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.completeness {
  display: flex;
  align-items: center;
  gap: 10px;
}

.completeness-text {
  line-height: 18px;
}

.completeness-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.completeness-hint {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.drawer-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.anchor-nav {
  width: 160px;
  flex-shrink: 0;
  background: #f7f9fc;
  border-right: 1px solid var(--elder-divider);
  padding: 16px 12px;
}

.anchor-item {
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--elder-text-secondary);
  cursor: pointer;
  margin-bottom: 4px;
}

.anchor-item:hover {
  background: #eef3fb;
  color: var(--elder-primary);
}

.anchor-item.active {
  background: var(--elder-primary-soft);
  color: var(--elder-primary);
  font-weight: 600;
}

.anchor-tip {
  margin-top: 20px;
  padding: 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid var(--elder-border);
  color: var(--elder-text-weak);
  font-size: 11px;
  line-height: 17px;
  display: flex;
  gap: 6px;
}

.form-wrap {
  flex: 1;
  overflow: auto;
  padding: 8px 24px 32px;
}

.form-section {
  padding-top: 20px;
  scroll-margin-top: 8px;
}

.form-section + .form-section {
  border-top: 1px dashed var(--elder-divider);
  margin-top: 8px;
}

.form-section-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  position: relative;
  padding-left: 10px;
}

.form-section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: var(--elder-primary);
}

.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
}

.entry-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--elder-text-secondary);
  padding: 0 2px;
}

.field-hint {
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
  margin-top: 4px;
}

.drawer-footer {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--elder-divider);
  flex-shrink: 0;
}
</style>
