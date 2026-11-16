# MatrixIQ — knowledge, connected

A frontend-first personal knowledge graph. Add sources to a project, keep their original text or
file in the browser, and explore seeded concepts and connections across documents that look
unrelated.

The app opens on a home page that explains the idea and lists projects. A project workspace holds
its own sources, graph, insights and saved links; sources never move between projects.

The demo ships with two projects. **Personal Atlas** contains apiary field notes,
distributed-systems reading notes, a sourdough journal, a drainage after-action review and
systems-thinking notes. **Book Club** contains sleep notes and traffic notes. You can create more
projects, with or without the sample sources.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Build tool | **Vite 7** | Instant dev server, tiny config. |
| UI | **React 19 + TypeScript** | Component model for the interactive graph, typed domain models. |
| Routing | **React Router 7** | Real, project-scoped URLs such as `/p/ws-atlas/graph?edge=…`. |
| Styling | **Hand-written CSS** with design tokens | No style runtime; one token file drives the system. |
| Graph | **Custom SVG + a deterministic layout function** | Full control over labels, arrows and interaction. |
| Local state | **IndexedDB + localStorage fallback** | Projects and source content survive reloads without a server. |
| Icons | Inline SVG components | Small bundle, consistent icon set. |
| Tests | **Vitest** | Focused tests for state cleanup, search and insight helpers. |

No UI kit, chart library, CSS framework, state-management package or backend SDK. Runtime
dependencies are React, React DOM and React Router.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run test     # focused Vitest suite
npm run preview  # serve the production build
```

Node 20+ is recommended.

## Navigation

```
/                        Home — intro, how it works, project picker
/about                   About
/p/:projectId            Project overview
/p/:projectId/graph      Knowledge graph
/p/:projectId/insights   Insight categories
/p/:projectId/insights/:category
/p/:projectId/sources    Sources (including upload)
/p/:projectId/sources/:id
/p/:projectId/settings   Settings
```

Project selection happens on the home page. The MatrixIQ mark in the workspace sidebar (and the
compact mark in the mobile topbar) returns there. Old links such as `/graph` and `/library/:id`
redirect into the active project so bookmarks keep working.

## Local persistence

There is no server, account or database. The app keeps its working state in the browser:

- **IndexedDB** stores the complete workspace snapshot and original uploaded files separately.
- **localStorage** stores the light/dark preference and acts as a metadata-only fallback for the
  workspace snapshot if IndexedDB is blocked. File blobs remain IndexedDB-only in that case.
- Projects, sources, full pasted/text content, concepts, connections, insights, dismissed findings,
  saved connections and graph preferences are restored on reload.
- A storage warning appears if the browser refuses or runs out of space. The session still works,
  but changes may not survive a reload.
- Deleting a source cascades to concepts that exist only in that source, then to connections and
  insights that reference those concepts. Deleting a project does the same for all its sources and
  removes stored files. The last remaining project cannot be deleted.
- Source and project names can be changed from the source page and Settings. Project deletion also
  lives in Settings.

The theme toggle remains in Settings and is applied before the app finishes loading.

## Sources

The Sources tab supports drag-and-drop and the file picker for PDF, Markdown and plain text.

- Markdown and text files are read into the saved source as text, and the original file is also kept.
- PDFs are stored as uploaded files; the frontend does not parse them.
- Pasted text is saved in full.
- New sources are marked **queued / waiting for analysis**. They have no generated concepts or
  connections, because analysis is intentionally not implemented in the frontend.
- Source detail pages show stored text, allow downloading the original file, and provide rename and
  delete actions.
- The source count uses the project's unique concept count rather than summing per-document
  concepts.

`.docx` is not accepted; it was previously listed but treated as a PDF, which was misleading.

## Insights

The five categories are:

1. **Unexpected Bridges** — connections between ideas that usually live apart.
2. **Recurring Patterns** — ideas that repeat across sources.
3. **Tensions & Contradictions** — where sources disagree or pull against each other.
4. **Gaps & Open Questions** — threads your sources leave unfinished.
5. **Broader Insights** — a cross-category digest containing the strongest single finding from each
   category. It does not claim to synthesize a new conclusion; new synthesis needs the future
   analysis service.

Findings can be dismissed and restored. Dismissals are persisted.

## Graph and saved connections

The graph is an SVG canvas with pan, double-click zoom, topic and relationship filters, and
URL-addressable node/edge selection. Connection types live in `src/lib/relations.ts`.

Saving a connection from the detail panel marks it in the current project. The detail panel's
default view lists saved connections, and they survive reloads. Saved IDs for links that disappear
after a source or project is deleted are cleaned up.

## Search

`⌘K` / `Ctrl+K` searches the current project's:

- ideas, including their IDs;
- connections (title, explanation, type and endpoint labels);
- insights (title, summary, rationale and kind);
- sources (title, summary, original filename and stored text).

The palette footer and empty state describe that scope. The API searches only objects returned by
`KnowledgeProvider`, so a query cannot cross project boundaries.

## Settings

- Appearance: persistent light/dark mode.
- Graph: labels, suggested-link highlighting and reduced motion.
- Analysis: clearly shows that source analysis is not connected.
- Backend connection: shows local vs remote mode, API base URL and that no requests are sent.
- Project: rename or delete the active project.
- Relationship taxonomy reference.
- Data: export the active project (including saved connection IDs) as JSON.
- Account: local-browser storage description; no sign-in is implemented.

The old “minimum connection strength” slider was removed. It was local-only and contradicted the
graph, which continued to show all links at every value.

## Backend integration seam

The frontend is prepared for a future backend but does **not** implement one. No analysis, AI,
authentication, database server or sync exists.

Copy `.env.example` to `.env` when configuring one:

```bash
VITE_API_MODE=local                 # default: no network calls
# VITE_API_MODE=remote
# VITE_API_BASE_URL=https://api.example.com/api
# VITE_API_PROXY_TARGET=http://localhost:8787
```

- `VITE_API_MODE=local` keeps all reads and writes in IndexedDB.
- Remote requests require both `VITE_API_MODE=remote` and `VITE_API_BASE_URL`.
- For local development, set `VITE_API_BASE_URL=/api` and `VITE_API_PROXY_TARGET` to proxy `/api`
  to the backend through Vite.
- The typed client lives in `src/services/api.ts`. It throws a clear configuration error instead of
  calling a half-configured backend.
- No component calls the client yet; this build must remain useful offline until a backend exists.
- Authentication headers are not implemented. When auth lands, add it at the client boundary rather
  than embedding tokens in components.

Expected contract (relative to the base URL):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Readiness check |
| `GET` | `/projects` | List projects |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/:id` | Read a project |
| `PATCH` | `/projects/:id` | Rename/update a project |
| `DELETE` | `/projects/:id` | Delete a project and its derived data |
| `GET` | `/projects/:id/graph` | Concepts and connections |
| `GET` | `/projects/:id/insights` | Generated insights |
| `GET` | `/projects/:id/sources` | List sources |
| `POST` | `/projects/:id/sources` | Multipart upload (`file`, `content`, `title`) |
| `GET` | `/projects/:id/sources/:sourceId` | Source metadata/content |
| `DELETE` | `/projects/:id/sources/:sourceId` | Delete a source |
| `POST` | `/projects/:id/sources/:sourceId/analyze` | Queue analysis |
| `GET` | `/projects/:id/sources/:sourceId/analysis` | Poll analysis status |

The backend should consume either `content` or the uploaded file, return extracted concepts and
connections, and update queued sources. The frontend already keeps both locally.

## Project structure

```
src/
├─ components/
│  ├─ graph/        KnowledgeGraph (SVG canvas), DetailPanel, GraphLegend
│  ├─ layout/       ProjectLayout, Sidebar, Topbar
│  ├─ documents/    DocumentCard, DocumentRow, DocumentGlyph, SourceActions,
│  │                StoredFileButton
│  ├─ insights/     InsightCard (expandable discovery)
│  ├─ projects/     NewProjectModal, ProjectActions
│  ├─ sources/      SourceIntake (drag/drop, upload, paste)
│  ├─ search/       SearchOverlay (⌘K palette)
│  ├─ ui/           Badge, Progress/Meter, Switch, PageHeader, Dialog, …
│  └─ icons/        Icon set + brand mark
├─ data/
│  ├─ seed.ts       Two projects: sources, concepts, connections, insights
│  └─ clone.ts      Copies only the demo sources into a new project
├─ lib/
│  ├─ persistence.ts       IndexedDB snapshot/file storage + fallback + validation
│  ├─ workspaceState.ts    Pure tested cascade/rename helpers
│  ├─ search.ts            Pure cross-object search helper
│  ├─ insightCategories.ts Category config + Broader Insights digest
│  ├─ useDialogBehavior.ts Focus trap, Escape, scroll lock, focus restore
│  └─ relations.ts, layout.ts, format.ts, paths.ts
├─ pages/           HomePage, AboutPage, Dashboard, GraphPage, SourcesPage,
│                   DocumentPage, InsightsPage, SettingsPage, NotFound
├─ services/
│  └─ api.ts        Typed backend contract + environment configuration
├─ store/           KnowledgeContext — persistence + project-scoped state
├─ styles/          tokens.css, base.css, components.css, layout.css, pages.css,
│                   redesign.css, theme.css
├─ types.ts         Domain models
├─ App.tsx          Routes
└─ main.tsx         Entry point
```

## Design notes

`src/styles/tokens.css` holds the visual system: colour ramps, surface levels, cluster accents,
type scale, spacing, radii, elevation and motion. Components reference tokens only.

Domain models in `src/types.ts`:

```ts
Workspace → documentIds[]              // scope boundary
KnowledgeDocument → conceptIds[], status ('extracted' | 'queued'),
                    content?, fileKey?, fileName?, mimeType?, fileSize?
Concept → clusterId, documentIds[], mentions
Connection → from, to, type, confidence, strength, explanation
Insight → kind ('bridge' | 'gap' | 'tension' | 'pattern'), confidence, edgeId?
```

`KnowledgeProvider` hydrates persisted data before rendering, exposes project-scoped collections,
and debounces snapshot writes. Pure helpers in `src/lib` keep deletion, search and insight
aggregation independent of React and covered by tests.

## Scope and limitations

- Frontend only: no authentication, server database, file analysis or AI generation.
- Only the bundled sample corpus has extracted concepts and insights; new sources stay queued.
- PDF text is not extracted. Original files are stored for a future backend.
- "Broader Insights" is a digest of existing findings, not new model-generated synthesis.
- Static hosting requires a SPA fallback because the app uses `BrowserRouter` (for example a
  `404.html` copy of `index.html`, or hash routing).
