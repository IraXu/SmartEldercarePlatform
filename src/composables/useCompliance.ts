import { computed, reactive } from 'vue'
import { addAudit, currentUser } from './useAuth'
import { elders } from '@/mock/elders'

export type ConsentType = '设备安装' | '视频采集' | '定位追踪' | '记录仪录制'
export type ConsentStatus = '已授权' | '待确认' | '已撤回' | '已过期'

export interface ConsentRecord {
  id: string
  elderId: string
  elderName: string
  community: string
  grid: string
  address: string
  type: ConsentType
  scope: string
  status: ConsentStatus
  channel: '电子授权书' | '纸质授权书' | '家属代签'
  signer: string
  relation: string
  signedAt: string
  expireAt: string
  withdrawnAt?: string
  withdrawReason?: string
  attachment: string
  note?: string
}

export type AccessDataType = '视频片段' | '事件记录' | '健康档案' | '设备清单'
export type AccessStatus = '待审批' | '一级通过' | '已通过' | '已驳回' | '已过期'

export interface ApprovalLog {
  level: 1 | 2
  approver: string
  role: string
  time: string
  result: '通过' | '驳回'
  opinion: string
}

export interface AccessRequest {
  id: string
  applicant: string
  applicantRole: string
  applicantOrg: string
  targetName: string
  elderId?: string
  dataType: AccessDataType
  scope: string
  timeRange: string
  reason: string
  crossDomain: boolean
  status: AccessStatus
  createdAt: string
  logs: ApprovalLog[]
  rejectReason?: string
}

export interface RetentionPolicy {
  key: string
  name: string
  dataScope: string
  days: number
  unit: '天' | '年'
  min: number
  max: number
  storage: string
  method: string
  owner: string
  updatedAt: string
}

export interface DestructionRecord {
  id: string
  date: string
  type: string
  count: string
  size: string
  method: string
  operator: string
  witness: string
  status: '已完成' | '失败'
  note?: string
}

export type IntegrationStatus = '已启用' | '未启用' | '联调中'

export interface Integration {
  key: string
  name: string
  desc: string
  direction: '双向' | '上送' | '拉取' | '外呼'
  scope: string[]
  frequency: string
  endpoint: string
  contact: string
  status: IntegrationStatus
  lastSync: string
}

export type BaselineStatus = '已满足' | '待整改' | '联调中'

export interface BaselineItem {
  key: string
  name: string
  requirement: string
  status: BaselineStatus
  note: string
}

export interface SecurityAlert {
  id: string
  time: string
  type: string
  target: string
  risk: '高' | '中' | '低'
  status: '待处理' | '已处理'
  detail: string
  handledAt?: string
  handler?: string
}

export const consentTypeOptions: ConsentType[] = ['设备安装', '视频采集', '定位追踪', '记录仪录制']
export const accessDataTypeOptions: AccessDataType[] = ['视频片段', '事件记录', '健康档案', '设备清单']

export const consentTypeDescriptions: Record<ConsentType, string> = {
  设备安装: '在老人住所安装摄像头、烟感、雷达、定位器等感知设备',
  视频采集: '采集客厅、阳台等区域视频与关键帧，原始视频不出户',
  定位追踪: '获取随身定位器位置与轨迹，用于走失与外出异常判断',
  记录仪录制: '上门服务过程关键节点录制，用于服务核验与争议举证',
}

function resolveElder(id: string, fallbackCommunity = '安康社区') {
  const elder = elders.find((item) => item.id === id)
  return {
    elderId: id,
    elderName: elder?.name ?? id,
    community: elder?.community ?? fallbackCommunity,
    grid: elder?.grid ?? '第1网格',
    address: elder ? `${elder.building} ${elder.unit} ${elder.room}` : '-',
  }
}

const kangleElder = elders.find((item) => item.community === '康乐社区')

const seedConsents: ConsentRecord[] = [
  {
    ...resolveElder('E00001'),
    id: 'CNS20260912001',
    type: '视频采集',
    scope: '客厅摄像头、阳台摄像头；原始视频不出户，仅事件关键帧上传',
    status: '已授权',
    channel: '电子授权书',
    signer: '李伟',
    relation: '儿子',
    signedAt: '2026-09-12 10:20',
    expireAt: '2027-09-11',
    attachment: '授权书-张桂芳-视频采集-20260912.pdf',
    note: '家属代为签署，已电话确认',
  },
  {
    ...resolveElder('E00001'),
    id: 'CNS20260912002',
    type: '设备安装',
    scope: '卧室与卫生间毫米波雷达；不安装摄像头',
    status: '已授权',
    channel: '电子授权书',
    signer: '李伟',
    relation: '儿子',
    signedAt: '2026-09-12 10:32',
    expireAt: '2027-09-11',
    attachment: '授权书-张桂芳-设备安装-20260912.pdf',
  },
  {
    ...resolveElder('E00002'),
    id: 'CNS20260918001',
    type: '定位追踪',
    scope: '随身定位器，07:00–21:00 上报位置，异常越界即时通知',
    status: '已授权',
    channel: '家属代签',
    signer: '李婷',
    relation: '女儿',
    signedAt: '2026-09-18 15:10',
    expireAt: '2027-09-17',
    attachment: '授权书-李长顺-定位追踪-20260918.pdf',
  },
  {
    ...resolveElder('E00003'),
    id: 'CNS20251001001',
    type: '视频采集',
    scope: '客厅摄像头；夜间 22:00–07:00 关闭',
    status: '已过期',
    channel: '纸质授权书',
    signer: '王强',
    relation: '儿子',
    signedAt: '2025-10-01 09:00',
    expireAt: '2026-09-30',
    attachment: '授权书-王秀兰-视频采集-20251001.pdf',
    note: '已到期，待重新签署',
  },
  {
    ...resolveElder('E00005'),
    id: 'CNS20261008001',
    type: '设备安装',
    scope: '厨房燃气报警器、客厅烟感；卧室不安装摄像头',
    status: '待确认',
    channel: '纸质授权书',
    signer: '刘洋',
    relation: '侄子',
    signedAt: '2026-10-08 14:05',
    expireAt: '2027-10-07',
    attachment: '授权书-刘淑珍-设备安装-20261008.pdf',
    note: '纸质授权书未回传扫描件',
  },
  {
    ...resolveElder('E00006'),
    id: 'CNS20260415001',
    type: '定位追踪',
    scope: '随身定位器，全天上报；仅社区与紧急联系人可见',
    status: '已撤回',
    channel: '电子授权书',
    signer: '赵敏',
    relation: '女儿',
    signedAt: '2026-04-15 11:20',
    expireAt: '2027-04-14',
    withdrawnAt: '2026-10-20 09:15',
    withdrawReason: '老人近期居家不出，家属要求停止定位',
    attachment: '授权书-赵德明-定位追踪-20260415.pdf',
  },
  {
    ...resolveElder('E00007'),
    id: 'CNS20261020002',
    type: '记录仪录制',
    scope: '长护险上门服务，进门前告知，关键节点录制',
    status: '待确认',
    channel: '纸质授权书',
    signer: '孙浩',
    relation: '儿子',
    signedAt: '2026-10-20 16:40',
    expireAt: '2027-10-19',
    attachment: '授权书-孙玉梅-记录仪录制-20261020.pdf',
    note: '等待老人本人确认',
  },
  {
    ...resolveElder('E00004'),
    id: 'CNS20260805001',
    type: '视频采集',
    scope: '客厅摄像头；仅事件发生前后 30 秒片段上传',
    status: '已授权',
    channel: '电子授权书',
    signer: '陈静',
    relation: '女儿',
    signedAt: '2026-08-05 10:00',
    expireAt: '2027-08-04',
    attachment: '授权书-陈建国-视频采集-20260805.pdf',
  },
  ...(kangleElder
    ? [
        {
          ...resolveElder(kangleElder.id),
          id: 'CNS20260926001',
          type: '设备安装' as ConsentType,
          scope: '客厅烟感、卧室毫米波雷达；不安装摄像头',
          status: '已授权' as ConsentStatus,
          channel: '电子授权书' as const,
          signer: '周敏',
          relation: '女儿',
          signedAt: '2026-09-26 09:30',
          expireAt: '2027-09-25',
          attachment: '授权书-康乐社区-设备安装-20260926.pdf',
        },
      ]
    : []),
  {
    ...resolveElder('E00008'),
    id: 'CNS20261022001',
    type: '视频采集',
    scope: '客厅摄像头；22:00–07:00 关闭',
    status: '待确认',
    channel: '纸质授权书',
    signer: '周丽',
    relation: '女儿',
    signedAt: '2026-10-22 11:15',
    expireAt: '2027-10-21',
    attachment: '授权书-周志强-视频采集-20261022.pdf',
    note: '缺少老人本人签字',
  },
  {
    ...resolveElder('E00009'),
    id: 'CNS20260710001',
    type: '记录仪录制',
    scope: '长护险上门护理服务，关键节点录制，人脸自动打码',
    status: '已授权',
    channel: '家属代签',
    signer: '吴强',
    relation: '儿子',
    signedAt: '2026-07-10 13:40',
    expireAt: '2027-07-09',
    attachment: '授权书-吴凤英-记录仪录制-20260710.pdf',
  },
  {
    ...resolveElder('E00010'),
    id: 'CNS20260303001',
    type: '设备安装',
    scope: '厨房燃气报警器、客厅烟感、卧室雷达',
    status: '已授权',
    channel: '电子授权书',
    signer: '周涛',
    relation: '儿子',
    signedAt: '2026-03-03 09:50',
    expireAt: '2029-03-02',
    attachment: '授权书-周志强-设备安装-20260303.pdf',
  },
]

const seedAccessRequests: AccessRequest[] = [
  {
    id: 'AR20261028001',
    applicant: '吕建成',
    applicantRole: '社区管理员',
    applicantOrg: '安康社区',
    targetName: '张桂芳 · 10-27 L3 跌倒事件',
    elderId: 'E00001',
    dataType: '视频片段',
    scope: '客厅摄像头 2026-10-27 18:00–19:00 片段',
    timeRange: '2026-10-27 18:00–19:00',
    reason: '核实 L3 跌倒事件的处置过程，用于事件复盘与家属沟通',
    crossDomain: false,
    status: '待审批',
    createdAt: '2026-10-28 09:12',
    logs: [],
  },
  {
    id: 'AR20261028002',
    applicant: '李静',
    applicantRole: '民政查看',
    applicantOrg: '安宁区民政局',
    targetName: '张桂芳 · 健康与能力档案',
    elderId: 'E00001',
    dataType: '健康档案',
    scope: '失能等级、慢病标签、长护险待遇记录',
    timeRange: '2026-01-01 至 2026-10-27',
    reason: '长护险待遇复核，需要核对失能等级与护理记录',
    crossDomain: true,
    status: '待审批',
    createdAt: '2026-10-28 09:40',
    logs: [],
  },
  {
    id: 'AR20261027004',
    applicant: '王敏',
    applicantRole: '网格员',
    applicantOrg: '安康社区 第3网格',
    targetName: '刘淑珍 · 烟感预警事件记录',
    elderId: 'E00005',
    dataType: '事件记录',
    scope: '2026-10-27 烟感预警全链路时间轴与处置记录',
    timeRange: '2026-10-27 06:00–12:00',
    reason: '复核本网格烟感预警的到场与处置是否及时',
    crossDomain: true,
    status: '一级通过',
    createdAt: '2026-10-27 14:20',
    logs: [
      {
        level: 1,
        approver: '吕建成',
        role: '社区管理员',
        time: '2026-10-27 15:02',
        result: '通过',
        opinion: '事由合理，同意调阅本社区事件记录',
      },
    ],
  },
  {
    id: 'AR20261026003',
    applicant: '吕建成',
    applicantRole: '社区管理员',
    applicantOrg: '安康社区',
    targetName: '康乐社区 · 视频片段',
    dataType: '视频片段',
    scope: '康乐社区 2 号楼客厅摄像头片段',
    timeRange: '2026-10-26 20:00–21:00',
    reason: '跨社区协作排查',
    crossDomain: true,
    status: '已驳回',
    createdAt: '2026-10-26 10:05',
    logs: [
      {
        level: 1,
        approver: '周建国',
        role: '平台管理员',
        time: '2026-10-26 10:40',
        result: '驳回',
        opinion: '调阅事由不充分，请补充事件编号与协作依据',
      },
    ],
    rejectReason: '调阅事由不充分，请补充事件编号与协作依据',
  },
  {
    id: 'AR20261024002',
    applicant: '李静',
    applicantRole: '民政查看',
    applicantOrg: '安宁区民政局',
    targetName: '李长顺 · 设备清单',
    elderId: 'E00002',
    dataType: '设备清单',
    scope: '在用设备类型、安装房间与在线状态',
    timeRange: '截至 2026-10-24',
    reason: '区域设备覆盖核查',
    crossDomain: true,
    status: '已通过',
    createdAt: '2026-10-24 09:30',
    logs: [
      {
        level: 1,
        approver: '吕建成',
        role: '社区管理员',
        time: '2026-10-24 10:12',
        result: '通过',
        opinion: '设备清单不涉及视频，同意调阅',
      },
      {
        level: 2,
        approver: '周建国',
        role: '平台管理员',
        time: '2026-10-24 11:05',
        result: '通过',
        opinion: '同意，仅限设备清单范围',
      },
    ],
  },
  {
    id: 'AR20261020001',
    applicant: '王敏',
    applicantRole: '网格员',
    applicantOrg: '安康社区 第4网格',
    targetName: '吴凤英 · 记录仪影像',
    elderId: 'E00009',
    dataType: '视频片段',
    scope: '长护险护理服务关键节点影像 3 段',
    timeRange: '2026-10-19 09:00–11:00',
    reason: '服务争议举证，需要核对护理过程',
    crossDomain: true,
    status: '已过期',
    createdAt: '2026-10-20 08:40',
    logs: [],
  },
]

export const retentionPolicies = reactive<RetentionPolicy[]>([
  {
    key: 'localVideo',
    name: '本地视频',
    dataScope: '摄像头原始视频，仅存于边缘设备',
    days: 7,
    unit: '天',
    min: 3,
    max: 30,
    storage: '社区边缘存储',
    method: '到期自动覆盖',
    owner: '社区管理员',
    updatedAt: '2026-10-01 09:00',
  },
  {
    key: 'eventClip',
    name: '事件片段',
    dataScope: 'L2/L3 事件关键帧与短视频',
    days: 90,
    unit: '天',
    min: 30,
    max: 365,
    storage: '平台加密存储',
    method: '不可恢复删除',
    owner: '平台管理员',
    updatedAt: '2026-09-15 14:20',
  },
  {
    key: 'serviceEvidence',
    name: '服务存证',
    dataScope: '长护险工单记录、签认与关键影像',
    days: 2,
    unit: '年',
    min: 1,
    max: 5,
    storage: '平台加密存储',
    method: '归档后物理销毁',
    owner: '医保监管',
    updatedAt: '2026-08-01 10:00',
  },
  {
    key: 'auditLog',
    name: '审计日志',
    dataScope: '登录、审核、调阅、导出与配置变更',
    days: 3,
    unit: '年',
    min: 3,
    max: 10,
    storage: '平台只读存储',
    method: '到期归档',
    owner: '平台管理员',
    updatedAt: '2026-07-01 09:30',
  },
  {
    key: 'consentRecord',
    name: '同意记录',
    dataScope: '授权书、撤回记录与签署凭证',
    days: 5,
    unit: '年',
    min: 3,
    max: 10,
    storage: '平台加密存储',
    method: '到期归档',
    owner: '平台管理员',
    updatedAt: '2026-07-01 09:32',
  },
])

export const destructionRecords = reactive<DestructionRecord[]>([
  {
    id: 'DS20261027001',
    date: '2026-10-27 03:00',
    type: '本地视频',
    count: '42 户 / 3,860 段',
    size: '126 GB',
    method: '到期自动覆盖',
    operator: '系统任务',
    witness: '周建国',
    status: '已完成',
  },
  {
    id: 'DS20261026001',
    date: '2026-10-26 03:00',
    type: '事件片段',
    count: '18 条',
    size: '2.4 GB',
    method: '不可恢复删除',
    operator: '系统任务',
    witness: '周建国',
    status: '已完成',
  },
  {
    id: 'DS20261025001',
    date: '2026-10-25 03:00',
    type: '本地视频',
    count: '38 户 / 3,120 段',
    size: '104 GB',
    method: '到期自动覆盖',
    operator: '系统任务',
    witness: '周建国',
    status: '已完成',
  },
  {
    id: 'DS20261023001',
    date: '2026-10-23 03:00',
    type: '事件片段',
    count: '6 条',
    size: '860 MB',
    method: '不可恢复删除',
    operator: '系统任务',
    witness: '周建国',
    status: '失败',
    note: '对象存储节点超时，已生成告警并安排重试',
  },
])

export const integrations = reactive<Integration[]>([
  {
    key: 'civil',
    name: '民政数据共享',
    desc: '向区民政局共享老人基础档案、事件统计与设备覆盖',
    direction: '双向',
    scope: ['老人基础档案', '事件统计', '设备覆盖统计'],
    frequency: '每日 02:00',
    endpoint: 'https://civil.anning.gov.cn/api/**',
    contact: '区民政局信息中心',
    status: '已启用',
    lastSync: '2026-10-28 02:00',
  },
  {
    key: 'insurance',
    name: '医保监管',
    desc: '向医保监管端上送工单与证据索引，支撑长护险稽核',
    direction: '上送',
    scope: ['工单摘要', '证据索引', '签认结果'],
    frequency: '实时',
    endpoint: 'https://yb.anning.gov.cn/open/**',
    contact: '区医保局稽核科',
    status: '联调中',
    lastSync: '2026-10-27 18:30',
  },
  {
    key: 'address',
    name: '公安地址库',
    desc: '拉取标准地址与门牌信息，校验档案地址规范性',
    direction: '拉取',
    scope: ['标准地址', '门牌信息'],
    frequency: '每周一 03:00',
    endpoint: 'https://gas.anning.gov.cn/address/**',
    contact: '区公安分局人口大队',
    status: '已启用',
    lastSync: '2026-10-26 03:00',
  },
  {
    key: 'emergency120',
    name: '120 急救',
    desc: 'L3 紧急事件一键代拨并推送事件摘要与地址',
    direction: '外呼',
    scope: ['事件摘要', '老人地址', '联系人'],
    frequency: '事件触发',
    endpoint: '内置语音网关',
    contact: '市急救中心调度室',
    status: '已启用',
    lastSync: '2026-10-27 19:12',
  },
  {
    key: 'emergency119',
    name: '119 消防',
    desc: '明火与燃气高浓度事件推送消防联动',
    direction: '外呼',
    scope: ['事件摘要', '老人地址'],
    frequency: '事件触发',
    endpoint: '未配置',
    contact: '区消防救援大队',
    status: '未启用',
    lastSync: '从未同步',
  },
])

export const baselineItems = reactive<BaselineItem[]>([
  {
    key: 'loginLock',
    name: '登录失败锁定',
    requirement: '连续 5 次失败锁定 15 分钟',
    status: '已满足',
    note: '已由 M0 登录逻辑实现',
  },
  {
    key: 'session',
    name: '会话超时',
    requirement: '无操作 30 分钟自动退出',
    status: '已满足',
    note: '当前设置 30 分钟',
  },
  {
    key: 'password',
    name: '密码复杂度',
    requirement: '至少 8 位且包含字母与数字',
    status: '待整改',
    note: '原型演示密码为 6 位，正式环境需提升',
  },
  {
    key: 'export',
    name: '导出管控',
    requirement: '导出水印 + 二次确认 + 审计留痕',
    status: '已满足',
    note: '审计日志导出已二次确认',
  },
  {
    key: 'mask',
    name: '敏感数据脱敏',
    requirement: '手机号、证件号按角色脱敏',
    status: '已满足',
    note: '民政查看视角已脱敏',
  },
  {
    key: 'auditRetention',
    name: '审计日志留存',
    requirement: '不少于 3 年',
    status: '已满足',
    note: '留存策略设置为 3 年',
  },
  {
    key: 'transport',
    name: '传输加密',
    requirement: '外部集成使用 TLS 1.2 及以上',
    status: '已满足',
    note: '集成地址均为 HTTPS',
  },
  {
    key: 'thirdParty',
    name: '第三方最小授权',
    requirement: '按接口限定数据范围与调用频率',
    status: '联调中',
    note: '医保监管联调中，待确认字段清单',
  },
])

export const securityAlerts = reactive<SecurityAlert[]>([
  {
    id: 'SA20261028001',
    time: '2026-10-28 10:12',
    type: '批量导出预警',
    target: '吕建成 · 安康社区',
    risk: '高',
    status: '待处理',
    detail: '单次导出老人档案 320 条，超过 200 条阈值',
  },
  {
    id: 'SA20261027002',
    time: '2026-10-27 21:40',
    type: '异地登录',
    target: '李静 · 民政查看',
    risk: '中',
    status: '待处理',
    detail: '登录 IP 10.0.3.77 不在政务网白名单内',
  },
  {
    id: 'SA20261027001',
    time: '2026-10-27 16:05',
    type: '越权访问尝试',
    target: '王敏 · 网格员',
    risk: '中',
    status: '已处理',
    detail: '尝试访问康乐社区老人档案，已被数据域拦截',
    handledAt: '2026-10-27 16:20',
    handler: '周建国',
  },
  {
    id: 'SA20261026001',
    time: '2026-10-26 09:00',
    type: '授权到期提醒',
    target: '3 条视频采集授权',
    risk: '低',
    status: '待处理',
    detail: '30 天内到期，涉及张桂芳、陈建国、吴凤英',
  },
])

export const securitySettings = reactive({
  sessionTimeout: 30,
  loginLock: 5,
  exportWatermark: true,
  exportConfirm: true,
})

export const complianceRole = computed(() => currentUser.value?.role ?? '')
export const canViewCompliance = computed(() =>
  ['platform_admin', 'project_admin', 'project_staff'].includes(complianceRole.value),
)
export const isComplianceAdmin = computed(() => complianceRole.value === 'platform_admin')

export const accessRequests = reactive<AccessRequest[]>(seedAccessRequests)
export const consents = reactive<ConsentRecord[]>(seedConsents)

export const pendingAccessCount = computed(
  () => accessRequests.filter((item) => item.status === '待审批' || item.status === '一级通过').length,
)
export const pendingConsentCount = computed(
  () => consents.filter((item) => item.status === '待确认').length,
)

function nowText() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function revokeConsent(id: string, reason: string) {
  const record = consents.find((item) => item.id === id)
  if (!record) return { ok: false, message: '授权记录不存在' }
  if (!reason.trim()) return { ok: false, message: '请填写撤回原因' }
  if (record.status === '已撤回') return { ok: false, message: '该授权已撤回' }
  record.status = '已撤回'
  record.withdrawnAt = nowText()
  record.withdrawReason = reason.trim()
  addAudit('撤回授权', record.id, '成功', `${record.elderName} · ${record.type}：${reason.trim()}`)
  return { ok: true, message: '授权已撤回，设备已停止采集' }
}

export function approveAccess(id: string) {
  const request = accessRequests.find((item) => item.id === id)
  if (!request) return { ok: false, message: '申请不存在' }
  if (request.status === '已过期') return { ok: false, message: '该申请已过期' }
  if (request.status === '已通过' || request.status === '已驳回') {
    return { ok: false, message: '该申请已完成审批' }
  }
  const user = currentUser.value
  if (!user) return { ok: false, message: '请先登录' }
  if (request.status === '待审批') {
    if (request.crossDomain) {
      request.status = '一级通过'
      request.logs.push({
        level: 1,
        approver: user.name,
        role: user.roleLabel,
        time: nowText(),
        result: '通过',
        opinion: '一级审批通过，等待项目管理员二级审批',
      })
      addAudit('调阅审批', request.id, '一级通过', `${request.targetName} · ${request.dataType}`)
      return { ok: true, level: 'first' as const, message: '一级审批已通过，等待项目管理员二级审批' }
    }
    request.status = '已通过'
    request.logs.push({
      level: 1,
      approver: user.name,
      role: user.roleLabel,
      time: nowText(),
      result: '通过',
      opinion: '非跨域申请，一级审批通过即生效',
    })
    addAudit('调阅审批', request.id, '通过', `${request.targetName} · ${request.dataType}`)
    return { ok: true, level: 'done' as const, message: '审批已通过' }
  }
  if (request.status === '一级通过') {
    if (user.role !== 'platform_admin' && user.role !== 'project_admin') {
      return { ok: false, message: '二级审批仅项目管理员与平台运营可操作' }
    }
    request.status = '已通过'
    request.logs.push({
      level: 2,
      approver: user.name,
      role: user.roleLabel,
      time: nowText(),
      result: '通过',
      opinion: '二级审批通过，同意调阅',
    })
    addAudit('调阅审批', request.id, '通过', `${request.targetName} · 二级审批`)
    return { ok: true, level: 'done' as const, message: '审批已通过' }
  }
  return { ok: false, message: '当前状态不可审批' }
}

export function rejectAccess(id: string, reason: string) {
  const request = accessRequests.find((item) => item.id === id)
  if (!request) return { ok: false, message: '申请不存在' }
  if (!reason.trim()) return { ok: false, message: '请填写驳回原因' }
  if (request.status === '已通过' || request.status === '已驳回' || request.status === '已过期') {
    return { ok: false, message: '该申请当前不可驳回' }
  }
  const user = currentUser.value
  request.status = '已驳回'
  request.rejectReason = reason.trim()
  request.logs.push({
    level: request.logs.length === 0 ? 1 : 2,
    approver: user?.name ?? '系统',
    role: user?.roleLabel ?? '系统',
    time: nowText(),
    result: '驳回',
    opinion: reason.trim(),
  })
  addAudit('调阅驳回', request.id, '成功', `${request.targetName}：${reason.trim()}`)
  return { ok: true, message: '申请已驳回' }
}

export function updateRetentionPolicy(
  key: string,
  payload: { days: number; method: string; note?: string },
) {
  const policy = retentionPolicies.find((item) => item.key === key)
  if (!policy) return { ok: false, message: '策略不存在' }
  if (!Number.isFinite(payload.days) || payload.days < policy.min || payload.days > policy.max) {
    return { ok: false, message: `留存天数需在 ${policy.min}–${policy.max} 之间` }
  }
  const before = `${policy.days}${policy.unit}`
  policy.days = payload.days
  policy.method = payload.method
  policy.updatedAt = nowText()
  addAudit(
    '留存策略',
    `${policy.name}：${before} → ${payload.days}${policy.unit}`,
    '成功',
    payload.note || '调整留存期限与销毁方式',
  )
  return { ok: true, message: '留存策略已更新' }
}

export function toggleIntegration(key: string, enabled: boolean, reason?: string) {
  const integration = integrations.find((item) => item.key === key)
  if (!integration) return { ok: false, message: '集成不存在' }
  if (!enabled && !reason?.trim()) return { ok: false, message: '请填写关闭原因' }
  integration.status = enabled ? '已启用' : '未启用'
  addAudit(
    enabled ? '启用集成' : '关闭集成',
    integration.name,
    '成功',
    enabled ? '恢复外部数据共享' : reason?.trim() || '关闭外部数据共享',
  )
  return { ok: true, message: enabled ? '集成已启用' : '集成已关闭' }
}

export function saveIntegrationConfig(
  key: string,
  payload: { scope: string[]; frequency: string; endpoint: string; contact: string },
) {
  const integration = integrations.find((item) => item.key === key)
  if (!integration) return { ok: false, message: '集成不存在' }
  if (payload.scope.length === 0) return { ok: false, message: '请至少选择一项数据范围' }
  integration.scope = [...payload.scope]
  integration.frequency = payload.frequency
  integration.endpoint = payload.endpoint
  integration.contact = payload.contact
  if (integration.status !== '未启用') integration.status = '已启用'
  addAudit('集成配置', integration.name, '成功', `范围：${payload.scope.join('、')}`)
  return { ok: true, message: '集成配置已保存' }
}

export function saveSecuritySettings(payload: { sessionTimeout: number }) {
  securitySettings.sessionTimeout = payload.sessionTimeout
  addAudit('安全设置', '会话与导出管控', '成功', `会话超时 ${payload.sessionTimeout} 分钟`)
  return { ok: true, message: '安全设置已保存' }
}

export function handleSecurityAlert(id: string) {
  const alert = securityAlerts.find((item) => item.id === id)
  if (!alert) return { ok: false, message: '告警不存在' }
  if (alert.status === '已处理') return { ok: false, message: '该告警已处理' }
  alert.status = '已处理'
  alert.handledAt = nowText()
  alert.handler = currentUser.value?.name ?? '系统'
  addAudit('安全告警', alert.id, '成功', `${alert.type}：${alert.target}`)
  return { ok: true, message: '告警已标记为已处理' }
}
