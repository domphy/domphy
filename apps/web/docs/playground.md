---
sidebar: false
aside: false
layout: page
---
<script setup>
import CodeEditor from './editor/index.vue'
const code = `
import { type DomphyElement,type PartialElement  } from '@domphy/core'
import { themeSpacing, themeColor, themeSize} from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: ["Playground"],
    style:{
    
    }
}
export default App
`
</script>

<CodeEditor :code="code" storageKey="domphy-playground" />

