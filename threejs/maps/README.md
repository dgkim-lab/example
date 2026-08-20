# Three.js Google Maps Pyramid

Local Vite sample that renders a Three.js pyramid and sphere sculpture on top of Google Maps at 빛가람전망대 in Bitgaram-dong, Naju.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env` from the example:

   ```sh
   cp .env.example .env
   ```

   See [docs/google-maps-setup.md](docs/google-maps-setup.md) to create the required API key and vector map ID.

3. Start the dev server:

   ```sh
   npm run dev
   ```

The app centers on 빛가람전망대 in Bitgaram-dong at `35.0168707372, 126.7904498881`. It uses Google Maps `WebGLOverlayView` with a Three.js renderer sharing the map WebGL context.
