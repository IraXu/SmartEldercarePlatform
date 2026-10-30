import { watch } from 'vue'
import { elders, syncElders } from '@/mock/elders'
import { syncDevices } from '@/mock/devices'
import { syncEvents } from '@/mock/events'
import { refreshAnalytics } from '@/mock/analytics'
import { syncAuditToElderNames } from './useEvidence'
import { tasks } from './useTasks'
import { workOrders } from './useWorkOrders'
import { accessRequests, consents } from './useCompliance'
import { currentProjectId } from './useOrg'

const allTasks = [...tasks]
const allWorkOrders = [...workOrders]
const allConsents = [...consents]
const allAccessRequests = [...accessRequests]

let started = false

/**
 * 将业务演示数据收敛到当前项目：老人、设备、事件按老人归属过滤，
 * 任务/工单/授权按老人是否属于当前项目过滤，并重算区域统计。
 */
export function scopeDataToProject(projectId: string) {
  syncElders(projectId)
  const elderIds = new Set(elders.map((item) => item.id))
  syncDevices(elderIds)
  syncEvents(elderIds)
  refreshAnalytics()

  const elderNames = new Set(elders.map((item) => item.name))
  syncAuditToElderNames(elderNames)

  tasks.splice(
    0,
    tasks.length,
    ...allTasks.filter((item) => elderIds.has(item.elderId)),
  )
  workOrders.splice(
    0,
    workOrders.length,
    ...allWorkOrders.filter((item) => elderIds.has(item.elderId)),
  )
  consents.splice(
    0,
    consents.length,
    ...allConsents.filter((item) => !item.elderId || elderIds.has(item.elderId)),
  )
  accessRequests.splice(
    0,
    accessRequests.length,
    ...allAccessRequests.filter((item) => !item.elderId || elderIds.has(item.elderId)),
  )
}

export function useProjectScope() {
  if (started) return
  started = true
  scopeDataToProject(currentProjectId.value)
  watch(currentProjectId, (projectId) => scopeDataToProject(projectId))
}
