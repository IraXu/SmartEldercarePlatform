import { onUnmounted, ref } from 'vue'

export function useVerifyCode() {
  const seconds = ref(0)
  let timer: number | undefined

  function stop() {
    if (timer) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  function start() {
    if (seconds.value > 0) return
    seconds.value = 60
    stop()
    timer = window.setInterval(() => {
      seconds.value -= 1
      if (seconds.value <= 0) {
        seconds.value = 0
        stop()
      }
    }, 1000)
  }

  onUnmounted(stop)

  return { seconds, start }
}
