import { createApp } from 'vue'
import Antd from 'antdv-next'
import App from './App.vue'
import router from './router'
import 'antdv-next/dist/antd.css'
import './styles/global.css'

const app = createApp(App)

/**
 * 组件内部异常（含第三方组件库异常）不能中断 Vue 的渲染队列，
 * 否则会出现「弹窗打开后所有控件点了没反应」的整页卡死。
 */
app.config.errorHandler = (err, _instance, info) => {
  console.warn('[原型] 已拦截组件异常，页面保持可交互：', info, err)
}

app.use(Antd).use(router).mount('#app')
