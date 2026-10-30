import { reactive } from 'vue'

export type Gender = '男' | '女'
export type RiskLevel = '高风险' | '中风险' | '低风险'
export type ElderStatus = '正常' | '待完善' | '已归档'
export type Disability = '能力完好' | '轻度失能' | '中度失能' | '重度失能' | '未评估'
export type EventLevel = 'L1' | 'L2' | 'L3'
export type RoomType = '卧室' | '卫生间' | '厨房' | '客厅' | '阳台' | '其他'

export interface Relation {
  id: string
  name: string
  relation: string
  phone: string
  sameCity: boolean
  guardian: boolean
  caregiver: boolean
  authorized: '已授权' | '未授权' | '已过期'
  isEmergency: boolean
  active?: boolean
}

export interface PolicyTag {
  name: string
  status: '生效中' | '已失效'
  updatedAt: string
}

export interface EventSummary {
  level: EventLevel
  type: string
  time: string
}

export interface ChangeRecord {
  id: string
  time: string
  operator: string
  field: string
  before: string
  after: string
  reason: string
}

export interface Snapshot {
  id: string
  source: string
  time: string
  address: string
  contact: string
  deviceSummary: string
}

export interface ElderHealth {
  chronic: string[]
  mobility: string
  cognition: string
  hearing: string
  medication: string
}

export interface EntryInfo {
  keyHolder: string
  smartLock: boolean
  smartLockPassword: string
  propertyOpen: boolean
  note: string
}

export interface Elder {
  id: string
  name: string
  gender: Gender
  birthDate: string
  age: number
  idCard: string
  phone: string
  district: string
  street: string
  community: string
  grid: string
  tenantId: string
  building: string
  unit: string
  room: string
  address: string
  livingStatus: string
  disability: Disability
  riskLevel: RiskLevel
  riskTags: string[]
  completeness: number
  missingCount: number
  status: ElderStatus
  devicesOnline: number
  devicesTotal: number
  lastEvent: EventSummary | null
  houseId: string
  health: ElderHealth
  relations: Relation[]
  policies: PolicyTag[]
  entry: EntryInfo
  changes: ChangeRecord[]
  snapshots: Snapshot[]
  updatedAt: string
  hasOpenEvent: boolean
}

export interface HouseDevice {
  id: string
  type: string
  note: string
  status: '在线' | '离线'
}

export interface Room {
  id: string
  name: string
  type: RoomType
  area: number
  gridArea: string
  devices: HouseDevice[]
}

export interface House {
  id: string
  community: string
  building: string
  unit: string
  room: string
  floor: number
  elevator: boolean
  houseType: string
  area: number
  entry: EntryInfo
  rooms: Room[]
}

export const maskPhone = (phone: string) => phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')

export const maskIdCard = (idCard: string) =>
  idCard.replace(/^(\d{6})\d{8}([\dXx]{4})$/, '$1********$2')

export const formatAge = (birthDate: string) => {
  const year = Number(birthDate.slice(0, 4))
  return Math.max(0, 2026 - year)
}

const chronicPool = ['高血压', '糖尿病', '冠心病', '慢阻肺', '关节炎', '白内障']
const eventTypes: Array<{ level: EventLevel; type: string }> = [
  { level: 'L1', type: '24 小时未检测到起居活动' },
  { level: 'L1', type: '连续两天未出门' },
  { level: 'L2', type: '疑似跌倒，待确认' },
  { level: 'L2', type: '烟感预警' },
  { level: 'L2', type: '电子围栏越界' },
  { level: 'L3', type: '雷达与视觉交叉确认跌倒' },
  { level: 'L3', type: 'SOS 一键求助' },
]

const relationTypes = ['儿子', '女儿', '配偶', '监护人', '主要照护者', '其他亲属']

const surnames = '张王李赵刘陈杨黄周吴徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split(
  '',
)
const givenNames = [
  '桂芳', '长顺', '秀兰', '建国', '淑珍', '德明', '玉梅', '志强', '凤英', '海龙',
  '秀英', '国华', '春兰', '文斌', '玉珍', '志远', '金华', '建华', '秀荣', '国庆',
  '桂英', '立新', '凤兰', '春生', '玉兰', '明远', '志刚', '秀云', '建平', '晓东',
  '淑英', '国平', '春梅', '文华', '玉华', '德胜', '秀芳', '振华', '桂兰', '成林',
  '秀珍', '志明', '金凤', '建民', '玉珍', '立国', '凤霞', '文军', '春花', '德福',
]

let seed = 20261027
const random = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)]
const pad = (value: number, length: number) => String(value).padStart(length, '0')

const communities = [
  { tenantId: 'P-AN', district: '安宁区', street: '安康街道', community: '安康社区', grids: 6 },
  { tenantId: 'P-AN', district: '安宁区', street: '安康街道', community: '康乐社区', grids: 4 },
  { tenantId: 'P-NJ-LH', district: '六合区', street: '雄州街道', community: '龙池社区', grids: 3 },
  { tenantId: 'P-YZ-HJ', district: '邗江区', street: '邗上街道', community: '兰庄社区', grids: 3 },
]

const tenantOfCommunity = (name: string) =>
  communities.find((item) => item.community === name)?.tenantId ?? 'P-AN'

function buildPolicyTags(tags: string[], age: number): PolicyTag[] {
  const policies: PolicyTag[] = []
  if (age >= 80) policies.push({ name: '高龄津贴', status: '生效中', updatedAt: '2026-09-01' })
  if (tags.includes('低保')) policies.push({ name: '最低生活保障', status: '生效中', updatedAt: '2026-07-15' })
  if (tags.includes('特困')) policies.push({ name: '特困供养', status: '生效中', updatedAt: '2026-06-20' })
  if (tags.includes('家庭养老床位'))
    policies.push({ name: '家庭养老床位', status: '生效中', updatedAt: '2026-08-08' })
  if (tags.includes('长护险'))
    policies.push({ name: '长护险待遇（中度）', status: '生效中', updatedAt: '2026-05-12' })
  return policies
}

function buildChanges(name: string, updatedAt: string): ChangeRecord[] {
  return [
    {
      id: `CH-${name}-1`,
      time: updatedAt,
      operator: '王敏',
      field: '联系电话',
      before: '138****1122',
      after: '138****6721',
      reason: '走访更新',
    },
    {
      id: `CH-${name}-2`,
      time: '2026-09-18 10:20',
      operator: '李静',
      field: '居住状态',
      before: '与子女同住',
      after: '独居',
      reason: '子女搬离，按实际更新',
    },
  ]
}

function buildSnapshot(elder: Pick<Elder, 'address' | 'relations' | 'devicesOnline' | 'devicesTotal' | 'lastEvent'>): Snapshot[] {
  const contact = elder.relations.find((item) => item.isEmergency)
  const base = {
    address: elder.address,
    contact: contact ? `${contact.name} ${maskPhone(contact.phone)}` : '未登记',
    deviceSummary: `${elder.devicesTotal} 台（在线 ${elder.devicesOnline}）`,
  }
  const list: Snapshot[] = [
    {
      id: `SS-${Math.random().toString(36).slice(2, 8)}`,
      source: '建档快照',
      time: '2025-12-02 09:10',
      ...base,
    },
  ]
  if (elder.lastEvent) {
    list.unshift({
      id: `SS-${Math.random().toString(36).slice(2, 8)}`,
      source: `${elder.lastEvent.level} 事件`,
      time: '2026-10-18 03:12',
      ...base,
    })
  }
  return list
}

export function makeElder(input: Partial<Elder> & { id: string; name: string; gender: Gender; birthDate: string }): Elder {
  const age = formatAge(input.birthDate)
  const birth = input.birthDate.replace(/-/g, '')
  const idCard = input.idCard ?? `320102${birth}${pad(1000 + Number(input.id.slice(1)), 4)}`
  const phone = input.phone ?? `138${pad(10000000 + Number(input.id.slice(1)) * 37, 8).slice(-8)}`
  const community = input.community ?? '安康社区'
  const street = input.street ?? '安康街道'
  const district = input.district ?? '安宁区'
  const grid = input.grid ?? `第${(Number(input.id.slice(1)) % 6) + 1}网格`
  const building = input.building ?? `幸福里 ${(Number(input.id.slice(1)) % 9) + 1}栋`
  const unit = input.unit ?? `${(Number(input.id.slice(1)) % 3) + 1}单元`
  const room = input.room ?? `${(Number(input.id.slice(1)) % 6) + 1}0${(Number(input.id.slice(1)) % 4) + 1}`
  const address = `${community} ${building} ${unit} ${room}`
  const riskTags = input.riskTags ?? []
  const disability = input.disability ?? '能力完好'
  const relations =
    input.relations ??
    [
      {
        id: `R-${input.id}-1`,
        name: `${surnames[Number(input.id.slice(1)) % surnames.length]}伟`,
        relation: pick(relationTypes),
        phone: `139${pad(20000000 + Number(input.id.slice(1)) * 53, 8).slice(-8)}`,
        sameCity: Number(input.id.slice(1)) % 3 !== 0,
        guardian: disability === '重度失能',
        caregiver: Number(input.id.slice(1)) % 4 === 0,
        authorized: Number(input.id.slice(1)) % 5 === 0 ? '未授权' : '已授权',
        isEmergency: true,
      },
      {
        id: `R-${input.id}-2`,
        name: Number(input.id.slice(1)) % 2 === 0 ? '王敏' : '李强',
        relation: '网格员',
        phone: '13900001234',
        sameCity: true,
        guardian: false,
        caregiver: false,
        authorized: '已授权',
        isEmergency: false,
      },
    ]
  const completeness = input.completeness ?? pick([100, 100, 100, 96, 92, 88, 78, 64])
  const status: ElderStatus = input.status ?? (completeness < 80 ? '待完善' : '正常')
  const lastEvent: EventSummary | null =
    input.lastEvent !== undefined
      ? input.lastEvent
      : Number(input.id.slice(1)) % 5 === 0
        ? { level: 'L2', type: '疑似跌倒，待确认', time: '2 小时前' }
        : Number(input.id.slice(1)) % 3 === 0
          ? { level: 'L1', type: '连续两天未出门', time: '5 小时前' }
          : null
  const base: Elder = {
    id: input.id,
    name: input.name,
    gender: input.gender,
    birthDate: input.birthDate,
    age,
    idCard,
    phone,
    district,
    street,
    community,
    grid,
    tenantId: input.tenantId ?? tenantOfCommunity(community),
    building,
    unit,
    room,
    address,
    livingStatus: input.livingStatus ?? '与子女同住',
    disability,
    riskLevel: input.riskLevel ?? '低风险',
    riskTags,
    completeness,
    missingCount: Math.max(0, Math.round(((100 - completeness) / 100) * 16)),
    status,
    devicesOnline: input.devicesOnline ?? (Number(input.id.slice(1)) % 4 === 0 ? 2 : 3),
    devicesTotal: input.devicesTotal ?? 4,
    lastEvent,
    houseId: input.houseId ?? `H${input.id.slice(1)}`,
    health: input.health ?? {
      chronic: Number(input.id.slice(1)) % 3 === 0 ? ['高血压'] : [],
      mobility: '自主行走',
      cognition: '正常',
      hearing: '正常',
      medication: '无',
    },
    relations,
    policies: input.policies ?? buildPolicyTags(riskTags, age),
    entry: input.entry ?? {
      keyHolder: Number(input.id.slice(1)) % 2 === 0 ? '儿子处' : '老人随身携带',
      smartLock: Number(input.id.slice(1)) % 4 === 0,
      smartLockPassword: '8821#',
      propertyOpen: Number(input.id.slice(1)) % 3 === 0,
      note: '上门前请先电话联系',
    },
    changes: input.changes ?? buildChanges(input.name, input.updatedAt ?? '2026-10-20 09:32'),
    snapshots: [],
    updatedAt: input.updatedAt ?? '2026-10-20 09:32',
    hasOpenEvent: input.hasOpenEvent ?? false,
  }
  base.snapshots = input.snapshots ?? buildSnapshot(base)
  return base
}

const handCrafted: Elder[] = [
  makeElder({
    id: 'E00001',
    name: '张桂芳',
    gender: '女',
    birthDate: '1943-06-12',
    riskTags: ['独居', '高龄', '失能', '长护险'],
    livingStatus: '独居',
    disability: '中度失能',
    riskLevel: '高风险',
    completeness: 92,
    building: '幸福里 3栋',
    unit: '2单元',
    room: '401',
    devicesOnline: 3,
    devicesTotal: 4,
    lastEvent: { level: 'L2', type: '疑似跌倒，待确认', time: '2 小时前' },
    houseId: 'H00001',
    health: {
      chronic: ['高血压', '糖尿病'],
      mobility: '需助行器',
      cognition: '轻度认知障碍',
      hearing: '听力下降',
      medication: '早晚各一次降压药',
    },
    relations: [
      {
        id: 'R-001-1',
        name: '李伟',
        relation: '儿子',
        phone: '13912342233',
        sameCity: true,
        guardian: true,
        caregiver: true,
        authorized: '已授权',
        isEmergency: true,
      },
      {
        id: 'R-001-2',
        name: '李婷',
        relation: '女儿',
        phone: '13898765432',
        sameCity: false,
        guardian: false,
        caregiver: false,
        authorized: '已授权',
        isEmergency: false,
      },
      {
        id: 'R-001-3',
        name: '王敏',
        relation: '网格员',
        phone: '13900001234',
        sameCity: true,
        guardian: false,
        caregiver: false,
        authorized: '已授权',
        isEmergency: false,
      },
    ],
    entry: {
      keyHolder: '儿子李伟处',
      smartLock: true,
      smartLockPassword: '8821#',
      propertyOpen: true,
      note: '物业可代开，需提前电话确认',
    },
    changes: [
      {
        id: 'CH-001-1',
        time: '2026-10-20 09:32',
        operator: '王敏',
        field: '联系电话',
        before: '138****1122',
        after: '139****2233',
        reason: '走访更新',
      },
      {
        id: 'CH-001-2',
        time: '2026-09-18 10:20',
        operator: '李静',
        field: '失能等级',
        before: '轻度失能',
        after: '中度失能',
        reason: '长护险评估结果更新',
      },
      {
        id: 'CH-001-3',
        time: '2026-08-02 15:06',
        operator: '王敏',
        field: '进门方式',
        before: '钥匙在老人处',
        after: '钥匙在儿子李伟处',
        reason: '老人记忆力下降，钥匙交由子女保管',
      },
    ],
  }),
  makeElder({
    id: 'E00002',
    name: '李长顺',
    gender: '男',
    birthDate: '1940-02-08',
    riskTags: ['空巢', '高龄', '低保'],
    livingStatus: '与配偶同住',
    disability: '轻度失能',
    riskLevel: '高风险',
    completeness: 100,
    building: '幸福里 3栋',
    unit: '2单元',
    room: '401',
    devicesOnline: 4,
    devicesTotal: 4,
    lastEvent: { level: 'L3', type: 'SOS 一键求助', time: '1 天前' },
    houseId: 'H00001',
    health: {
      chronic: ['冠心病'],
      mobility: '自主行走',
      cognition: '正常',
      hearing: '正常',
      medication: '每日一次阿司匹林',
    },
    relations: [
      {
        id: 'R-002-1',
        name: '李晓梅',
        relation: '女儿',
        phone: '13655556666',
        sameCity: true,
        guardian: false,
        caregiver: true,
        authorized: '已授权',
        isEmergency: true,
      },
      {
        id: 'R-002-2',
        name: '王敏',
        relation: '网格员',
        phone: '13900001234',
        sameCity: true,
        guardian: false,
        caregiver: false,
        authorized: '已授权',
        isEmergency: false,
      },
    ],
  }),
  makeElder({
    id: 'E00003',
    name: '王秀兰',
    gender: '女',
    birthDate: '1938-11-30',
    riskTags: ['失能', '高龄', '家庭养老床位'],
    livingStatus: '与子女同住',
    disability: '重度失能',
    riskLevel: '高风险',
    completeness: 78,
    status: '待完善',
    devicesOnline: 1,
    devicesTotal: 3,
    houseId: 'H00003',
    health: {
      chronic: ['高血压', '关节炎'],
      mobility: '卧床',
      cognition: '中度认知障碍',
      hearing: '听力下降',
      medication: '每日三次，需协助服药',
    },
    relations: [
      {
        id: 'R-003-1',
        name: '王建军',
        relation: '儿子',
        phone: '13744445555',
        sameCity: true,
        guardian: true,
        caregiver: true,
        authorized: '已授权',
        isEmergency: true,
      },
    ],
  }),
  makeElder({
    id: 'E00004',
    name: '陈建国',
    gender: '男',
    birthDate: '1947-03-21',
    riskTags: ['空巢', '高龄'],
    livingStatus: '空巢',
    disability: '能力完好',
    riskLevel: '中风险',
    completeness: 100,
    devicesOnline: 4,
    devicesTotal: 4,
    lastEvent: { level: 'L1', type: '连续两天未出门', time: '3 小时前' },
    houseId: 'H00004',
  }),
  makeElder({
    id: 'E00005',
    name: '刘淑珍',
    gender: '女',
    birthDate: '1935-09-16',
    riskTags: ['独居', '失能', '高龄', '特困'],
    livingStatus: '独居',
    disability: '中度失能',
    riskLevel: '高风险',
    completeness: 64,
    status: '待完善',
    devicesOnline: 0,
    devicesTotal: 2,
    lastEvent: { level: 'L2', type: '烟感预警', time: '6 小时前' },
    houseId: 'H00005',
    health: {
      chronic: ['慢阻肺'],
      mobility: '需助行器',
      cognition: '正常',
      hearing: '听力下降',
      medication: '按需使用吸入剂',
    },
  }),
  makeElder({
    id: 'E00006',
    name: '赵德明',
    gender: '男',
    birthDate: '1952-07-04',
    riskTags: ['高龄', '低保'],
    livingStatus: '与配偶同住',
    disability: '轻度失能',
    riskLevel: '中风险',
    completeness: 96,
    devicesOnline: 2,
    devicesTotal: 2,
    houseId: 'H00006',
  }),
  makeElder({
    id: 'E00007',
    name: '孙玉梅',
    gender: '女',
    birthDate: '1948-12-01',
    riskTags: ['独居', '低保'],
    livingStatus: '独居',
    disability: '能力完好',
    riskLevel: '中风险',
    completeness: 88,
    devicesOnline: 3,
    devicesTotal: 3,
    lastEvent: { level: 'L1', type: '连续两天未出门', time: '1 天前' },
    houseId: 'H00007',
  }),
  makeElder({
    id: 'E00008',
    name: '周志强',
    gender: '男',
    birthDate: '1955-05-19',
    riskTags: ['高龄'],
    livingStatus: '与子女同住',
    disability: '能力完好',
    riskLevel: '低风险',
    completeness: 100,
    devicesOnline: 1,
    devicesTotal: 1,
    houseId: 'H00008',
  }),
  makeElder({
    id: 'E00009',
    name: '吴凤英',
    gender: '女',
    birthDate: '1932-01-25',
    riskTags: ['独居', '失能', '高龄', '长护险', '家庭养老床位'],
    livingStatus: '独居',
    disability: '重度失能',
    riskLevel: '高风险',
    completeness: 100,
    devicesOnline: 4,
    devicesTotal: 4,
    lastEvent: { level: 'L3', type: '雷达与视觉交叉确认跌倒', time: '5 天前' },
    houseId: 'H00009',
    hasOpenEvent: true,
    health: {
      chronic: ['高血压', '糖尿病', '冠心病'],
      mobility: '卧床',
      cognition: '轻度认知障碍',
      hearing: '正常',
      medication: '每日两次，由照护者协助',
    },
    relations: [
      {
        id: 'R-009-1',
        name: '吴晓东',
        relation: '儿子',
        phone: '13566667777',
        sameCity: false,
        guardian: true,
        caregiver: false,
        authorized: '已授权',
        isEmergency: true,
      },
      {
        id: 'R-009-2',
        name: '李秀兰',
        relation: '主要照护者',
        phone: '13677778888',
        sameCity: true,
        guardian: false,
        caregiver: true,
        authorized: '已授权',
        isEmergency: false,
      },
    ],
  }),
  makeElder({
    id: 'E00010',
    name: '郑海龙',
    gender: '男',
    birthDate: '1945-08-09',
    riskTags: ['空巢', '失能'],
    livingStatus: '空巢',
    disability: '中度失能',
    riskLevel: '高风险',
    completeness: 92,
    devicesOnline: 2,
    devicesTotal: 3,
    lastEvent: { level: 'L2', type: '电子围栏越界', time: '2 天前' },
    houseId: 'H00010',
  }),
]

function generateElders(): Elder[] {
  const list: Elder[] = [...handCrafted]
  const total = 1286
  for (let index = handCrafted.length + 1; index <= total; index += 1) {
    const remainder = index % 14
    const communityInfo =
      remainder <= 6
        ? communities[0]
        : remainder <= 9
          ? communities[1]
          : remainder <= 11
            ? communities[2]
            : communities[3]
    const surname = surnames[index % surnames.length]
    const given = givenNames[Math.floor(index / surnames.length) % givenNames.length]
    const birthYear = 1930 + (index % 36)
    const birthMonth = (index % 12) + 1
    const birthDay = (index % 27) + 1
    const birthDate = `${birthYear}-${pad(birthMonth, 2)}-${pad(birthDay, 2)}`
    const age = formatAge(birthDate)
    const id = `E${pad(index, 5)}`
    const disability =
      index % 17 === 0 ? '重度失能' : index % 7 === 0 ? '中度失能' : index % 4 === 0 ? '轻度失能' : '能力完好'
    const riskTags: string[] = []
    if (index % 4 === 0) riskTags.push('独居')
    if (index % 9 === 0) riskTags.push('空巢')
    if (age >= 80) riskTags.push('高龄')
    if (disability !== '能力完好') riskTags.push('失能')
    if (index % 13 === 0) riskTags.push('低保')
    if (index % 41 === 0) riskTags.push('特困')
    if (index % 19 === 0) riskTags.push('家庭养老床位')
    if (index % 6 === 0) riskTags.push('长护险')
    const highRisk =
      disability === '重度失能' ||
      (disability === '中度失能' && (riskTags.includes('独居') || riskTags.includes('空巢'))) ||
      index % 211 === 0
    const riskLevel: RiskLevel = highRisk ? '高风险' : riskTags.length > 0 ? '中风险' : '低风险'
    const completeness = [100, 100, 100, 96, 92, 88, 78, 64][index % 8]
    const status: ElderStatus = index % 173 === 0 ? '已归档' : completeness < 80 ? '待完善' : '正常'
    const event =
      highRisk && index % 6 === 0
        ? eventTypes[index % eventTypes.length]
        : index % 7 === 0
          ? eventTypes[index % eventTypes.length]
          : null
    const gridCount = communityInfo.grids
    list.push(
      makeElder({
        id,
        name: `${surname}${given}`,
        gender: index % 2 === 0 ? '女' : '男',
        birthDate,
        district: communityInfo.district,
        street: communityInfo.street,
        community: communityInfo.community,
        grid: `第${(index % gridCount) + 1}网格`,
        building: `幸福里 ${(index % 9) + 1}栋`,
        unit: `${(index % 3) + 1}单元`,
        room: `${(index % 6) + 1}0${(index % 4) + 1}`,
        livingStatus: riskTags.includes('独居')
          ? '独居'
          : riskTags.includes('空巢')
            ? '空巢'
            : index % 3 === 0
              ? '与配偶同住'
              : '与子女同住',
        disability: disability as Disability,
        riskLevel,
        riskTags,
        completeness,
        status,
        devicesOnline: index % 5 === 0 ? 1 : index % 3 === 0 ? 2 : 3,
        devicesTotal: index % 4 === 0 ? 4 : 3,
        lastEvent: event ? { level: event.level, type: event.type, time: `${(index % 9) + 1} 小时前` } : null,
        houseId: `H${pad(index, 5)}`,
        health: {
          chronic: index % 3 === 0 ? [chronicPool[index % chronicPool.length]] : [],
          mobility: disability === '重度失能' ? '卧床' : disability === '中度失能' ? '需助行器' : '自主行走',
          cognition: index % 11 === 0 ? '轻度认知障碍' : '正常',
          hearing: index % 6 === 0 ? '听力下降' : '正常',
          medication: index % 4 === 0 ? '每日一次基础用药' : '无',
        },
        hasOpenEvent: index % 97 === 0,
      }),
    )
  }
  return list
}

const allElders = generateElders()

export const elders = reactive<Elder[]>([...allElders])

export function syncElders(tenantId: string) {
  elders.splice(
    0,
    elders.length,
    ...allElders.filter((item) => item.tenantId === tenantId),
  )
}

export const getElderById = (id: string) => elders.find((item) => item.id === id)

const customHouses: Record<string, House> = {
  H00001: {
    id: 'H00001',
    community: '安康社区',
    building: '幸福里 3栋',
    unit: '2单元',
    room: '401',
    floor: 4,
    elevator: true,
    houseType: '两室一厅',
    area: 82,
    entry: {
      keyHolder: '儿子李伟处',
      smartLock: true,
      smartLockPassword: '8821#',
      propertyOpen: true,
      note: '物业可代开，需提前电话确认',
    },
    rooms: [
      {
        id: 'RM-01',
        name: '客厅',
        type: '客厅',
        area: 24,
        gridArea: '1 / 1 / 3 / 3',
        devices: [
          { id: 'DV-01', type: '摄像头', note: '电视柜上方，覆盖客厅与入户门', status: '在线' },
          { id: 'DV-02', type: '烟感', note: '客厅吊顶', status: '在线' },
        ],
      },
      {
        id: 'RM-02',
        name: '主卧',
        type: '卧室',
        area: 14,
        gridArea: '1 / 3 / 2 / 5',
        devices: [{ id: 'DV-03', type: '毫米波雷达', note: '床头墙面，距地 1.2 米', status: '在线' }],
      },
      {
        id: 'RM-03',
        name: '次卧',
        type: '卧室',
        area: 12,
        gridArea: '2 / 3 / 3 / 5',
        devices: [],
      },
      {
        id: 'RM-04',
        name: '厨房',
        type: '厨房',
        area: 8,
        gridArea: '3 / 1 / 4 / 2',
        devices: [{ id: 'DV-04', type: '燃气', note: '灶台侧墙', status: '离线' }],
      },
      {
        id: 'RM-05',
        name: '卫生间',
        type: '卫生间',
        area: 5,
        gridArea: '3 / 2 / 4 / 3',
        devices: [],
      },
      {
        id: 'RM-06',
        name: '阳台',
        type: '阳台',
        area: 6,
        gridArea: '3 / 3 / 4 / 5',
        devices: [],
      },
    ],
  },
  H00002: {
    id: 'H00002',
    community: '安康社区',
    building: '幸福里 5栋',
    unit: '1单元',
    room: '202',
    floor: 2,
    elevator: true,
    houseType: '两室一厅',
    area: 78,
    entry: {
      keyHolder: '女儿李晓梅处',
      smartLock: false,
      smartLockPassword: '',
      propertyOpen: true,
      note: '物业有备用钥匙，需登记后领取',
    },
    rooms: [
      {
        id: 'RM-11',
        name: '客厅',
        type: '客厅',
        area: 22,
        gridArea: '1 / 1 / 3 / 3',
        devices: [{ id: 'DV-11', type: '摄像头', note: '沙发对面墙面', status: '在线' }],
      },
      {
        id: 'RM-12',
        name: '主卧',
        type: '卧室',
        area: 14,
        gridArea: '1 / 3 / 2 / 5',
        devices: [{ id: 'DV-12', type: '毫米波雷达', note: '床头', status: '在线' }],
      },
      {
        id: 'RM-13',
        name: '次卧',
        type: '卧室',
        area: 11,
        gridArea: '2 / 3 / 3 / 5',
        devices: [],
      },
      {
        id: 'RM-14',
        name: '厨房',
        type: '厨房',
        area: 7,
        gridArea: '3 / 1 / 4 / 2',
        devices: [{ id: 'DV-13', type: '烟感', note: '厨房吊顶', status: '在线' }],
      },
      {
        id: 'RM-15',
        name: '卫生间',
        type: '卫生间',
        area: 5,
        gridArea: '3 / 2 / 4 / 3',
        devices: [],
      },
      {
        id: 'RM-16',
        name: '阳台',
        type: '阳台',
        area: 6,
        gridArea: '3 / 3 / 4 / 5',
        devices: [],
      },
    ],
  },
}

const houseStore = reactive<Record<string, House>>({ ...customHouses })

function buildDefaultHouse(elder: Elder): House {
  return {
    id: elder.houseId,
    community: elder.community,
    building: elder.building,
    unit: elder.unit,
    room: elder.room,
    floor: Number(elder.room.slice(0, 1)) || 1,
    elevator: true,
    houseType: '两室一厅',
    area: 78,
    entry: { ...elder.entry },
    rooms: [
      {
        id: `${elder.houseId}-RM-01`,
        name: '客厅',
        type: '客厅',
        area: 22,
        gridArea: '1 / 1 / 3 / 3',
        devices:
          elder.devicesTotal > 0
            ? [{ id: `${elder.houseId}-DV-01`, type: '摄像头', note: '客厅电视柜旁', status: '在线' }]
            : [],
      },
      {
        id: `${elder.houseId}-RM-02`,
        name: '主卧',
        type: '卧室',
        area: 14,
        gridArea: '1 / 3 / 2 / 5',
        devices:
          elder.devicesTotal > 1
            ? [
                {
                  id: `${elder.houseId}-DV-02`,
                  type: '毫米波雷达',
                  note: '床头墙面',
                  status: elder.devicesOnline > 1 ? '在线' : '离线',
                },
              ]
            : [],
      },
      {
        id: `${elder.houseId}-RM-03`,
        name: '次卧',
        type: '卧室',
        area: 11,
        gridArea: '2 / 3 / 3 / 5',
        devices: [],
      },
      {
        id: `${elder.houseId}-RM-04`,
        name: '厨房',
        type: '厨房',
        area: 7,
        gridArea: '3 / 1 / 4 / 2',
        devices:
          elder.devicesTotal > 2
            ? [
                {
                  id: `${elder.houseId}-DV-03`,
                  type: '烟感',
                  note: '厨房吊顶',
                  status: elder.devicesOnline > 2 ? '在线' : '离线',
                },
              ]
            : [],
      },
      {
        id: `${elder.houseId}-RM-05`,
        name: '卫生间',
        type: '卫生间',
        area: 5,
        gridArea: '3 / 2 / 4 / 3',
        devices: [],
      },
      {
        id: `${elder.houseId}-RM-06`,
        name: '阳台',
        type: '阳台',
        area: 6,
        gridArea: '3 / 3 / 4 / 5',
        devices: [],
      },
    ],
  }
}

export function getHouseByElder(elder: Elder): House {
  if (!houseStore[elder.houseId]) {
    houseStore[elder.houseId] = buildDefaultHouse(elder)
  }
  return houseStore[elder.houseId]
}

export const regionOptions = [
  {
    value: '安宁区',
    label: '安宁区',
    children: [
      {
        value: '安康街道',
        label: '安康街道',
        children: [
          {
            value: '安康社区',
            label: '安康社区',
            children: [1, 2, 3, 4, 5, 6].map((item) => ({
              value: `第${item}网格`,
              label: `第${item}网格`,
            })),
          },
          {
            value: '康乐社区',
            label: '康乐社区',
            children: [1, 2, 3, 4].map((item) => ({
              value: `第${item}网格`,
              label: `第${item}网格`,
            })),
          },
        ],
      },
    ],
  },
]

export const riskTagOptions = ['独居', '空巢', '失能', '高龄', '低保', '特困', '家庭养老床位', '长护险']
export const disabilityOptions: Disability[] = ['能力完好', '轻度失能', '中度失能', '重度失能', '未评估']
export const statusOptions: ElderStatus[] = ['正常', '待完善', '已归档']
export const roomTypeOptions: RoomType[] = ['卧室', '卫生间', '厨房', '客厅', '阳台', '其他']
export const deviceTypeOptions = ['摄像头', '烟感', '燃气', '一氧化碳', '毫米波雷达', '定位器']
