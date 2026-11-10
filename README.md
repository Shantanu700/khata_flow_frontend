# KhataFlow web app

The screens of KhataFlow, a voice-first shop book for Indian kirana merchants: Dashboard, Ledger (customer
udhaar), Stock, Staff, Entries and Speak, in Hinglish and the 10 Indian languages Gnani supports.
Next.js 16, React 19, Tailwind CSS 4, shadcn/ui and GSAP.

**Two repos.** This is the web app. The API (Django, voice pipeline, ledger, demo data) is in
[khata_flow_backend](https://github.com/Shantanu700/khata_flow_backend). Clone both side by side:

```bash
mkdir KhataFlow && cd KhataFlow
git clone https://github.com/Shantanu700/khata_flow_backend.git backend
git clone https://github.com/Shantanu700/khata_flow_frontend.git frontend
```

## Quick start: one command

Needs Docker, [mkcert](https://github.com/FiloSottile/mkcert#installation) and [Bun](https://bun.sh).

```bash
cd backend && ./scripts/up.sh
```

That brings up the API with two demo shops and then this app on http://localhost:3100. Sign in as
`gupta_store` (Gupta General Store) or `patel_store` (Patel Provision Store) with the `DEMO_PASSWORD` from
`backend/.env`, which the script prints when it finishes. See the backend README for details.

## Running this app on its own

With the API already up on https://localhost:8000:

```bash
cp .env.example .env.local     # KHATAFLOW_API_URL, the API the app's server calls
bun install
bun run dev:api                # http://localhost:3100
```

`dev:api` passes mkcert's root certificate to Node (`NODE_EXTRA_CA_CERTS`), so the app's server can call the
API's local HTTPS with certificate checks on. The browser only ever calls this app (`/api/kf/*`, `/api/session`),
which keeps the API token in an httpOnly cookie.

- Type-check: `bun run typecheck`
- Lint: `bun run lint`
- Format: `bun run format`
- API types from the live schema: `bun run gen:api`

## How it fits together

- **One route, six tabs.** `app/[[...screen]]/page.tsx` serves `/`, `/khata`, `/stock`, `/staff`, `/entries`
  and `/bolo`, so a refresh stays on the tab while the app shell stays mounted for the GSAP morph between tabs
  (`components/app/use-screen-morph.ts`).
- **Data** comes from the API through React Query (`components/app/data.ts`). Updates are always PUT with the
  whole object, never PATCH.
- **Speak** records the microphone, streams it to the API's live-transcript WebSocket for words on screen, and
  sends the recording for the command (`components/app/bolo.tsx`, `components/app/live-mic.ts`).
- **Words on screen** come from the API's catalogs (`/api/kf/i18n/<language>`), one per language.
