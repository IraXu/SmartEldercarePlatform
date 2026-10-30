import { computed, ref } from 'vue'

export type Role = 'community' | 'civil'
export type DemoState = 'normal' | 'loading' | 'empty' | 'error' | 'forbidden'

export const currentRole = ref<Role>('community')
export const demoState = ref<DemoState>('normal')

export const isCivil = computed(() => currentRole.value === 'civil')

export const roleLabel = computed(() => (currentRole.value === 'community' ? '项目成员' : '民政查看'))

export function switchRole(role: Role) {
  currentRole.value = role
}
