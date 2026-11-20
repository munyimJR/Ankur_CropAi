# Ankur---CropAi

# Ankur
Growing with you.

Precision agriculture and field-monitoring platform designed for farmers in Bangladesh.

## Run

Requires Node 22.14+ and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` creates `dist/`; `npm run preview` serves it. Configure static hosting to rewrite application paths to `index.html`.

## Included

Landing page, dashboard, saved fields and observations, interactive district map and simulated vegetation grid, crop-image upload/preview/analysis, climate charts, crop/season yield filters and scenario controls, local English/Bangla advisor, read/unread alerts, profile settings and simulated connection errors. Fonts and photos are local. No account, paid API or network service is required to explore the app once installed.

## Demo boundaries

All climate, satellite-like vegetation, analysis confidence, and yield values are demonstrations. Crop analysis hashes filename, size and crop to select sample content; it does not inspect the image. Browser image decoding validates uploaded files. Advisor responses use keyword matching and are not validated agronomic advice. Maps show approximate district locations, not cadastral boundaries. Local data is specific to the browser and can be lost if browser storage is cleared.

## FastAPI integration

Typed contracts live in `src/services/types.ts`. `VITE_AGRIPILOT_API_URL` enables HTTP branches for farms, crop analysis, climate, vegetation and yield overview. Those endpoints must be implemented and tested on your server. Advisor, observations authored locally, alerts, profile and scenario calculations remain local; connecting them requires additional adapters. Do not set an API URL for the Phase 1 demo. No backend or trained model is included.

## Checks

`npm test` checks storage recovery, upload restrictions, demo labeling, filter behavior, scenario calculations and bilingual advisor matching. `npm run build` performs strict TypeScript checking and a production build.

## Images and provenance

Wikimedia images were fetched from their original sources. `public/photos/credits.json` records author HTML, source pages, license URLs and modifications. Images were resized and converted to WebP without removing the original watermark. The footer links to these credits. `scripts/fetch_photos.py` can retrieve missing copies. Original Lovable asset manifests are retained for provenance but the app uses bundled local images.
