# Dependency and quality baseline

The application supports Node.js 20.19.x and 22.12 or newer, matching Vite's supported runtime range. CI exercises the oldest declared release line, Node 20.19, with a clean `npm ci` install.

## Production advisory baseline

The production dependency audit is enforced in CI at moderate severity or higher. The 22 July 2026 baseline findings are addressed as follows:

| Dependency | Resolution |
| --- | --- |
| React Router and React Router DOM | Updated to 7.18.1. `BrowserRouter` remains necessary only because `@genomicx/ui`'s `NavBar` renders React Router `Link` components. The app itself has no client-side routes. |
| Vite | Updated to 8.1.5. Vite is a development and build dependency and is not shipped to the browser. |
| SheetJS | Updated from the stale npm release to the vendor's 0.20.3 tarball, which contains the fixes for the prototype-pollution and regular-expression denial-of-service advisories. Spreadsheet processing remains local to the browser. |
| DOMPurify | Pinned transitively to 3.4.12 for jsPDF's optional HTML export path. The app's PDF export only passes its own generated PNG to jsPDF, but the safe release is still enforced. |
| PostCSS | Pinned transitively to 8.5.22 for Vite and Tailwind CSS. The application does not transform user-supplied CSS. |

## Quality gates

Every pull request must pass ESLint, the Vitest suite, a production audit, and the production build. The build also enforces compressed bundle budgets:

- Largest JavaScript asset: 230 KiB gzip
- All JavaScript assets: 480 KiB gzip
- All CSS assets: 10 KiB gzip

These budgets cover both initial and lazy-loaded export code. Any deliberate increase must update the budget and explain the trade-off in the pull request.
