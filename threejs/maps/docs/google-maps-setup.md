# Google Maps Setup

This project needs two Google Maps Platform values:

- `VITE_GOOGLE_MAPS_API_KEY`: authenticates Maps JavaScript API requests.
- `VITE_GOOGLE_MAPS_MAP_ID`: enables the vector map required by `WebGLOverlayView`.

## Create An API Key

1. Open Google Cloud Console:

   https://console.cloud.google.com/google/maps-apis/credentials

2. Select or create a Google Cloud project.

3. Enable billing for the project.

4. Enable **Maps JavaScript API**:

   https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

5. Go back to **Google Maps Platform > Credentials**.

6. Click **Create credentials > API key**.

7. Copy the generated API key.

8. Open the API key details and set **Application restrictions** to **Websites**.

9. Add local development referrers:

   ```text
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   ```

10. Set **API restrictions** to **Restrict key**.

11. Allow only:

   ```text
   Maps JavaScript API
   ```

12. Save the API key.

## Create A Map ID

1. Open **Google Maps Platform > Map Management**:

   https://console.cloud.google.com/google/maps-apis/studio/maps

2. Click **Create map ID**.

3. Enter a name, for example:

   ```text
   threejs-webgl-overlay-local
   ```

4. Set **Map type** to **JavaScript**.

5. Select **Vector** rendering.

6. Enable **Tilt** and **Rotation** if those options are shown.

7. Save the Map ID.

8. Copy the generated Map ID.

## Configure The Project

Create `.env` from the example:

```sh
cp .env.example .env
```

Set both values:

```sh
VITE_GOOGLE_MAPS_API_KEY=your_api_key
VITE_GOOGLE_MAPS_MAP_ID=your_map_id
```

Restart the dev server after editing `.env`:

```sh
npm run dev
```

## Cost Notes

For this sample, map page loads are billed as **Dynamic Maps**. The Three.js overlay does not add Google Maps cost by itself.

Keep the API key restricted and set a billing budget alert in Google Cloud Console while testing.

Official references:

- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://developers.google.com/maps/documentation/javascript/map-ids/get-map-id
- https://developers.google.com/maps/documentation/javascript/webgl/webgl-overlay-view
- https://developers.google.com/maps/api-security-best-practices
