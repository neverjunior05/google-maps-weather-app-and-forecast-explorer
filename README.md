# Google Maps Weather Map & Forecast Explorer

An interactive weather dashboard for exploring current conditions, forecasts, observed weather, alerts, and precipitation radar on a Google Map. The frontend is built with React, TypeScript, Vite, and the Google Maps JavaScript API; an Express server proxies Google Maps Platform Weather, Places, and Geocoding requests.

## What the app does

### Explore places on the map

- Pan and zoom an interactive map, or switch between roadmap, satellite, and terrain views.
- Choose from preset cities, search for a place, or click anywhere on the map to select coordinates. The app attempts to resolve a nearby place name and loads weather for the selected point.
- Use **Find My Location** to request the device's location. Geolocation is not requested automatically; the browser asks for permission only after the user clicks the control.
- View the selected location's pin and a weather summary on the map. The weather panel can be expanded or collapsed.
- Jump the map to the United States, Europe, or a global view.

### View weather information

The location panel can show:

- **Current conditions:** temperature, feels-like temperature, and condition summary.
- **Atmospheric metrics:** precipitation probability and amount, wind speed/direction/gusts, relative humidity, dew point, UV index, cloud cover, air pressure, and visibility.
- **Hourly forecast:** up to 24 forecast hours, with temperature, conditions, and precipitation probability.
- **Observed history:** the past 24 hours of hourly weather, switchable with the forecast in the hourly timeline.
- **Daily forecast:** up to 10 days, including daily high/low temperatures and precipitation chances.
- **Minute-by-minute precipitation nowcast:** forecast precipitation segments, precipitation type and intensity, a probability trend, and a summary for selectable 1-, 2-, and 6-hour views. When the API provides no nowcast for a location, the app explains the regional limitation.
- **Weather alerts:** active alerts, with severity, affected areas, issuer, and expandable descriptions when available.
- **Sun and moon summary:** sunrise, sunset, and lunar phase information when returned for the selected location.

Use the panel's **°C / °F** control to switch between metric and imperial weather data, and its refresh button to reload weather for the selected location. Optional live sync is initially paused; enabling it refreshes weather data every 60 seconds. If the Weather API does not support a selected location, the app reports that status rather than presenting simulated weather.

### Use the precipitation radar

- Overlay Google Weather precipitation tiles on the map.
- Choose the **US Precipitation** or **Europe Precipitation** layer. Selecting a layer also focuses the map on that region.
- Adjust overlay opacity, hide/show the overlay, and manually refresh the tiles.
- Read the radar intensity legend.

Weather radar tile availability is regional: the app proxies `US_PRECIPITATION_CURRENT` and `EU_PRECIPITATION_CURRENT` layers. Minute-by-minute nowcasts are also region-limited (United States and parts of Europe). Availability of weather data can vary by location and API coverage; unsupported responses are surfaced in the interface.

## Requirements

- Node.js 20 or newer and npm.
- A Google Cloud project and API credentials with the required Google Maps Platform APIs enabled:
  - Maps JavaScript API
  - Places API (New)
  - Geocoding API
  - Google Maps Platform Weather API
- Ensure the project and keys have the access, billing, and quota configuration required by Google for the APIs you use.

## Configure API keys

Create a local `.env` file from `.env.example` and set both keys:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your_maps_javascript_api_key
GOOGLE_WEATHER_API_KEY=your_server_side_web_services_key
```

In PowerShell, copy the template with:

```powershell
Copy-Item .env.example .env
```

The two keys have different purposes:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | Browser (and returned by `/api/weather/config`) | Loads the Maps JavaScript API and client-side Places functionality. This key is necessarily visible to the browser; restrict it to your app's HTTP referrers and the APIs it needs. |
| `GOOGLE_WEATHER_API_KEY` | Express server only | Authenticates server-proxied Weather, Places REST, and Geocoding requests. Keep it secret; do not use a `VITE_` prefix or commit its value. |
| `PORT` | Express server | Optional listening port; defaults to `3000`. |

The app does not contain hardcoded API keys. The Maps key is public client configuration, not a secret. The backend key is read from the server environment and is not included in browser responses.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To use another port, set `PORT` before starting the server. For example, in PowerShell:

```powershell
$env:PORT = "3001"
npm run dev
```

## Build and run in production mode

Build the client and bundled Express server:

```bash
npm run build
```

Start the built server with production static-file serving enabled. Set the API keys in the process environment as well as `NODE_ENV`:

```powershell
$env:NODE_ENV = "production"
$env:VITE_GOOGLE_MAPS_API_KEY = "your_maps_javascript_api_key"
$env:GOOGLE_WEATHER_API_KEY = "your_server_side_web_services_key"
npm start
```

On Unix-like shells, use `export NODE_ENV=production` and export the two key variables before running `npm start`. The server serves the Vite build from `dist/`; it listens on `PORT` or `3000`.

## API proxy

The Express server calls Google services so that the server-side Weather API key stays out of client code. Weather requests use latitude and longitude query parameters; temperature-dependent endpoints also accept `units=METRIC` or `units=IMPERIAL`.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/weather/config` | `GET` | Reports whether the public Maps key is configured and returns that client key. Does not return the backend key. |
| `/api/weather/current` | `GET` | Current conditions for `lat` and `lng`. |
| `/api/weather/forecast/hourly` | `GET` | Hourly forecast (the app requests 24 hours). |
| `/api/weather/forecast/daily` | `GET` | Daily forecast (the app requests up to 10 days). |
| `/api/weather/forecast/minutes` | `GET` | Minute-based precipitation nowcast, where supported. |
| `/api/weather/history/hourly` | `GET` | Hourly observed history (the app requests the past 24 hours). |
| `/api/weather/alerts` | `GET` | Weather alerts for the requested coordinates. |
| `/api/weather/tiles/:mapType/:z/:x/:y` | `GET` | Proxies a supported weather map tile. `mapType` is restricted to the US and Europe precipitation layers. |
| `/api/geocode` | `GET` | Geocodes an `address` query to coordinates. |
| `/api/geocode/reverse` | `GET` | Reverse-geocodes `lat` and `lng` coordinates. |
| `/api/places/nearby` and `/api/places/searchNearby` | `GET`, `POST`, or `ALL` | Searches nearby places around `lat` and `lng` (optional `radius`, default 15,000 metres). |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Express server with Vite development middleware and hot module replacement. |
| `npm run build` | Builds the frontend into `dist/` and bundles the server as `dist/server.cjs`. |
| `npm start` | Starts the built server. Set `NODE_ENV=production` to serve the frontend build. |
| `npm run lint` | Runs the TypeScript compiler in no-emit mode for type checking. |

## Technology

- React 19 and TypeScript
- Vite 6
- Express 4
- Google Maps JavaScript API through `@vis.gl/react-google-maps`
- Google Maps Platform Weather, Places, and Geocoding APIs
- Tailwind CSS and Lucide icons

## License

Source files include Apache-2.0 license headers.
