<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElementNode } from '@domphy/core'
import { themeApply } from '@domphy/theme'
import { type DomphyElement } from '@domphy/core'
import { Container } from './Container'

const props = defineProps<{ element: DomphyElement }>()
const mountEl = ref<HTMLElement>()

onMounted(() => {
  themeApply()
  new ElementNode(Container(props.element)).render(mountEl.value!)
})
</script>

<template>
  <div ref="mountEl" />
</template>
