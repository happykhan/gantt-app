# Release checklist

Use this checklist for every production release. Record links and results in the pull request so the release can be reproduced and audited.

## 1. Clean install and local quality gate

- [ ] Use Node.js 20.19.x, or 22.12 and newer: `node --version`.
- [ ] Start from a clean checkout of the release commit: `git status --short` returns no changes.
- [ ] Install the locked dependency tree: `npm ci`.
- [ ] Check production dependencies: `npm audit --omit=dev --audit-level=moderate`.
- [ ] Run static analysis: `npm run lint`.
- [ ] Run unit and component tests: `npm test`.
- [ ] Create the production bundle and enforce bundle budgets: `npm run build`.
- [ ] Install the supported browser once on a new machine: `npx playwright install --with-deps chromium`.
- [ ] Test the local production build: `npm run test:e2e:local`.
- [ ] Confirm the Playwright report covers desktop and mobile in light and dark colour schemes.

`npm run ci` provides the audit, lint, unit-test and build gate. Browser tests remain a separate command so contributors can run the fast gate without downloading Chromium.

## 2. Pull request and Vercel preview

- [ ] Push the reviewed commit and open a pull request against `main`.
- [ ] Wait for the `CI` build and browser-test jobs to pass.
- [ ] Download or inspect the Playwright report artifact. Failed runs retain screenshots, video and traces; the large-plan test attaches a screenshot for every viewport and colour scheme.
- [ ] Wait for Vercel to report a successful Preview deployment.
- [ ] Run the smoke test against that exact deployment: `E2E_BASE_URL=https://preview.example npm run test:e2e:preview`.
- [ ] Confirm the automated `Vercel preview smoke` check passes when the deployment-status integration is available.
- [ ] Manually check the empty state, example, task editor and one image export on the preview.
- [ ] Add the pull request URL, immutable preview URL, commit SHA and check links to the release evidence below.
- [ ] Do not merge while the local, CI or preview gate is red.

## 3. Approved production deployment

- [ ] Obtain explicit approval to merge and deploy.
- [ ] Confirm the approved commit SHA is still the pull request head.
- [ ] Merge using the repository's normal reviewed workflow.
- [ ] Allow Vercel to deploy `main`, or promote the approved preview if that is the agreed release procedure.
- [ ] Do not run `vercel --prod` from an unreviewed working tree.
- [ ] Record the production deployment URL and Vercel deployment identifier.

## 4. Post-deployment smoke and rollback readiness

- [ ] Run `E2E_BASE_URL=https://gantt-app-wheat.vercel.app npm run test:e2e:preview` against production.
- [ ] In a fresh browser context, verify empty start, example loading, create/edit/delete, undo and reload persistence.
- [ ] Import one CSV or Excel file and one saved JSON project.
- [ ] Download PNG, SVG and PDF files, then open each file outside the browser.
- [ ] Check a 390 px mobile viewport and a desktop viewport in both light and dark modes.
- [ ] Confirm the browser console has no uncaught errors and no project data leaves local browser storage.
- [ ] If a critical smoke check fails, stop the release, restore the previous healthy Vercel deployment and record the failure in the pull request.

## Release evidence

Copy this block into the pull request before approval:

```text
Release commit:
Pull request:
Vercel preview:
Local gate: audit / lint / unit / build / E2E
CI run and Playwright artifact:
Preview smoke result:
Approval:
Production deployment:
Post-deploy smoke result and time:
Rollback deployment:
```
