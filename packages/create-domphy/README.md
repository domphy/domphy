# create-domphy

Scaffold a runnable [Domphy](https://domphy.com) starter project.

```bash
npm create domphy@latest my-app
# or
npm init domphy@latest my-app
```

This creates a Vite + TypeScript project wired to `@domphy/ui`, with a working
reactive counter, theming via `themeApply()`, and an `AGENTS.md` so AI tools in
the project produce idiomatic Domphy code.

## Usage

```bash
create-domphy <dir> [--template spa]
```

If no directory is given, you are prompted for one (`.` for the current
directory). The only template currently shipped is `spa` (single-page app).

After scaffolding:

```bash
cd my-app
npm install
npm run dev
```
