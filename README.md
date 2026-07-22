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

Node.js 20.19.x, or 22.12 and newer, is required.

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

Run the complete local quality gate with:

```bash
npm run ci
```

Dependency decisions, audit mitigations and bundle-size budgets are recorded in [docs/dependency-baseline.md](docs/dependency-baseline.md).

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel --prod
```

The `vercel.json` rewrites all routes to `index.html` for client-side routing.

---

## Input format

### Excel / CSV / TSV

The parser looks for columns named (case-insensitive, flexible aliases):

| Field | Accepted names |
|---|---|
| Task ID | ID, Task ID |
| Task name | Task, Task Name, Name, Activity, Item |
| Start date | Start, Start Date, Begin, From |
| End date | End, End Date, Finish, Due, Until |
| Category / WP | Category, WP, Phase, Group, Section |
| Progress | Progress, %, % Complete, Done |
| Dependencies | Dependencies, Deps, Depends On, After |
| Category colour | Colour, Color, Category Colour |

Task name, start and end are required. CSV and TSV follow normal quoted-field rules, including commas, escaped quotes, embedded newlines and CRLF line endings. Excel numeric date serials are supported.

Dates must be either ISO `YYYY-MM-DD` or British `DD/MM/YYYY`. Slash dates always use day/month order, so `03/04/2026` means 3 April 2026. Invalid calendar dates and other ambiguous formats are rejected instead of being guessed.

Task IDs must be unique and may contain letters, numbers, dots, underscores, colons and hyphens. Progress must be between 0 and 100. Colours must be 3- or 6-digit hex values. Dependencies may refer to another task's ID, its 1-based data-row position, or a unique task name. Missing, repeated and self-referencing dependencies are errors.

### Paste

Copy from Excel or Google Sheets (tab-separated) and paste into the Paste tab. Standards-compliant CSV also works. The preview shows every parsed task and any row-level errors. The current project is not replaced until the preview has no errors and you confirm the import.

### JSON project

Use **Save** to export your current project, and **Load** (or import the file from the upload tab) to resume. Project files use a versioned schema:

```json
{
  "schemaVersion": 1,
  "title": "Grant plan",
  "tasks": [],
  "categoryColors": {}
}
```

Version 1 preserves the complete project, including an empty task list, empty title and empty colour map. Older unversioned files with `chartTitle`, `tasks` and `categoryColors` are migrated when loaded. Invalid tasks, duplicate IDs, missing dependencies or invalid colours reject the entire file, so a failed load never partially changes the current project.

---

## Stack

- [React](https://react.dev) + [Vite](https://vite.dev)
- [frappe-gantt](https://frappe.io/gantt) — Gantt chart rendering
- [SheetJS (xlsx)](https://sheetjs.com) — Excel parsing
- [Papa Parse](https://www.papaparse.com/) — standards-compliant CSV and TSV parsing
- [html-to-image](https://github.com/bubkoo/html-to-image) — PNG export
- [Tailwind CSS v4](https://tailwindcss.com) + [@genomicx/ui](https://github.com/genomicx/genomicx-ui) design tokens

---

## Licence

MIT
