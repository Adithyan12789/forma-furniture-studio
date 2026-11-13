# Furniture Studio — AI-Powered 3D Furniture Studio

Upload a furniture photo → a vision AI extracts structured properties →
**our own procedural Three.js engine** builds a real, editable 3D model.
AI is used *only* for image analysis. All geometry is generated
programmatically — no image-to-3D services, ever.

## Phase status
- **Phase 1 — Foundation: complete.** Monorepo, React TS client, Express +
  MongoDB server, interactive studio viewport with a fully procedural
  wooden dining chair (orbit controls, studio lighting, environment
  reflections, shadows, camera presets, live dimension/finish controls).
- **Phase 2 — Procedural modeling engine: complete.** Nine generators —
  dining chair, office chair, armchair, sofa (1–4 seats), table (rect/round
  tops; tapered, turned, panel or pedestal legs; desk drawers), bed (panel
  or slatted headboard), wardrobe (shaker doors), cabinet/sideboard
  (drawers + doors) and bookshelf — all composed from an extended geometry
  library (framed doors, drawer fronts, bar/knob handles, slat screens,
  lathe supports, soft upholstered blocks). Every generator is headless-
  tested for mesh count, bounding-box fidelity and NaN-free geometry.
  The Studio UI is fully config-driven: furniture picker, live component
  hierarchy with working toggles, per-generator design controls, material
  and color editing, and a camera that rescales to the loaded model.
- **Phase 3 — Material engine: complete.** Full procedural PBR library for
  all material kinds: six woods (grain + derived normal maps), woven
  cotton/linen, sheened velvet, pebbled leather and synthetic leather,
  brushed stainless steel/aluminum/iron (metalness 1, streak roughness),
  veined marble, porous concrete, transmission glass and plastic — every
  texture set (color + roughness + normal) generated in-engine on canvas,
  tinted per colorway, with raw/matte/satin/gloss finishes. The studio
  environment is now a softbox rig (drei Lightformers) with an overhead
  spot, so metals and glass reflect like a product shoot. The editor
  exposes every material assignment: kind, color and finish.
- **Phase 4 — AI analysis: complete.** Image upload (drag & drop, JPEG/PNG/
  WebP, 8 MB, Multer + local storage behind a provider interface), Gemini
  Vision integration over REST (key only in server/.env), a strict analysis
  prompt (structured JSON, confidence scores, estimated/unknown instead of
  invented precision), and Zod validation of every AI response before it is
  stored — invalid responses are rejected with 502, a missing key with 503.
  Projects API (create/list/get/upload/analyze/save-analysis) with JWT auth
  and ownership checks; the Analyze page provides the full flow plus an
  editable review screen (category, style, colors, materials, finish,
  dimensions in cm, components) with per-property confidence badges, and a
  clearly-labelled sample preview that needs no API key.
- **Phase 5 — Automatic model generation: complete.** A deterministic
  converter (shared/conversion/analysisToConfig.ts, mirrored on the server)
  turns a confirmed analysis into a validated FurnitureConfig: category →
  generator selection, dimension clamping with per-type defaults for
  unknowns, material mapping by role (upholstery / structural wood /
  hardware metal / stone-glass tops) with primary-color tinting and finish
  mapping, component gating from detected parts (desks always get drawers;
  loveseats get two seats; wide wardrobes get more doors), all validated
  against a Zod config schema before use. POST /api/models/:projectId/generate
  persists the config on the FurnitureModel (analysis kept separately);
  the Analyze page's "Generate 3D model" button converts and opens the
  result directly in the Studio.
- **Phase 6 — 3D editor: complete.** Click-to-select in the viewport
  (generator group names map to config components; a brass bounding box
  highlights the selection and the hierarchy stays in sync), full undo/redo
  history (50 entries, slider bursts coalesce into one step, keyboard
  shortcuts), lighting controls (key-light and environment intensity), and
  GLB / glTF export via GLTFExporter with geometry, PBR materials and
  procedural textures embedded.
- **Phase 7 — Production: complete.** Projects dashboard (thumbnails,
  statuses, model versions, open-in-Studio, delete), model version history
  (every analysis, generation and Studio save is a version; any config
  version can be reloaded), Cloudinary image storage behind the storage
  interface (signed REST uploads when CLOUDINARY_* is set; local disk
  otherwise), project deletion with file cleanup, clean upload error
  mapping, lazy-loaded routes with vendor chunk splitting, and production
  serving of the built client from the API server.
  generation from analysis, full editor + export, production) are planned
  and not yet started — see the phase plan in the project brief.

## Quick start
```bash
# backend  (http://localhost:5000)
cd server && cp .env.example .env   # set MONGO_URI + JWT_SECRET
npm install && npm run dev

# frontend (http://localhost:5173, /api proxied to :5000)
cd client && npm install && npm run dev
```
The server starts and serves `/api/health` even without MongoDB
(it reports `db: "disconnected"`); connect a MongoDB instance
(local or Atlas) for auth persistence.

## Layout
- `client/` — React + TypeScript + Vite + Tailwind, React Three Fiber studio
- `server/` — Express + Mongoose + JWT (MVC), AI/storage services isolated
- `shared/` — furniture configuration types, AI analysis Zod schema, constants

## Deployment

1. **MongoDB**: create a cluster (e.g. MongoDB Atlas free tier) and put its
   connection string in `server/.env` as `MONGO_URI`.
2. **Secrets**: set a strong `JWT_SECRET`; add `GEMINI_API_KEY` to enable
   live AI analysis; optionally add `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for cloud image storage
   (without them, uploads stay on local disk under `server/uploads/`).
3. **Build**: `npm run build:client` (output: `client/dist`).
4. **Run**: `NODE_ENV=production npm --prefix server run start` — the API
   serves the built client and falls back to the SPA entry for app routes.
   In development, run the client (`npm run dev:client`, :5173, proxies
   /api) and server (`npm run dev:server`, :5000) separately.
5. Reverse-proxy the server port behind HTTPS in real deployments; JWTs
   are bearer tokens and should only travel over TLS.
