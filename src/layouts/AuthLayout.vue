<script setup lang="ts">
import AuthBrandPanel from '@/components/AuthBrandPanel.vue'

withDefaults(
  defineProps<{
    cardWidth?: number
  }>(),
  {
    cardWidth: 440,
  },
)
</script>

<template>
  <div class="auth-page">
    <!-- 背景：白底 + 顶部浅蓝云絮（SVG 噪声纹理，缓慢漂移）+ 细网格 -->
    <div class="auth-bg" aria-hidden="true">
      <div class="cloud-field">
        <svg class="cloud-svg" xmlns="http://www.w3.org/2000/svg">
          <filter id="auth-cloud-noise" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.0016 0.0038"
              numOctaves="3"
              seed="9"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.541
                      0 0 0 0 0.647
                      0 0 0 0 0.82
                      -7.6 0 0 0 4.1"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#auth-cloud-noise)" />
        </svg>
      </div>
      <div class="auth-grid"></div>
    </div>

    <AuthBrandPanel class="auth-brand" />

    <section class="auth-form">
      <div class="auth-card" :style="{ width: `${cardWidth}px` }">
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: #f8fafc;
}

.auth-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* 近白冷调底 + 顶部天光，蓝色交给云层承担 */
  background-image: radial-gradient(90% 52% at 50% -6%, rgba(197, 218, 242, 0.48), transparent 72%),
    linear-gradient(180deg, #f1f6fc 0%, #f9fbfd 26%, #f8fafc 46%);
}

/* 云絮层：SVG 噪声纹理，整层缓慢平移形成流动感 */
.cloud-field {
  position: absolute;
  inset: -16% -12% 0;
  mask-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.98) 0%,
    rgba(0, 0, 0, 0.92) 30%,
    rgba(0, 0, 0, 0.6) 60%,
    rgba(0, 0, 0, 0.24) 80%,
    transparent 96%
  );
  -webkit-mask-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.98) 0%,
    rgba(0, 0, 0, 0.92) 30%,
    rgba(0, 0, 0, 0.6) 60%,
    rgba(0, 0, 0, 0.24) 80%,
    transparent 96%
  );
  animation: cloud-drift 48s ease-in-out infinite alternate;
  will-change: transform;
}

.cloud-svg {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0.8;
}

.auth-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, rgba(60, 100, 160, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(60, 100, 160, 0.045) 1px, transparent 1px),
    radial-gradient(circle, rgba(60, 100, 160, 0.05) 1.8px, transparent 2px);
  background-size: 90px 90px, 90px 90px, 90px 90px;
  background-position: 0 0, 0 0, 45px 45px;
  mask-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.5) 50%,
    transparent 88%
  );
  -webkit-mask-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.5) 50%,
    transparent 88%
  );
}

@keyframes cloud-drift {
  from {
    transform: translate3d(-3vw, 0, 0) scale(1.04);
  }
  to {
    transform: translate3d(4vw, 2.5vh, 0) scale(1.1);
  }
}

.auth-brand {
  position: relative;
  z-index: 1;
  width: 54%;
  flex-shrink: 0;
  background: transparent;
}

.auth-form {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 40px;
  min-width: 0;
  background: transparent;
}

.auth-card {
  max-width: 100%;
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 32px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px) saturate(1.08);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(21, 56, 96, 0.12), 0 1px 2px rgba(21, 56, 96, 0.06);
}

@media (prefers-reduced-motion: reduce) {
  .cloud-field {
    animation: none;
  }
}

@media (max-width: 1280px) {
  .auth-brand {
    width: 48%;
  }
}

@media (max-width: 1024px) {
  .auth-brand {
    display: none;
  }

  .auth-form {
    padding: 24px;
  }
}
</style>
