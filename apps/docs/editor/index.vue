<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElementNode } from '@domphy/core'
import { themeApply } from '@domphy/theme'
import { Container } from './Container'

const props = defineProps<{ code: string; storageKey?: string }>()
const mountEl = ref<HTMLElement>()

onMounted(() => {
  themeApply()
  new ElementNode(Container(props.code, props.storageKey)).render(mountEl.value!)
})
</script>

<template>
  <div ref="mountEl" />
</template>