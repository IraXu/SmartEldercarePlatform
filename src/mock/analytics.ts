import { reactive } from 'vue'
import { elders, type Elder } from './elders'
import { devices } from './devices'
import { safetyEvents, type SafetyEvent } from './events'

export interface BuildingStat {
  name: string
  elders: number
  highRisk: number
  offlineDevices: number
}

export interface GridStat {
  id: string
  name: string
  community: string
  street: string
  district: string
  elders: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
  devices: number
  onlineDevices: number
  offlineDevices: number
  onlineRate: number
  events: number
  pendingEvents: number
  l3Pending: number
  households: number
  riskScore: number
  riskLevel: '高风险网格' | '中风险网格' | '低风险网格'
  buildings: BuildingStat[]
}

export interface CommunityStat {
  name: string
  district: string
  street: string
  elders: number
  highRisk: number
  devices: number
  onlineDevices: number
  onlineRate: number
  events: number
  eventsToday: number
  pendingEvents: number
  l3Pending: number
  closureRate: number
  households: number
  grids: GridStat[]
}

export interface DistrictMetrics {
  district: string
  street: string
  elders: number
  highRisk: number
  devices: number
  onlineDevices: number
  onlineRate: number
  eventsToday: number
  pendingEvents: number
  l3Pending: number
  closureRate: number
  households: number
  grids: number
  communities: number
}

export interface TrendPoint {
  hour: string
  l1: number
  l2: number
  l3: number
}

export interface RiskSlice {
  label: string
  value: number
  percent: number
  color: string
}

export interface TagStat {
  label: string
  count: number
  percent: number
}

export interface DeviceOnlineStat {
  type: string
  total: number
  online: number
  rate: number
}

const pendingStatuses = ['待确认', '处置中', '已到场']

let activeElders: Elder[] = []
let enabledDevices: typeof devices = []
let district = '安宁区'
let street = '安康街道'

export const communityStats = reactive<CommunityStat[]>([])
export const allGrids = reactive<GridStat[]>([])
export const districtMetrics = reactive<DistrictMetrics>({
  district: '',
  street: '',
  elders: 0,
  highRisk: 0,
  devices: 0,
  onlineDevices: 0,
  onlineRate: 0,
  eventsToday: 0,
  pendingEvents: 0,
  l3Pending: 0,
  closureRate: 0,
  households: 0,
  grids: 0,
  communities: 0,
})
export const riskSlices = reactive<RiskSlice[]>([])
export const tagStats = reactive<TagStat[]>([])
export const deviceOnlineStats = reactive<DeviceOnlineStat[]>([])
export const communityRanking = reactive<CommunityStat[]>([])
export const gridRanking = reactive<GridStat[]>([])
export const recentEvents = reactive<SafetyEvent[]>([])
export const scopeSummary = reactive({
  district: '',
  street: '',
  communityCount: 0,
  gridCount: 0,
})

function unique<T>(list: T[]) {
  return [...new Set(list)]
}

function percent(value: number, total: number) {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0
}

function buildBuildings(list: Elder[], gridDevices: typeof devices): BuildingStat[] {
  const map = new Map<string, BuildingStat>()
  list.forEach((elder) => {
    const current = map.get(elder.building)
    if (current) {
      current.elders += 1
      if (elder.riskLevel === '高风险') current.highRisk += 1
    } else {
      map.set(elder.building, {
        name: elder.building,
        elders: 1,
        highRisk: elder.riskLevel === '高风险' ? 1 : 0,
        offlineDevices: 0,
      })
    }
  })
  gridDevices.forEach((device) => {
    if (device.status !== '在线') {
      const elder = list.find((item) => item.id === device.elderId)
      const building = elder ? map.get(elder.building) : undefined
      if (building) building.offlineDevices += 1
    }
  })
  return [...map.values()].sort((a, b) => b.highRisk - a.highRisk || b.elders - a.elders).slice(0, 6)
}

function buildGrid(community: string, gridName: string): GridStat | null {
  const list = activeElders.filter((item) => item.community === community && item.grid === gridName)
  if (list.length === 0) return null
  const elderIds = new Set(list.map((item) => item.id))
  const gridDevices = enabledDevices.filter((item) => elderIds.has(item.elderId))
  const onlineDevices = gridDevices.filter((item) => item.status === '在线').length
  const offlineDevices = gridDevices.length - onlineDevices
  const gridEvents = safetyEvents.filter((item) => elderIds.has(item.elderId))
  const pendingEvents = gridEvents.filter((item) => pendingStatuses.includes(item.status))
  const l3Pending = pendingEvents.filter((item) => item.level === 'L3').length
  const highRisk = list.filter((item) => item.riskLevel === '高风险').length
  const mediumRisk = list.filter((item) => item.riskLevel === '中风险').length
  const lowRisk = list.length - highRisk - mediumRisk
  const onlineRate = percent(onlineDevices, gridDevices.length)
  const riskScore = Math.min(
    100,
    Math.round((highRisk / list.length) * 60 + l3Pending * 20 + (1 - onlineRate / 100) * 20),
  )
  return {
    id: `${community}-${gridName}`,
    name: gridName,
    community,
    street,
    district,
    elders: list.length,
    highRisk,
    mediumRisk,
    lowRisk,
    devices: gridDevices.length,
    onlineDevices,
    offlineDevices,
    onlineRate,
    events: gridEvents.length,
    pendingEvents: pendingEvents.length,
    l3Pending,
    households: unique(gridDevices.map((item) => item.houseId)).length,
    riskScore,
    riskLevel: riskScore >= 70 ? '高风险网格' : riskScore >= 40 ? '中风险网格' : '低风险网格',
    buildings: buildBuildings(list, gridDevices),
  }
}

const communityNames = () => unique(activeElders.map((item) => item.community))
const gridNames = () => unique(activeElders.map((item) => item.grid))

function buildCommunityStats(): CommunityStat[] {
  const names = communityNames()
  const grids = gridNames()
  return names.map((community) => {
    const list = activeElders.filter((item) => item.community === community)
    const elderIds = new Set(list.map((item) => item.id))
    const listDevices = enabledDevices.filter((item) => elderIds.has(item.elderId))
    const onlineDevices = listDevices.filter((item) => item.status === '在线').length
    const listEvents = safetyEvents.filter((item) => elderIds.has(item.elderId))
    const pending = listEvents.filter((item) => pendingStatuses.includes(item.status))
    const resolved = listEvents.filter((item) => ['已关闭', '已归档'].includes(item.status))
    const eventsToday = listEvents.filter((item) => !item.occurredAt.includes('-')).length
    const gridList = grids
      .map((grid) => buildGrid(community, grid))
      .filter((item): item is GridStat => Boolean(item))
      .sort((a, b) => b.riskScore - a.riskScore)
    return {
      name: community,
      district,
      street,
      elders: list.length,
      highRisk: list.filter((item) => item.riskLevel === '高风险').length,
      devices: listDevices.length,
      onlineDevices,
      onlineRate: percent(onlineDevices, listDevices.length),
      events: listEvents.length,
      eventsToday,
      pendingEvents: pending.length,
      l3Pending: pending.filter((item) => item.level === 'L3').length,
      closureRate: percent(resolved.length, resolved.length + pending.length),
      households: unique(listDevices.map((item) => item.houseId)).length,
      grids: gridList,
    }
  })
}

function buildRiskSlices(): RiskSlice[] {
  const total = activeElders.length
  return [
    {
      label: '高风险',
      value: activeElders.filter((item) => item.riskLevel === '高风险').length,
      percent: percent(activeElders.filter((item) => item.riskLevel === '高风险').length, total),
      color: '#D64545',
    },
    {
      label: '中风险',
      value: activeElders.filter((item) => item.riskLevel === '中风险').length,
      percent: percent(activeElders.filter((item) => item.riskLevel === '中风险').length, total),
      color: '#D97706',
    },
    {
      label: '低风险',
      value: activeElders.filter((item) => item.riskLevel === '低风险').length,
      percent: percent(activeElders.filter((item) => item.riskLevel === '低风险').length, total),
      color: '#2E9E5B',
    },
  ]
}

function buildTagStats(): TagStat[] {
  const tagMap = new Map<string, number>()
  activeElders.forEach((elder) => {
    elder.riskTags.forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    })
  })
  return [...tagMap.entries()]
    .map(([label, count]) => ({ label, count, percent: percent(count, activeElders.length) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function buildDeviceOnlineStats(): DeviceOnlineStat[] {
  return unique(enabledDevices.map((item) => item.type))
    .map((type) => {
      const list = enabledDevices.filter((item) => item.type === type)
      const online = list.filter((item) => item.status === '在线').length
      return { type, total: list.length, online, rate: percent(online, list.length) }
    })
    .sort((a, b) => b.total - a.total)
}

export const eventTrend: TrendPoint[] = (() => {
  const l3 = [0, 0, 0, 0, 0, 1, 2, 3, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 2, 1, 1, 0, 0, 0]
  const l2 = [1, 0, 1, 0, 1, 2, 4, 6, 5, 4, 3, 3, 2, 2, 3, 4, 5, 6, 4, 3, 2, 1, 1, 0]
  const l1 = [2, 1, 1, 1, 2, 3, 5, 7, 6, 5, 4, 4, 3, 3, 4, 5, 6, 7, 5, 4, 3, 2, 2, 1]
  return Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    l1: l1[hour],
    l2: l2[hour],
    l3: l3[hour],
  }))
})()

export function refreshAnalytics() {
  activeElders = elders.filter((item) => item.status !== '已归档')
  enabledDevices = devices.filter((item) => item.enabled)
  district = unique(activeElders.map((item) => item.district))[0] ?? '安宁区'
  street = unique(activeElders.map((item) => item.street))[0] ?? '安康街道'

  const communities = buildCommunityStats()
  communityStats.splice(0, communityStats.length, ...communities)

  const grids = communityStats.flatMap((item) => item.grids)
  allGrids.splice(0, allGrids.length, ...grids)

  Object.assign(districtMetrics, {
    district,
    street,
    elders: activeElders.length,
    highRisk: activeElders.filter((item) => item.riskLevel === '高风险').length,
    devices: enabledDevices.length,
    onlineDevices: enabledDevices.filter((item) => item.status === '在线').length,
    onlineRate: percent(
      enabledDevices.filter((item) => item.status === '在线').length,
      enabledDevices.length,
    ),
    eventsToday: safetyEvents.filter((item) => !item.occurredAt.includes('-')).length,
    pendingEvents: safetyEvents.filter((item) => pendingStatuses.includes(item.status)).length,
    l3Pending: safetyEvents.filter(
      (item) => pendingStatuses.includes(item.status) && item.level === 'L3',
    ).length,
    closureRate: (() => {
      const resolved = safetyEvents.filter((item) => ['已关闭', '已归档'].includes(item.status)).length
      const pending = safetyEvents.filter((item) => pendingStatuses.includes(item.status)).length
      return percent(resolved, resolved + pending)
    })(),
    households: unique(enabledDevices.map((item) => item.houseId)).length,
    grids: allGrids.length,
    communities: communityStats.length,
  })

  riskSlices.splice(0, riskSlices.length, ...buildRiskSlices())
  tagStats.splice(0, tagStats.length, ...buildTagStats())
  deviceOnlineStats.splice(0, deviceOnlineStats.length, ...buildDeviceOnlineStats())

  communityRanking.splice(
    0,
    communityRanking.length,
    ...[...communityStats].sort((a, b) => b.l3Pending - a.l3Pending || b.highRisk - a.highRisk),
  )
  gridRanking.splice(
    0,
    gridRanking.length,
    ...[...allGrids].sort((a, b) => b.l3Pending - a.l3Pending || b.riskScore - a.riskScore),
  )
  recentEvents.splice(
    0,
    recentEvents.length,
    ...safetyEvents
      .filter((item) => pendingStatuses.includes(item.status))
      .sort((a, b) => {
        const levelOrder: Record<string, number> = { L3: 0, L2: 1, L1: 2 }
        const diff = levelOrder[a.level] - levelOrder[b.level]
        return diff !== 0 ? diff : a.occurredAt.localeCompare(b.occurredAt)
      })
      .slice(0, 6),
  )

  Object.assign(scopeSummary, {
    district,
    street,
    communityCount: communityStats.length,
    gridCount: allGrids.length,
  })
}

refreshAnalytics()

export const getGrid = (id: string) => allGrids.find((item) => item.id === id)

export const getCommunity = (name: string) => communityStats.find((item) => item.name === name)

export const formatNumber = (value: number) => value.toLocaleString('zh-CN')
