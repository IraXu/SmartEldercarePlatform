import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import RegisterResultView from '@/views/RegisterResultView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ChangePasswordView from '@/views/ChangePasswordView.vue'
import ElderList from '@/views/ElderList.vue'
import ElderDetail from '@/views/ElderDetail.vue'
import HouseModel from '@/views/HouseModel.vue'
import DeviceList from '@/views/DeviceList.vue'
import DeviceDetail from '@/views/DeviceDetail.vue'
import EventList from '@/views/EventList.vue'
import EventDetail from '@/views/EventDetail.vue'
import MisreportView from '@/views/MisreportView.vue'
import RegionalMap from '@/views/RegionalMap.vue'
import Dashboard from '@/views/Dashboard.vue'
import SettingsView from '@/views/SettingsView.vue'
import ComplianceView from '@/views/ComplianceView.vue'
import TaskBoard from '@/views/TaskBoard.vue'
import TaskDetail from '@/views/TaskDetail.vue'
import SlaLedger from '@/views/SlaLedger.vue'
import TaskMobile from '@/views/TaskMobile.vue'
import WorkOrderList from '@/views/WorkOrderList.vue'
import WorkOrderDetail from '@/views/WorkOrderDetail.vue'
import ServicePlans from '@/views/ServicePlans.vue'
import WorkOrderMobileToday from '@/views/WorkOrderMobileToday.vue'
import WorkOrderMobileDetail from '@/views/WorkOrderMobileDetail.vue'
import AuditWorkOrderList from '@/views/AuditWorkOrderList.vue'
import AuditWorkOrderDetail from '@/views/AuditWorkOrderDetail.vue'
import AuditReviewList from '@/views/AuditReviewList.vue'
import SettlementPool from '@/views/SettlementPool.vue'
import AuditOrgView from '@/views/AuditOrgView.vue'
import AuditLeadView from '@/views/AuditLeadView.vue'
import ProjectListView from '@/views/ProjectListView.vue'
import { currentUser } from '@/composables/useAuth'

const publicPaths = ['/login', '/register', '/register/result', '/forgot-password']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/register/result', name: 'register-result', component: RegisterResultView },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },
    { path: '/change-password', name: 'change-password', component: ChangePasswordView },
    { path: '/', redirect: '/elders' },
    { path: '/elders', name: 'elder-list', component: ElderList },
    { path: '/elders/:id', name: 'elder-detail', component: ElderDetail },
    { path: '/elders/:id/house', name: 'house-model', component: HouseModel },
    { path: '/devices', name: 'device-list', component: DeviceList },
    { path: '/devices/:id', name: 'device-detail', component: DeviceDetail },
    { path: '/events', name: 'event-list', component: EventList },
    { path: '/events/misreports', name: 'event-misreports', component: MisreportView },
    { path: '/events/:id', name: 'event-detail', component: EventDetail },
    { path: '/map', name: 'regional-map', component: RegionalMap },
    { path: '/dashboard', name: 'dashboard', component: Dashboard },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/compliance', name: 'compliance', component: ComplianceView },
    { path: '/tasks', name: 'task-board', component: TaskBoard },
    { path: '/tasks/sla', name: 'task-sla', component: SlaLedger },
    { path: '/tasks/:id', name: 'task-detail', component: TaskDetail },
    { path: '/m/task/:id', name: 'task-mobile', component: TaskMobile },
    { path: '/workorders', name: 'work-order-list', component: WorkOrderList },
    { path: '/workorders/plans', name: 'service-plans', component: ServicePlans },
    { path: '/workorders/:id', name: 'work-order-detail', component: WorkOrderDetail },
    { path: '/m/workorders', name: 'work-order-mobile-today', component: WorkOrderMobileToday },
    { path: '/m/workorder/:id', name: 'work-order-mobile-detail', component: WorkOrderMobileDetail },
    { path: '/audit/workorders', name: 'audit-work-order-list', component: AuditWorkOrderList },
    { path: '/audit/workorders/:id', name: 'audit-work-order-detail', component: AuditWorkOrderDetail },
    { path: '/audit/reviews', name: 'audit-review-list', component: AuditReviewList },
    { path: '/audit/settlement', name: 'audit-settlement', component: SettlementPool },
    { path: '/audit/orgs', name: 'audit-orgs', component: AuditOrgView },
    { path: '/audit/leads', name: 'audit-leads', component: AuditLeadView },
    { path: '/projects', name: 'projects', component: ProjectListView },
    { path: '/:pathMatch(.*)*', redirect: '/elders' },
  ],
})

router.beforeEach((to) => {
  if (publicPaths.includes(to.path)) {
    if (currentUser.value) {
      if (currentUser.value.mustChangePassword) {
        return { path: '/change-password', query: { force: '1' } }
      }
      if (to.path === '/login') {
        return { path: '/elders' }
      }
    }
    return true
  }
  if (!currentUser.value) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {},
    }
  }
  if (currentUser.value.mustChangePassword && to.path !== '/change-password') {
    return { path: '/change-password', query: { force: '1' } }
  }
  return true
})

export default router
