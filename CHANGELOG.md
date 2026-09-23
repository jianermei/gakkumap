# Change summary

## About page

- Add a Japanese about page with MLIT A27 2023 data attribution, coverage and accuracy limitations, and school-location and walking-route guidance.
- Link from the header and results panel, preserving map state by opening a new tab.
- Include the page in deployment with hashed styling and a working return-to-map link.

## Beta interface improvements

- Replace the fixed desktop layout with a full-width mobile map, floating search field, and responsive desktop sidebar.
- Add a collapsible school-selection panel and a mobile handle supporting drag down/up and tap to hide/restore information without losing selections or routes.
- Show clickable place candidates directly below the input; require an explicit selection, then hide candidates and display the selected blue marker.
- Invalidate stale search responses when the query changes; support keyboard selection and Escape dismissal.
- Fit boundaries and routes below the floating search controls; use tighter mobile margins and refit after panel or search-box size changes.
- Promote walking duration and distance into a prominent result card; move the school-location caveat below it in smaller, muted text.
- Preserve existing routes and duration results when redrawing the same school boundary; clear them when endpoints change or the user clears them.
- Unify main action buttons with dark-green backgrounds and white text.
- Exclude Cloudflare local state and dependency folders from Git.

Validation: JavaScript syntax and deployment-builder checks passed during these changes.
Mobile gestures and final viewport framing still need device/browser verification.

## Deployment preparation

- Export all 47 prefectures into separate indexes and bounded geometry chunks without simplifying geometry.
- Load municipality and school indexes independently; fetch geometry only on Draw and reuse a bounded request cache.
- Verify source-feature preservation, references, stale requests, retries and hosting file limits.
- Add a static package builder with a public-file allowlist, content-hashed application assets and referenced data only.
- Generate index.html, config.js and Cloudflare Pages cache/security headers; exclude local configuration and raw datasets.
- Accept separate production configuration via environment variables or an ignored JSON file, with an optional strict build gate.
- Building packages does not upload or publish the website.

## 2026-09-21

- Fixed relative script, stylesheet and data paths; use a local HTTP server instead of file URLs.
- Use the bundled jQuery and asynchronous Google Maps loading with marker support.
- Select data by all 47 two-digit prefecture codes; remove the former prefecture restriction.
- Support designated-city and ward school lists, reset dependent selections, and ignore stale requests.
- Load 2023 A27 GeoJSON from map_data/A27-23_XX.geojson, replacing the former 2010 XML loader.
- Render Polygon and MultiPolygon school boundaries, including interior rings, in polygon or line mode.
- Group boundary features by school and use school addresses to identify ward schools when data uses city codes.
- Resolve A27_005 school addresses through Google Geocoding; show red school pins and name/address popups.
- Retain legacy XML point-reading helpers; reject ambiguous address matches and ignore outdated geocoding results.
- Add place/address search with up to five results, a standard blue pin and independent search-result clearing.
- Add walking routes from the search result to the school, choosing the shortest estimated duration among returned alternatives.
- Display walking time, distance and route warnings; clear outdated routes when endpoints change.
- Version changed scripts to avoid stale browser caches and show actionable API/setup errors.
- Move API credentials and map settings to ignored config.local.js; provide a placeholder example.
- Exclude map datasets, local environment/editor settings and common credential files from Git.

Validation performed during development: JavaScript syntax, source diff checks, local dataset parsing,
school lists and boundary drawing mocks for Tokyo/Kanagawa, and mocked marker, geocoding, search and
walking-route flows (including clearing and stale responses). The earlier school pin and popup were
also verified in Chrome. These checks do not constitute a complete production or nationwide data audit.
