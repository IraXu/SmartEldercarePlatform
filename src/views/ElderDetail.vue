<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ApartmentOutlined,
  DownOutlined,
  EditOutlined,
  MoreOutlined,
  PhoneOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import RiskTag from '@/components/RiskTag.vue'
import StatusTag from '@/components/StatusTag.vue'
import ElderFormDrawer from '@/components/ElderFormDrawer.vue'
import RelationDrawer from '@/components/RelationDrawer.vue'
import QrModal from '@/components/QrModal.vue'
import ArchiveModal from '@/components/ArchiveModal.vue'
import PhoneGuideModal from '@/components/comm/PhoneGuideModal.vue'
import VideoIntercomModal from '@/components/comm/VideoIntercomModal.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import {
  elders,
  getElderById,
  getHouseByElder,
  maskIdCard,
  maskPhone,
  type Relation,
} from '@/mock/elders'

const route = useRoute()
const router = useRouter()
const { message, modal } = App.useApp()

const loading = ref(true)
const activeTab = ref('basic')
const formOpen = ref(false)
const relationOpen = ref(false)
const qrOpen = ref(false)
const archiveOpen = ref(false)
const phoneOpen = ref(false)
const intercomOpen = ref(false)
const callTarget = ref({ name: '', phone: '' })
const passwordVisible = ref(false)
const selectedRelation = ref<Relation | null>(null)

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false
  }, 420)
})

const elder = computed(() => getElderById(String(route.params.id)))
const house = computed(() => (elder.value ? getHouseByElder(elder.value) : null))
const isForbidden = computed(() => demoState.value === 'forbidden')
const emergency = computed(() =>
  elder.value?.relations.find((item) => item.active !== false && item.isEmergency),
)
const gridWorker = computed(() =>
  elder.value?.relations.find((item) => item.active !== false && item.relation === '网格员'),
)
const visibleRelations = computed(() =>
  (elder.value?.relations ?? []).filter((item) => item.active !== false),
)
const houseElders = computed(() =>
  elder.value ? elders.filter((item) => item.houseId === elder.value?.houseId && item.status !== '已归档') : [],
)
const deviceTotal = computed(() =>
  (house.value?.rooms ?? []).reduce((sum, room) => sum + room.devices.length, 0),
)

const riskReasons = computed(() => {
  if (!elder.value) return []
  const reasons: string[] = []
  if (elder.value.riskTags.includes('独居')) reasons.push('独居，发生意外时缺少第一时间发现人')
  if (elder.value.disability === '重度失能') reasons.push('重度失能，日常照护依赖度高')
  if (
    elder.value.disability === '中度失能' &&
    (elder.value.riskTags.includes('独居') || elder.value.riskTags.includes('空巢'))
  ) {
    reasons.push('中度失能且独居/空巢，照护支持不足')
  }
  if (elder.value.lastEvent?.level === 'L3') reasons.push('近 30 天发生过 L3 紧急事件')
  if (elder.value.riskTags.includes('空巢')) reasons.push('空巢，子女不在身边')
  if (elder.value.age >= 80) reasons.push('高龄老人，生活节律变化需重点关注')
  if (reasons.length === 0 && elder.value.riskTags.length > 0) {
    reasons.push('已登记为重点老人，需保持日常关注')
  }
  if (reasons.length === 0) reasons.push('暂无高风险因素，保持日常关注')
  return reasons
})

const riskColor = computed(() => {
  if (elder.value?.riskLevel === '高风险') return 'red'
  if (elder.value?.riskLevel === '中风险') return 'orange'
  return 'green'
})

const recentEvents = computed(() => {
  if (!elder.value) return []
  const list: Array<{ level: 'L1' | 'L2' | 'L3'; type: string; time: string; source: string }> = []
  if (elder.value.lastEvent) {
    list.push({ ...elder.value.lastEvent, source: '设备事件' })
  }
  list.push(
    { level: 'L1', type: '夜间起夜次数异常增加', time: '3 天前', source: '生活节律' },
    { level: 'L1', type: '连续两天未出门', time: '上周', source: '生活节律' },
  )
  return list
})

const relationColumns = [
  { title: '姓名', key: 'name', width: 100 },
  { title: '关系', key: 'relation', width: 100 },
  { title: '联系电话', key: 'phone', width: 140 },
  { title: '同城', key: 'sameCity', width: 70 },
  { title: '监护人', key: 'guardian', width: 80 },
  { title: '授权状态', key: 'authorized', width: 100 },
  { title: '操作', key: 'actions', width: 130, fixed: 'right' as const },
]

const snapshotColumns = [
  { title: '来源', dataIndex: 'source', key: 'source', width: 120 },
  { title: '快照时间', dataIndex: 'time', key: 'time', width: 160 },
  { title: '地址', dataIndex: 'address', key: 'address' },
  { title: '紧急联系人', dataIndex: 'contact', key: 'contact', width: 160 },
  { title: '设备', dataIndex: 'deviceSummary', key: 'deviceSummary', width: 140 },
]

function backToList() {
  router.push('/elders')
}

function openEdit() {
  formOpen.value = true
}

function openRelation(relation?: Relation) {
  selectedRelation.value = relation ?? null
  relationOpen.value = true
}

const moreMenuItems = [{ key: 'archive', label: '归档档案' }]

function handleMore({ key }: { key: string }) {
  if (key === 'archive') archiveOpen.value = true
}

function revealPassword() {
  modal.confirm({
    title: '查看智能门锁临时密码',
    content: '本次查看会记录审计日志，密码将在 10 秒后自动隐藏。',
    okText: '确认查看',
    cancelText: '取消',
    onOk: () => {
      passwordVisible.value = true
      window.setTimeout(() => {
        passwordVisible.value = false
      }, 10000)
    },
  })
}

function call(phone?: string, name?: string) {
  if (!phone) {
    message.warning('该联系人暂无电话')
    return
  }
  callTarget.value = { name: name ?? elder.value?.name ?? '老人', phone }
  phoneOpen.value = true
}

function stopRelation(relation: Relation) {
  if (!elder.value) return
  const activeEmergencyCount = visibleRelations.value.filter((item) => item.isEmergency).length
  if (relation.isEmergency && activeEmergencyCount <= 1) {
    message.error('至少保留一名紧急联系人，暂不能停用')
    return
  }
  modal.confirm({
    title: '停用关系人',
    content: `停用后「${relation.name}」将不再接收事件通知与任务派发，历史记录仍保留。`,
    okText: '确认停用',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: () => {
      relation.active = false
      message.success('关系人已停用')
    },
  })
}

function handleArchived() {
  router.push('/elders')
}

function refresh() {
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
    message.success('已刷新档案')
  }, 500)
}
</script>

<template>
  <AdminLayout>
    <div class="page detail-page">
      <div class="breadcrumb">
        <a @click="backToList">老人档案</a>
        <span class="crumb-sep">/</span>
        <span>{{ elder?.name ?? '档案详情' }}</span>
        <a-button type="text" size="small" class="refresh-btn" @click="refresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <div v-if="isForbidden" class="state-card card">
        <a-result status="403" title="当前账号无权查看该档案" sub-title="请返回列表切换辖区，或联系项目管理员申请数据权限。">
          <template #extra>
            <a-button type="primary" @click="backToList">返回老人档案</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="loading" class="state-card card">
        <a-skeleton active avatar :paragraph="{ rows: 8 }" />
      </div>

      <div v-else-if="!elder" class="state-card card">
        <a-result status="404" title="档案不存在或已归档" sub-title="请返回列表重新选择档案。">
          <template #extra>
            <a-button type="primary" @click="backToList">返回老人档案</a-button>
          </template>
        </a-result>
      </div>

      <template v-else-if="elder">
        <a-alert
          v-if="isCivil"
          type="info"
          show-icon
          class="readonly-alert"
          message="民政只读视角"
          description="当前视角隐藏编辑、建模与归档入口；身份证、手机号与健康明细按统计级脱敏。"
        />

        <div class="hero card">
          <div class="hero-left">
            <a-avatar
              :size="64"
              :style="{
                background: elder.riskLevel === '高风险' ? '#FDECEC' : '#EAF1FE',
                color: elder.riskLevel === '高风险' ? '#D64545' : '#1F6FEB',
                fontSize: '24px',
                fontWeight: 600,
              }"
            >
              {{ elder.name.slice(0, 1) }}
            </a-avatar>
            <div class="hero-main">
              <div class="hero-name">
                {{ isCivil ? elder.name.slice(0, 1) + '**' : elder.name }}
                <span class="hero-meta">{{ elder.gender }} · {{ elder.age }}岁</span>
                <a-tag :color="riskColor" class="risk-tag">{{ elder.riskLevel }}</a-tag>
                <StatusTag :status="elder.status" />
              </div>
              <div class="hero-tags">
                <RiskTag v-for="tag in elder.riskTags" :key="tag" :tag="tag" />
                <span v-if="elder.riskTags.length === 0" class="text-weak">暂无风险标签</span>
              </div>
              <div class="hero-meta-line">
                档案编号 {{ elder.id }} · {{ elder.community }} · {{ elder.grid }} · 更新于 {{ elder.updatedAt }}
              </div>
            </div>
          </div>

          <div class="hero-right">
            <div class="completeness-box">
              <div class="completeness-head">
                <span>档案完整度</span>
                <strong>{{ elder.completeness }}%</strong>
              </div>
              <a-progress
                :percent="elder.completeness"
                :show-info="false"
                :stroke-color="elder.completeness < 80 ? '#D97706' : '#2E9E5B'"
                size="small"
              />
              <div class="completeness-hint">
                {{ elder.completeness >= 100 ? '必填项已完整' : `还有 ${elder.missingCount} 项待补充` }}
              </div>
            </div>

            <div v-if="!isCivil" class="hero-actions">
              <a-button type="primary" @click="openEdit">
                <template #icon><EditOutlined /></template>
                编辑档案
              </a-button>
              <a-button @click="router.push(`/elders/${elder.id}/house`)">
                <template #icon><ApartmentOutlined /></template>
                房屋建模
              </a-button>
              <a-button @click="qrOpen = true">
                <template #icon><QrcodeOutlined /></template>
                门牌码
              </a-button>
              <a-button @click="intercomOpen = true">
                <template #icon><VideoCameraOutlined /></template>
                视频与对讲
              </a-button>
              <a-dropdown :trigger="['click']" :menu="{ items: moreMenuItems, onClick: handleMore }">
                <a-button>
                  更多
                  <DownOutlined />
                </a-button>
              </a-dropdown>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-main card">
            <a-tabs v-model:activeKey="activeTab" class="detail-tabs">
              <a-tab-pane key="basic" tab="基本信息">
                <a-descriptions bordered :column="2" size="middle">
                  <a-descriptions-item label="档案编号">{{ elder.id }}</a-descriptions-item>
                  <a-descriptions-item label="档案状态">
                    <StatusTag :status="elder.status" />
                  </a-descriptions-item>
                  <a-descriptions-item label="身份证号">
                    {{ isCivil ? maskIdCard(elder.idCard) : elder.idCard }}
                  </a-descriptions-item>
                  <a-descriptions-item label="联系电话">
                    {{ isCivil ? maskPhone(elder.phone) : elder.phone }}
                  </a-descriptions-item>
                  <a-descriptions-item label="出生日期">{{ elder.birthDate }}</a-descriptions-item>
                  <a-descriptions-item label="年龄">{{ elder.age }} 岁</a-descriptions-item>
                  <a-descriptions-item label="所属区域">
                    {{ elder.district }} / {{ elder.street }} / {{ elder.community }} / {{ elder.grid }}
                  </a-descriptions-item>
                  <a-descriptions-item label="居住状态">{{ elder.livingStatus }}</a-descriptions-item>
                  <a-descriptions-item label="责任网格员">{{ gridWorker?.name ?? '未登记' }}</a-descriptions-item>
                  <a-descriptions-item label="最近更新">{{ elder.updatedAt }}</a-descriptions-item>
                  <a-descriptions-item label="档案完整度">
                    <div class="inline-progress">
                      <a-progress
                        :percent="elder.completeness"
                        :show-info="false"
                        :stroke-color="elder.completeness < 80 ? '#D97706' : '#2E9E5B'"
                        size="small"
                      />
                      <span>{{ elder.completeness }}%</span>
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item label="建档来源">社区建档</a-descriptions-item>
                </a-descriptions>
              </a-tab-pane>

              <a-tab-pane key="residence" tab="居住与空间">
                <a-descriptions bordered :column="2" size="middle" class="mb-16">
                  <a-descriptions-item label="详细地址">
                    {{ elder.community }} {{ elder.building }} {{ elder.unit }} {{ elder.room }}
                  </a-descriptions-item>
                  <a-descriptions-item label="居住状态">{{ elder.livingStatus }}</a-descriptions-item>
                  <a-descriptions-item label="房屋类型">{{ house?.houseType }}</a-descriptions-item>
                  <a-descriptions-item label="建筑面积">{{ house?.area }} ㎡</a-descriptions-item>
                  <a-descriptions-item label="楼层 / 电梯">
                    {{ house?.floor }} 层 / {{ house?.elevator ? '有电梯' : '无电梯' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="房间 / 设备">
                    {{ house?.rooms.length ?? 0 }} 个房间 / {{ deviceTotal }} 台设备
                  </a-descriptions-item>
                  <a-descriptions-item label="同住老人" :span="2">
                    <a-tag v-for="item in houseElders.filter((row) => row.id !== elder?.id)" :key="item.id">
                      {{ item.name }}
                    </a-tag>
                    <span v-if="houseElders.length <= 1" class="text-weak">无同住老人</span>
                  </a-descriptions-item>
                </a-descriptions>

                <div class="sub-head">
                  <div>
                    <div class="section-title">户型感知图</div>
                    <div class="section-desc">卧室、卫生间为隐私区域，禁止安装摄像头；雷达用于跌倒与呼吸监测</div>
                  </div>
                  <a-button v-if="!isCivil" type="link" @click="router.push(`/elders/${elder.id}/house`)">
                    进入房屋建模
                  </a-button>
                </div>
                <div class="mini-plan">
                  <div
                    v-for="room in house?.rooms ?? []"
                    :key="room.id"
                    class="mini-room"
                    :style="{ gridArea: room.gridArea }"
                  >
                    <div class="mini-room-top">
                      <span class="mini-room-name">{{ room.name }}</span>
                      <span class="mini-room-type">{{ room.type }}</span>
                    </div>
                    <div class="mini-room-meta">{{ room.area }}㎡ · {{ room.devices.length }} 台设备</div>
                    <div class="mini-room-devices">
                      <a-tag v-for="device in room.devices.slice(0, 2)" :key="device.id" color="blue">
                        {{ device.type }}
                      </a-tag>
                      <span v-if="room.devices.length > 2" class="text-weak">+{{ room.devices.length - 2 }}</span>
                      <span v-if="room.devices.length === 0" class="text-weak">未布设</span>
                    </div>
                  </div>
                </div>

                <div class="entry-block">
                  <div class="section-title">进门方式</div>
                  <div v-if="isCivil" class="entry-readonly">
                    <a-tag :color="elder.entry.keyHolder || elder.entry.smartLock || elder.entry.propertyOpen ? 'green' : 'default'">
                      {{ elder.entry.keyHolder || elder.entry.smartLock || elder.entry.propertyOpen ? '已登记' : '未登记' }}
                    </a-tag>
                    <span class="text-weak">民政视角不展示钥匙持有人与临时密码</span>
                  </div>
                  <div v-else class="entry-detail">
                    <div class="entry-item">
                      <span class="entry-label">钥匙持有人</span>
                      <span>{{ elder.entry.keyHolder || '未登记' }}</span>
                    </div>
                    <div class="entry-item">
                      <span class="entry-label">智能门锁</span>
                      <span v-if="!elder.entry.smartLock" class="text-weak">未设置</span>
                      <span v-else>
                        <template v-if="passwordVisible">{{ elder.entry.smartLockPassword }}</template>
                        <template v-else>•••••• <a @click="revealPassword">查看密码</a></template>
                      </span>
                    </div>
                    <div class="entry-item">
                      <span class="entry-label">物业代开</span>
                      <span>{{ elder.entry.propertyOpen ? '可代开' : '不可代开' }}</span>
                    </div>
                    <div class="entry-item">
                      <span class="entry-label">补充说明</span>
                      <span>{{ elder.entry.note || '—' }}</span>
                    </div>
                  </div>
                </div>
              </a-tab-pane>

              <a-tab-pane key="health" tab="健康与能力">
                <a-alert
                  v-if="isCivil"
                  type="info"
                  show-icon
                  class="mb-16"
                  message="民政视角仅展示统计级健康信息"
                  description="慢病、认知、听力视力与用药明细已脱敏，完整信息仅社区与医保待遇审核可见。"
                />
                <a-descriptions bordered :column="2" size="middle">
                  <a-descriptions-item label="失能等级">{{ elder.disability }}</a-descriptions-item>
                  <a-descriptions-item label="行动能力">{{ elder.health.mobility }}</a-descriptions-item>
                  <template v-if="!isCivil">
                    <a-descriptions-item label="慢病标签">
                      <a-tag v-for="item in elder.health.chronic" :key="item" color="orange">{{ item }}</a-tag>
                      <span v-if="elder.health.chronic.length === 0" class="text-weak">无</span>
                    </a-descriptions-item>
                    <a-descriptions-item label="认知状况">{{ elder.health.cognition }}</a-descriptions-item>
                    <a-descriptions-item label="听力视力">{{ elder.health.hearing }}</a-descriptions-item>
                    <a-descriptions-item label="用药提醒">{{ elder.health.medication || '无' }}</a-descriptions-item>
                  </template>
                </a-descriptions>
              </a-tab-pane>

              <a-tab-pane key="relations" tab="社会关系">
                <div class="sub-head">
                  <div>
                    <div class="section-title">关系人网络</div>
                    <div class="section-desc">至少保留一名紧急联系人；监护人最多 2 名</div>
                  </div>
                  <a-button v-if="!isCivil" type="primary" size="small" @click="openRelation()">新增关系人</a-button>
                </div>
                <a-table
                  :data-source="visibleRelations"
                  :columns="relationColumns"
                  :pagination="false"
                  row-key="id"
                  size="middle"
                  :scroll="{ x: 760 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'name'">
                      <span class="relation-name">{{ isCivil ? record.name.slice(0, 1) + '**' : record.name }}</span>
                      <a-tag v-if="record.isEmergency" color="red" class="ml-6">紧急</a-tag>
                    </template>
                    <template v-else-if="column.key === 'phone'">
                      {{ isCivil ? maskPhone(record.phone) : record.phone }}
                    </template>
                    <template v-else-if="column.key === 'sameCity'">
                      {{ record.sameCity ? '是' : '否' }}
                    </template>
                    <template v-else-if="column.key === 'guardian'">
                      {{ record.guardian ? '是' : '否' }}
                    </template>
                    <template v-else-if="column.key === 'authorized'">
                      <a-tag :color="record.authorized === '已授权' ? 'green' : 'default'">
                        {{ record.authorized }}
                      </a-tag>
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <a-button type="link" size="small" @click="call(record.phone, record.name)">
                        <template #icon><PhoneOutlined /></template>
                        拨打电话
                      </a-button>
                      <template v-if="!isCivil">
                        <a-button type="link" size="small" @click="openRelation(record)">编辑</a-button>
                        <a-button type="link" size="small" danger @click="stopRelation(record)">停用</a-button>
                      </template>
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>

              <a-tab-pane key="policies" tab="政策标签">
                <div class="sub-head">
                  <div>
                    <div class="section-title">政策对象与待遇</div>
                    <div class="section-desc">政策标签影响区域统计、政策对象筛选与后续服务计划</div>
                  </div>
                </div>
                <div v-if="elder.policies.length === 0" class="policy-empty">
                  <a-empty description="暂未登记政策标签" />
                </div>
                <div v-else class="policy-list">
                  <div v-for="policy in elder.policies" :key="policy.name" class="policy-item">
                    <div class="policy-left">
                      <a-tag color="green">{{ policy.name }}</a-tag>
                      <span class="text-weak">{{ policy.status }}</span>
                    </div>
                    <span class="text-weak">更新于 {{ policy.updatedAt }}</span>
                  </div>
                </div>
              </a-tab-pane>

              <a-tab-pane key="events" tab="服务与事件">
                <a-alert
                  type="info"
                  show-icon
                  class="mb-16"
                  message="事件分级、通知与处置已由事件中心提供"
                  description="以下为档案页摘要；查看完整信号、通知链路与处置记录请进入事件中心。"
                />
                <a-timeline>
                  <a-timeline-item
                    v-for="(event, index) in recentEvents"
                    :key="index"
                    :color="event.level === 'L3' ? 'red' : event.level === 'L2' ? 'orange' : 'blue'"
                  >
                    <div class="event-head">
                      <StatusTag :level="event.level" />
                      <span class="event-title">{{ event.type }}</span>
                      <span class="text-weak">{{ event.time }}</span>
                    </div>
                    <div class="event-source">来源：{{ event.source }}</div>
                  </a-timeline-item>
                </a-timeline>
                <div class="mt-16">
                  <a-button @click="router.push(`/events?elderId=${elder.id}`)">查看事件台账</a-button>
                </div>
              </a-tab-pane>

              <a-tab-pane key="changes" tab="变更记录">
                <div class="sub-head">
                  <div>
                    <div class="section-title">关键字段变更</div>
                    <div class="section-desc">变更记录不可编辑、不可删除，用于审计与纠纷举证</div>
                  </div>
                </div>
                <a-timeline class="change-timeline">
                  <a-timeline-item v-for="change in elder.changes" :key="change.id" color="blue">
                    <div class="change-head">
                      <strong>{{ change.field }}</strong>
                      <span class="text-weak">{{ change.time }}</span>
                    </div>
                    <div class="change-body">{{ change.before }} → {{ change.after }}</div>
                    <div class="change-meta">{{ change.operator }} · {{ change.reason }}</div>
                  </a-timeline-item>
                </a-timeline>

                <div class="sub-head mt-24">
                  <div>
                    <div class="section-title">档案快照</div>
                    <div class="section-desc">事件、工单或关键变更发生时固化，快照内容只读</div>
                  </div>
                </div>
                <a-table
                  :data-source="elder.snapshots"
                  :columns="snapshotColumns"
                  :pagination="false"
                  row-key="id"
                  size="small"
                />
              </a-tab-pane>
            </a-tabs>
          </div>

          <aside class="detail-side">
            <div class="side-card card">
              <div class="side-title">
                风险摘要
                <a-tag :color="riskColor">{{ elder.riskLevel }}</a-tag>
              </div>
              <ul class="risk-list">
                <li v-for="reason in riskReasons" :key="reason">{{ reason }}</li>
              </ul>
              <div class="side-note">风险规则：重度失能，或中度及以上失能且独居/空巢，或近 30 天发生 L3 事件为高风险；其他重点老人为中风险。</div>
            </div>

            <div class="side-card card">
              <div class="side-title">紧急联系</div>
              <div v-if="emergency" class="contact-item">
                <div class="contact-avatar">{{ emergency.name.slice(0, 1) }}</div>
                <div class="contact-main">
                  <div class="contact-name">
                    {{ isCivil ? emergency.name.slice(0, 1) + '**' : emergency.name }}
                    <a-tag v-if="emergency.guardian" color="blue" class="ml-6">监护人</a-tag>
                  </div>
                  <div class="contact-phone">{{ isCivil ? maskPhone(emergency.phone) : emergency.phone }}</div>
                  <div class="contact-meta">{{ emergency.relation }} · {{ emergency.sameCity ? '同城' : '异地' }}</div>
                </div>
                <a-button type="text" shape="circle" @click="call(emergency.phone)">
                  <template #icon><PhoneOutlined /></template>
                </a-button>
              </div>
              <div v-else class="text-weak">未登记紧急联系人</div>

              <div v-if="gridWorker" class="contact-item secondary">
                <div class="contact-avatar grid">{{ gridWorker.name.slice(0, 1) }}</div>
                <div class="contact-main">
                  <div class="contact-name">{{ gridWorker.name }}</div>
                  <div class="contact-phone">{{ isCivil ? maskPhone(gridWorker.phone) : gridWorker.phone }}</div>
                  <div class="contact-meta">责任网格员</div>
                </div>
                <a-button type="text" shape="circle" @click="call(gridWorker.phone)">
                  <template #icon><PhoneOutlined /></template>
                </a-button>
              </div>
            </div>

            <div class="side-card card">
              <div class="side-title">进门方式</div>
              <template v-if="isCivil">
                <a-tag :color="elder.entry.keyHolder || elder.entry.smartLock || elder.entry.propertyOpen ? 'green' : 'default'">
                  {{ elder.entry.keyHolder || elder.entry.smartLock || elder.entry.propertyOpen ? '已登记' : '未登记' }}
                </a-tag>
                <div class="side-note">民政视角不展示钥匙持有人与临时密码。</div>
              </template>
              <template v-else>
                <div class="entry-line">
                  <span class="text-weak">钥匙</span>
                  <span>{{ elder.entry.keyHolder || '未登记' }}</span>
                </div>
                <div class="entry-line">
                  <span class="text-weak">智能门锁</span>
                  <span>
                    <span v-if="!elder.entry.smartLock" class="text-weak">未设置</span>
                    <span v-else-if="passwordVisible">{{ elder.entry.smartLockPassword }}</span>
                    <span v-else>•••••• <a @click="revealPassword">查看</a></span>
                  </span>
                </div>
                <div class="entry-line">
                  <span class="text-weak">物业代开</span>
                  <span>{{ elder.entry.propertyOpen ? '可代开' : '不可代开' }}</span>
                </div>
                <div class="side-note">{{ elder.entry.note || '无补充说明' }}</div>
              </template>
            </div>
          </aside>
        </div>
      </template>

      <ElderFormDrawer
        v-if="elder"
        :open="formOpen"
        :elder="elder"
        @update:open="formOpen = $event"
        @saved="message.success('档案已保存')"
      />
      <RelationDrawer
        v-if="elder"
        :open="relationOpen"
        :elder="elder"
        :relation="selectedRelation"
        @update:open="relationOpen = $event"
      />
      <QrModal
        v-if="elder && house"
        :open="qrOpen"
        :house="house"
        :elder-names="houseElders.map((item) => item.name)"
        @update:open="qrOpen = $event"
      />
      <ArchiveModal
        v-if="elder"
        :open="archiveOpen"
        :elder="elder"
        @update:open="archiveOpen = $event"
        @archived="handleArchived"
      />

      <PhoneGuideModal
        v-model:open="phoneOpen"
        :name="callTarget.name"
        :phone="callTarget.phone"
        scene="老人档案"
      />

      <VideoIntercomModal
        v-model:open="intercomOpen"
        :elder-id="elder?.id"
        :elder-name="elder?.name"
        :address="elder ? `${elder.community} ${elder.building} ${elder.unit} ${elder.room}` : ''"
      />
    </div>
  </AdminLayout>
</template>

<style scoped>
.detail-page {
  padding-bottom: 40px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.breadcrumb a {
  color: var(--elder-primary);
}

.crumb-sep {
  color: var(--elder-text-weak);
}

.refresh-btn {
  margin-left: auto;
  color: var(--elder-text-secondary);
}

.state-card {
  padding: 32px;
  margin-top: 16px;
}

.readonly-alert {
  margin-top: 16px;
  border-radius: 8px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  margin-top: 16px;
}

.hero-left {
  display: flex;
  gap: 16px;
  min-width: 0;
}

.hero-main {
  min-width: 0;
}

.hero-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
}

.hero-meta {
  font-size: 13px;
  font-weight: 400;
  color: var(--elder-text-secondary);
}

.risk-tag {
  border-radius: 4px;
}

.hero-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 8px;
}

.hero-meta-line {
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-weak);
  margin-top: 8px;
}

.hero-right {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-shrink: 0;
}

.completeness-box {
  width: 170px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fbfe;
  border: 1px solid var(--elder-border);
}

.completeness-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--elder-text-secondary);
  margin-bottom: 4px;
}

.completeness-head strong {
  color: var(--elder-text);
  font-size: 14px;
}

.completeness-hint {
  font-size: 11px;
  color: var(--elder-text-weak);
  margin-top: 2px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 390px;
  justify-content: flex-end;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.detail-main {
  padding: 8px 24px 24px;
  min-height: 560px;
}

.detail-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.detail-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  padding: 16px 20px 18px;
}

.side-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  line-height: 24px;
  font-weight: 600;
  margin-bottom: 10px;
}

.risk-list {
  margin: 0;
  padding-left: 18px;
  color: var(--elder-text-secondary);
  font-size: 13px;
  line-height: 24px;
}

.side-note {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.contact-item.secondary {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--elder-divider);
}

.contact-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--elder-primary-soft);
  color: var(--elder-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.contact-avatar.grid {
  background: #e6f7f7;
  color: #0f8f8f;
}

.contact-main {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.contact-phone {
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 18px;
}

.contact-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 16px;
}

.entry-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  line-height: 26px;
}

.inline-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 160px;
  white-space: nowrap;
}

.inline-progress :deep(.ant-progress) {
  width: 100px;
  margin: 0;
}

.mb-16 {
  margin-bottom: 16px;
}

.mt-24 {
  margin-top: 24px;
}

.ml-6 {
  margin-left: 6px;
}

.sub-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.mini-plan {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 1.2fr 1.2fr 0.8fr;
  gap: 8px;
  height: 260px;
  padding: 10px;
  background: #f7f9fc;
  border: 1px dashed #c9d6e8;
  border-radius: 8px;
}

.mini-room {
  padding: 10px;
  background: #fff;
  border: 1px solid var(--elder-border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-room-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.mini-room-name {
  font-size: 13px;
  font-weight: 600;
}

.mini-room-type {
  font-size: 10px;
  color: var(--elder-text-weak);
  background: #f2f5fa;
  border-radius: 3px;
  padding: 0 4px;
}

.mini-room-meta {
  font-size: 11px;
  color: var(--elder-text-secondary);
}

.mini-room-devices {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.mini-room-devices :deep(.ant-tag) {
  margin-inline-end: 2px;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.entry-block {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--elder-divider);
}

.entry-readonly {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 12px;
}

.entry-detail {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 24px;
  margin-top: 10px;
}

.entry-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
  line-height: 22px;
}

.entry-label {
  width: 84px;
  flex-shrink: 0;
  color: var(--elder-text-weak);
}

.relation-name {
  font-weight: 500;
}

.policy-list {
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  overflow: hidden;
}

.policy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--elder-divider);
  font-size: 12px;
}

.policy-item:last-child {
  border-bottom: none;
}

.policy-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.policy-empty {
  padding: 24px;
  border: 1px dashed var(--elder-border);
  border-radius: 8px;
}

.event-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.event-title {
  font-weight: 500;
}

.event-source {
  margin-top: 4px;
  font-size: 11px;
  color: var(--elder-text-weak);
}

.change-timeline {
  padding-top: 8px;
}

.change-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.change-body {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.change-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
}
</style>
