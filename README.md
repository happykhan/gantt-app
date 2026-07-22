# Gantt Builder

A browser-based Gantt chart tool built for academic grant applications and project planning. No account, no server: everything runs locally.

**Live app:** https://gantt-app-wheat.vercel.app

---

## Features

- **Flexible input**: upload Excel (`.xlsx`/`.xls`), CSV or JSON, paste from Google Sheets, or start from the built-in example
- **Drag to edit**: drag bars to shift dates and drag either edge to resize duration
- **Focused editing**: edit a selected task in the task editor or use the desktop task table for quick changes
- **Category colours**: automatic colour coding by category, with category and task-level overrides
- **Dependencies**: select predecessor tasks and see dependency arrows on the chart
- **Responsive views**: Week, Month, Quarter and Year scales, plus Fit to project and Reset zoom
- **Export**: download PNG, SVG and PDF versions of the complete chart
- **Local persistence**: changes autosave in the browser; project JSON files provide portable Save and Open round trips
- **Mobile friendly**: compact task cards and a touch-friendly task editor at narrow widths
- **Dark mode**: follows the system preference through `prefers-color-scheme`

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

Run the production build through the browser regression suite with:

```bash
npx playwright install --with-deps chromium
npm run test:e2e:local
```

The browser suite covers the critical workflow in desktop/mobile and light/dark projects. It also covers CSV, Excel and JSON imports; editing, dependencies, drag/resize, undo and persistence; project Save/Open; PNG, SVG and PDF downloads; and a 250-task stress fixture.

The full preview, deployment and post-deployment procedure is in [docs/release-checklist.md](docs/release-checklist.md).

Dependency decisions, audit mitigations and bundle-size budgets are recorded in [docs/dependency-baseline.md](docs/dependency-baseline.md).

---

## Deploying to Vercel

Vercel builds pull requests as previews. Test the immutable preview URL before merge:

```bash
E2E_BASE_URL=https://your-preview-url npm run test:e2e:preview
```

Production deployment requires explicit approval. Follow the release checklist rather than deploying an unreviewed local checkout. The `vercel.json` rewrites all routes to `index.html` for client-side routing.

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
| Category | Category, WP, Phase, Group, Section |
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
- Custom React timeline renderer with tested date, dependency and responsive geometry modules
- [SheetJS (xlsx)](https://sheetjs.com) — Excel parsing
- [Papa Parse](https://www.papaparse.com/) — standards-compliant CSV and TSV parsing
- [html-to-image](https://github.com/bubkoo/html-to-image) — PNG export
- [Tailwind CSS v4](https://tailwindcss.com) + [@genomicx/ui](https://github.com/genomicx/genomicx-ui) design tokens

---

## Licence

MIT
