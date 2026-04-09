# Gantt Builder

A browser-based Gantt chart tool built for academic grant applications and project planning. No account, no server — everything runs locally.

**Live app:** https://gantt-app-wheat.vercel.app

---

## Features

- **Flexible input** — upload Excel (`.xlsx`/`.xls`) or CSV, paste directly from Google Sheets, or start from a built-in grant example
- **Drag to edit** — drag bars to shift dates; drag edges to resize duration
- **Inline editing** — edit task name, start/end, category, and % done from the side panel
- **Work Package colours** — automatic colour coding by category; click any WP label in the legend to pick a custom colour
- **Dependencies** — click a task bar, then toggle which tasks it depends on; dependency arrows render automatically
- **View modes** — Week, Month, Quarter, Year
- **Zoom** — scale the chart 50%–200% for small screens
- **Export** — PNG (2× resolution) and SVG
- **Save / Load** — save your project as JSON and reload it later
- **Mobile friendly** — task list collapses to name-only rows; tap ▼ to expand dates per task
- **Dark mode** — follows system preference via `prefers-color-scheme`

---

## Getting started

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel --prod
```

The `vercel.json` rewrites all routes to `index.html` for client-side routing.

---

## Input format

### Excel / CSV

The parser looks for columns named (case-insensitive, flexible aliases):

| Field | Accepted names |
|---|---|
| Task name | Task, Task Name, Name, Activity, Item |
| Start date | Start, Start Date, Begin, From |
| End date | End, End Date, Finish, Due, Until |
| Category / WP | Category, WP, Phase, Group, Section |
| Progress | Progress, %, % Complete, Done |
| Dependencies | Dependencies, Deps, Depends On, After |

### Paste

Copy from Excel or Google Sheets (tab-separated) and paste into the Paste tab. CSV also works.

### JSON project

Use **Save** to export your current project, and **Load** (or drop the file on the upload screen) to resume.

---

## Stack

- [React](https://react.dev) + [Vite](https://vite.dev)
- [frappe-gantt](https://frappe.io/gantt) — Gantt chart rendering
- [SheetJS (xlsx)](https://sheetjs.com) — Excel parsing
- [html-to-image](https://github.com/bubkoo/html-to-image) — PNG export
- [Tailwind CSS v4](https://tailwindcss.com) + [@genomicx/ui](https://github.com/genomicx/genomicx-ui) design tokens

---

## Licence

MIT
