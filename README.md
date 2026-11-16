# MatrixIQ — knowledge, connected

A local-first personal knowledge graph with a session-scoped Hono backend. Add sources to a
project and explore seeded concepts and connections across documents that look unrelated. Local
mode keeps original text and files in the browser; remote mode uploads PDFs, Markdown and text to
the backend, which extracts readable text into temporary session memory and can analyse every
source in a project together with a server-side AI provider.

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
| Backend | **Hono 4 + Node.js + TypeScript** | Session-scoped project API with in-memory state. |
| PDF text | **pdf-parse 2** | Server-side PDF text extraction without a browser parser. |
| AI analysis | **Google Gemini REST API** | Server-side cross-document analysis behind a provider interface. |
| Icons | Inline SVG components | Small bundle, consistent icon set. |
| Tests | **Vitest** | Frontend state helpers plus backend session, project, upload and mocked AI analysis tests. |

No UI kit, chart library, CSS framework or state-management package. Frontend runtime
dependencies are React, React DOM and React Router; the backend uses Hono and Node.js.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run test     # focused Vitest suite
npm run preview  # serve the production build
```

Node 20.16+ is recommended (the PDF parser requires it).

The backend has its own package and dependencies:

```bash
cd server
npm install
cp .env.example .env
npm run dev      # http://localhost:8787
npm run start    # single process at http://localhost:8787 (use for the demo)
npm test
npm run typecheck
```

The frontend proxy uses `VITE_API_PROXY_TARGET=http://localhost:8787`; see
`src/services/api.ts` for the client contract.

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

The app keeps its working state in the browser, and **local mode is the default**. When remote mode
is configured, the Sources screen talks to the backend; all other project screens still read the
local snapshot. There is no account, database or permanent server storage.

- **IndexedDB** stores the complete workspace snapshot and original uploaded files separately.
- **localStorage** stores the light/dark preference and acts as a metadata-only fallback for the
  workspace snapshot if IndexedDB is blocked. File blobs remain IndexedDB-only in that case.
- **Local-mode** projects, sources, full pasted/text content, concepts, connections, insights,
  dismissed findings, saved connections and graph preferences are restored on reload.
- A storage warning appears if the browser refuses or runs out of space. The session still works,
  but changes may not survive a reload.
- Deleting a source cascades to concepts that exist only in that source, then to connections and
  insights that reference those concepts. Deleting a project does the same for all its sources and
  removes stored files. The last remaining project cannot be deleted.
- Remote sources are session-scoped. Their mapping and metadata live in `sessionStorage`, never in
  IndexedDB, and are bound to the active backend session. A new browser session or a replaced
  backend session removes them; opening a source again fetches its extracted text from the live
  session. Local-mode data is untouched by this cleanup.
- Source and project names can be changed from the source page and Settings. Project deletion also
  lives in Settings.

The theme toggle remains in Settings and is applied before the app finishes loading.

## Sources

The Sources tab supports drag-and-drop and the file picker for PDF, Markdown and plain text.

- **Local mode** reads Markdown and text into the saved source, keeps the original file in
  IndexedDB, and marks new sources **queued / waiting for analysis**. PDFs are stored but not parsed.
- **Remote mode** uploads the original file (or pasted text) to `POST /projects/:id/sources`. The
  backend validates the extension, MIME type and size, extracts PDF/TXT/Markdown text, and returns
  the extracted content. Unsupported, empty, oversized, corrupted or text-free documents return a
  clear 4xx error.
- PDFs are parsed with `pdf-parse`; TXT and Markdown are decoded as strict UTF-8. Paragraphs,
  headings and meaningful whitespace are preserved while CRLF noise, NUL characters and excessive
  blank lines are normalized. Documents that produce no usable text are rejected.
- The upload size defaults to 10 MiB and is configurable with `UPLOAD_MAX_BYTES`. PDFs default to a
  200-page limit, configurable with `PDF_MAX_PAGES`.
- Remote source detail pages show the extracted text, word count, page count and original filename.
  Deleting a source also deletes its backend copy. Original file buffers and extracted text live in
  the backend session's memory only and disappear on session expiry or project deletion.
- Local source detail pages show stored text and allow downloading the original file. Both modes
  provide rename and delete actions.
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
   category. It does not claim to synthesize a new conclusion.

Remote-mode analysis asks the provider for approximately three to five findings alongside concepts
and connections, in the same Gemini call. Insights are grouped into the categories above and must
cite exact evidence excerpts. A bridge or recurring pattern needs evidence from at least two
documents; unsupported categories are omitted rather than filled with generic observations. Local
mode keeps its seeded insights and makes no AI calls.

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
- Analysis: shows whether AI analysis is connected and explains the session-only result storage.
- Backend connection: shows local vs remote mode, API base URL and whether source requests are sent.
- Project: rename or delete the active project.
- Relationship taxonomy reference.
- Data: export the active project (including saved connection IDs) as JSON.
- Account: local-browser storage description; no sign-in is implemented.

The old “minimum connection strength” slider was removed. It was local-only and contradicted the
graph, which continued to show all links at every value.

## Backend integration seam

The repository contains the Phase 0–4 backend: Hono on Node.js with in-memory sessions,
session-scoped project CRUD/cascade deletion, PDF/TXT/Markdown upload with text extraction, and
cross-document AI analysis. There is still no authentication, database or permanent storage.

Frontend configuration (copy `.env.example` to `.env`):

```bash
VITE_API_MODE=local                 # default: no network calls
# VITE_API_MODE=remote
# VITE_API_BASE_URL=http://localhost:8787
# VITE_API_PROXY_TARGET=http://localhost:8787
```

- `VITE_API_MODE=local` keeps all reads and writes in IndexedDB.
- Remote requests require both `VITE_API_MODE=remote` and `VITE_API_BASE_URL`.
- For local development, set `VITE_API_BASE_URL=/api` and `VITE_API_PROXY_TARGET` to proxy `/api`
  to the backend through Vite.
- The typed client lives in `src/services/api.ts`. It throws a clear configuration error instead of
  calling a half-configured backend.
- The Sources screen uses the backend only when remote mode is configured. It maps each browser
  project to a temporary backend project on the first upload, reuses that mapping across uploads,
  and recreates it if the backend session or project has expired. The mapping and remote source
  metadata live in `sessionStorage`, bound to the backend session; local mode is untouched and
  remains network-free.
- In remote mode, **Analyze project** starts one asynchronous analysis over every source in the
  project. The browser polls the project status and then reloads the session-scoped graph and
  insights. AI concepts, connections, insights and evidence are never written to IndexedDB.
- On the first protected request, the client calls `POST /session`, stores the returned session ID
  in `sessionStorage`, and attaches it as `X-Session-ID`. Concurrent initialization calls share one
  bootstrap request, and reloads reuse the stored ID. If a stored session gets a `401`, the client
  removes it, bootstraps a replacement, and retries the original request once; a second `401` is
  returned to the caller without looping. `POST /session` and `GET /health` require no session.
- Graph and Insights read the remote project when remote mode is configured; Settings and the
  offline demo remain local. Local mode remains network-free.
- Authentication is not implemented. The session ID is an anonymous in-memory scope, not a login.

Backend configuration (copy `server/.env.example` to `server/.env`):

```bash
PORT=8787
SESSION_TTL_MS=1800000       # 30 minutes of inactivity
SESSION_SWEEP_MS=300000      # reap expired sessions every 5 minutes
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
UPLOAD_MAX_BYTES=10485760    # 10 MiB per file or pasted document
PDF_MAX_PAGES=200
GEMINI_API_KEY=              # server-only; analysis is disabled while empty
GEMINI_MODEL=gemini-3.5-flash
AI_TIMEOUT_MS=45000
AI_MAX_DOCUMENT_CHARS=12000
AI_MAX_TOTAL_CHARS=60000
```

Expired sessions are rejected on access as well as by the periodic sweep. All state is in memory
and disappears when the backend process exits.

## Production deployment (Vercel + Render)

The repository includes `vercel.json` for the Vite SPA and `render.yaml` for the backend. Nothing is
deployed automatically by these files.

### Render — backend

Create a **Web Service** from this repository and use:

- **Root Directory:** `server`
- **Runtime:** Node 22
- **Build Command:** `npm ci --include=dev && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`
- **Environment:** `NODE_ENV=production`, `CORS_ORIGINS=https://<your-app>.vercel.app`,
  `GEMINI_API_KEY=<server-only key>`, and `GEMINI_MODEL=gemini-3.5-flash`
- Do **not** set `PORT`; Render injects it. The server binds to `0.0.0.0` by default.

`CORS_ORIGINS` is a comma-separated exact-origin allowlist. It must contain the Vercel production
origin, with no trailing slash. Keep `GEMINI_API_KEY` only in Render; it is never read by Vite or
sent to the browser. A Render free instance can spin down, which clears every in-memory session and
all uploaded sources/analysis, so reconnect or re-upload after a cold start.

### Vercel — frontend

Import the repository and use:

- **Framework Preset:** Vite
- **Root Directory:** repository root
- **Install Command:** `npm ci --include=dev`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Set these build-time variables in Vercel for both Production and Preview:

```bash
VITE_API_MODE=remote
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

Use the Render service origin only: do not append `/api`, a trailing path, or localhost. Production
builds fail fast unless both variables are present, the URL is HTTPS, and it is not a loopback
host. `vercel.json` rewrites unknown paths to `index.html`, so direct visits to `/p/:id/graph`,
`/p/:id/insights`, and other BrowserRouter routes work on refresh. If you use Vercel preview URLs,
add each browser origin to `CORS_ORIGINS` on Render; otherwise use the production domain.

After both services are live, verify `GET /health`, then exercise session creation, source upload,
analysis, graph and insights in the browser. The frontend calls Render directly; the `/api` Vite
dev proxy is not used in production.

Expected contract (relative to the base URL):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Readiness check |
| `POST` | `/session` | Create an in-memory session and return `{ sessionId }` |
| `GET` | `/projects` | List projects |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/:id` | Read a project |
| `PATCH` | `/projects/:id` | Rename/update a project |
| `DELETE` | `/projects/:id` | Delete a project and its derived data |
| `GET` | `/projects/:id/graph` | Concepts and connections |
| `GET` | `/projects/:id/insights` | Generated insights |
| `POST` | `/projects/:id/analysis` | Start cross-document analysis (202) |
| `GET` | `/projects/:id/analysis` | Poll project analysis status |
| `GET` | `/projects/:id/sources` | List sources |
| `POST` | `/projects/:id/sources` | Multipart upload (`file`, `content`, `title`) |
| `GET` | `/projects/:id/sources/:sourceId` | Source metadata/content |
| `DELETE` | `/projects/:id/sources/:sourceId` | Delete a source |

Project CRUD, cascade deletion, source upload/list/detail/delete, graph reads and project analysis
are implemented. Uploads accept multipart `file`, `content` and `title`. Analysis runs only when
`GEMINI_API_KEY` is set; if it is missing, the endpoint returns a clear 503 and sources remain
usable.

The AI provider is deliberately modular. `server/src/services/ai/gemini.ts` owns transport and
`server/src/services/ai/validate.ts` validates the model output before anything is stored. A new
provider only needs to implement the `AiProvider` interface and be passed into `createApp`.

Analysis output is validated strictly: every concept, connection and insight must carry an exact
evidence excerpt found in one of the project documents. Concepts are deduplicated by normalized
label and receive stable project-scoped IDs. Connections and insights are labelled **direct
evidence**, **reasonable inference** (at least two pieces of evidence), or **speculative**
(confidence capped; connections marked as suggested). Invalid, unsupported or ungrounded output
fails the analysis without changing the previous graph. A self-connection carries no usable
meaning and is discarded; one validation retry is attempted before an otherwise invalid generation
fails the analysis.

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
│  │                ProjectAnalysis (status + trigger)
│  ├─ search/       SearchOverlay (⌘K palette)
│  ├─ ui/           Badge, Progress/Meter, Switch, PageHeader, Dialog, …
│  └─ icons/        Icon set + brand mark
├─ data/
│  ├─ seed.ts       Two projects: sources, concepts, connections, insights
│  └─ clone.ts      Copies only the demo sources into a new project
├─ lib/
│  ├─ persistence.ts       IndexedDB snapshot/file storage + fallback + validation
│  ├─ remoteGraph.ts       Merge/strip session-scoped analysis results
│  ├─ workspaceState.ts    Pure tested cascade/rename helpers
│  ├─ search.ts            Pure cross-object search helper
│  ├─ insightCategories.ts Category config + Broader Insights digest
│  ├─ useDialogBehavior.ts Focus trap, Escape, scroll lock, focus restore
│  └─ relations.ts, layout.ts, format.ts, paths.ts
├─ pages/           HomePage, AboutPage, Dashboard, GraphPage, SourcesPage,
│                   DocumentPage, InsightsPage, SettingsPage, NotFound
├─ services/
│  ├─ api.ts        Typed backend contract + environment configuration
│  ├─ remoteProjects.ts  Session-scoped local-project → backend-project mapping
│  └─ remoteSession.ts   Session-bound mappings and remote source metadata
├─ store/           KnowledgeContext — persistence + project-scoped state
├─ styles/          tokens.css, base.css, components.css, layout.css, pages.css,
│                   redesign.css, theme.css
├─ types.ts         Domain models
├─ App.tsx          Routes
└─ main.tsx         Entry point
```

```
server/
├─ src/
│  ├─ app.ts                 Hono app, public session route, CORS, errors
│  ├─ config.ts              Session, CORS and upload environment config
│  ├─ index.ts               Node server entry point
│  ├─ middleware/session.ts  X-Session-ID validation and expiry checks
│  ├─ routes/projects.ts     Project CRUD and cascade deletion
│  ├─ routes/sources.ts      Upload, extraction, retrieval and source cleanup
│  ├─ routes/analysis.ts    Project analysis jobs, status, graph and insights
│  ├─ services/ai/          Provider interface, Gemini transport, prompt and validation
│  ├─ services/textExtraction.ts  PDF/TXT/Markdown normalization and extraction
│  ├─ services/sessionStore.ts  In-memory TTL session store
│  └─ types.ts               Backend domain and session types
├─ tsconfig.json
└─ vitest.config.ts
```

## Design notes

`src/styles/tokens.css` holds the visual system: colour ramps, surface levels, cluster accents,
type scale, spacing, radii, elevation and motion. Components reference tokens only.

Domain models in `src/types.ts`:

```ts
Workspace → documentIds[]              // scope boundary
KnowledgeDocument → conceptIds[], status ('extracted' | 'queued'),
                    content?, fileKey?, remoteProjectId?, fileName?, mimeType?, fileSize?
Concept → clusterId, documentIds[], mentions
Concept → evidence[] (documentId, exact excerpt)
Connection → from, to, type, confidence, strength, explanation,
             evidenceLevel ('direct' | 'inference' | 'speculative'), evidence[]
Insight → kind ('bridge' | 'gap' | 'tension' | 'pattern'), confidence, edgeId?
```

`KnowledgeProvider` hydrates persisted data before rendering, exposes project-scoped collections,
and debounces snapshot writes. Pure helpers in `src/lib` keep deletion, search and insight
aggregation independent of React and covered by tests.

## Scope and limitations

- The UI is local-first. The Sources screen uses backend uploads and AI analysis in remote mode;
  graph, insights and settings still read the local snapshot plus the session-scoped remote graph.
- No authentication, user accounts, server database or permanent storage.
- AI analysis requires remote mode, a configured `GEMINI_API_KEY`, and internet access from the
  backend. Local mode intentionally stays network-free and marks new sources as waiting.
- Local mode uses the bundled sample corpus and its seeded insights. Remote AI analysis produces
  concepts, connections and insights with evidence, and the Insights tab reads those session-scoped
  results.
- Local mode still stores PDFs without parsing them. PDF extraction is available only in remote mode.
- Remote source content, metadata and mappings are kept only for the current browser and backend
  session. They are never written to IndexedDB. After a reload, opening the source fetches its text
  from the live session; when the browser or backend session ends, remote sources are cleared.
- "Broader Insights" is a digest of existing findings, not new model-generated synthesis.
- Static hosting requires a SPA fallback because the app uses `BrowserRouter` (for example a
  `404.html` copy of `index.html`, or hash routing).
