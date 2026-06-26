---
title: Playground
sidebar: false
aside: false
layout: page
---
<script setup>
import CodeEditor from './editor/index.vue'
const code = `
import { type DomphyElement } from '@domphy/core'
import { themeSpacing, themeColor, themeSize } from "@domphy/theme"

const App: DomphyElement<"div"> = {
  div: ["Playground"],
  style: {
    padding: (l) => themeSpacing(4),
    fontFamily: "sans-serif",
  }
}
export default App
`
</script>

<CodeEditor :code="code" storageKey="domphy-playground" />
