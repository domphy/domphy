<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElementNode } from '@domphy/core'
import { themeApply } from '@domphy/theme'
import { Container } from './Container'

const props = defineProps<{ code: string; storageKey?: string }>()
const mountEl = ref<HTMLElement>()

onMounted(() => {
  themeApply()

  const shadowHost = document.createElement('div')
  shadowHost.style.cssText = 'flex: 1; display: flex; flex-direction: column; overflow: auto;'
  const shadow = shadowHost.attachShadow({ mode: 'open' })
  const themeTag = document.createElement('style')
  themeTag.id = 'domphy-themes'
  const previewContainer = document.createElement('div')
  previewContainer.style.flex = '1'
  shadow.append(themeTag, previewContainer)
  themeApply(themeTag)

  new ElementNode(Container(props.code, shadowHost, previewContainer, props.storageKey)).render(mountEl.value!)
})
</script>

<template>
  <div ref="mountEl" />
</template>