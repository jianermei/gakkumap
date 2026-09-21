# Change summary

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
