Must see the source of patch at the bottom of each patch page to understand the structure then code it still code as html native element.

There are four levels of customization, in increasing order of effort:

1. **Patch props.** Each patch exposes a small, stable set of props—typically fewer than five. Lowest friction.
2. **Context attributes.** Use `dataTone`, `dataSize`, and `dataDensity` on a container to shift tone, size, or density for an entire subtree without touching individual elements.
3. **Inline override.** Native-wins merge strategy: any property set directly on the element overrides the patch value.
4. **Create a variant.** Clone a similar patch and edit it. Use this only when you need a reusable custom version.
