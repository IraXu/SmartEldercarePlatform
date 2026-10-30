<script setup lang="ts">
import zhCN from 'antdv-next/locale/zh_CN'
import { useProjectScope } from '@/composables/useProjectScope'

useProjectScope()

const theme = {
  token: {
    colorPrimary: '#1F6FEB',
    colorInfo: '#1F6FEB',
    colorSuccess: '#2E9E5B',
    colorWarning: '#D97706',
    colorError: '#D64545',
    colorText: '#1F2937',
    colorTextSecondary: '#5B6779',
    colorTextTertiary: '#8A96A8',
    colorBorder: '#E3E8EF',
    colorBorderSecondary: '#EEF2F7',
    colorBgLayout: '#F3F6FA',
    borderRadius: 8,
    fontSize: 14,
    controlHeight: 36,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Table: {
      headerBg: '#F7F9FC',
      headerColor: '#5B6779',
      headerSplitColor: 'transparent',
      rowHoverBg: '#F7FAFF',
      borderColor: '#EEF2F7',
    },
    Menu: {
      darkItemBg: '#0E2A47',
      darkSubMenuItemBg: '#0E2A47',
      darkItemSelectedBg: '#1B4470',
      darkItemColor: 'rgba(255,255,255,0.72)',
      darkItemSelectedColor: '#FFFFFF',
      darkItemHoverBg: '#16395D',
    },
    Tabs: {
      itemSelectedColor: '#1F6FEB',
      inkBarColor: '#1F6FEB',
    },
  },
}
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="theme">
    <a-app>
      <router-view />
    </a-app>
  </a-config-provider>
</template>
