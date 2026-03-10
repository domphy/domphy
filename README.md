# Domphy

Domphy is a composable UI framework for building web applications with fine-grained reactivity, a context-aware design system, and built-in server-side rendering (SSR) support. It uses plain JavaScript objects, no JSX, no virtual DOM, and no compiler.

This is the official monorepo for the Domphy ecosystem.

## Documentation

**The full documentation can be found at [domphy.com](https://domphy.com).**

The website is built with VitePress and is located in the `apps/web` directory, with documentation served from `apps/web/docs`.

## Core Packages

The core functionality is split across three main packages:

*   **`@domphy/core`**: The rendering engine. It provides fine-grained reactivity, CSS-in-JS, and SSR capabilities using plain JavaScript objects.
*   **`@domphy/theme`**: A context-aware design system for managing color, size, and spacing with guaranteed WCAG contrast.
*   **`@domphy/ui`**: A collection of ~60 ready-to-use patches for common UI elements like buttons, inputs, dialogs, and more.

## Getting Started

To get started, please visit the documentation at [domphy.com](https://domphy.com). Each package can be installed individually via npm:

```bash
npm install @domphy/core @domphy/theme @domphy/ui
```
