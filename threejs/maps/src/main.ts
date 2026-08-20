import {
  attachSculptureOverlay,
  createGoogleMap,
  loadGoogleMapsApi,
  resetMapView,
  type MapTarget,
} from "./google-maps";
import "./style.css";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

const sculpturePosition: MapTarget = {
  lat: 35.0168707372,
  lng: 126.7904498881,
  altitude: 18,
};

declare global {
  interface Window {
    initMap: () => void;
  }
}

function setStatus(message: string) {
  const status = document.querySelector<HTMLDivElement>("#status");
  if (status) {
    status.textContent = message;
  }
}

function loadGoogleMaps() {
  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
    setStatus("Set VITE_GOOGLE_MAPS_API_KEY in .env, then restart npm run dev.");
    return;
  }

  if (!mapId || mapId === "YOUR_GOOGLE_MAPS_MAP_ID") {
    setStatus("Set VITE_GOOGLE_MAPS_MAP_ID in .env to a vector map ID, then restart npm run dev.");
    return;
  }

  loadGoogleMapsApi({
    apiKey,
    callbackName: "initMap",
    onError: () => setStatus("Google Maps failed to load. Check the API key and network."),
  });
}

window.initMap = async () => {
  const mapElement = document.querySelector<HTMLDivElement>("#map");

  if (!mapElement) {
    setStatus("Map container is missing.");
    return;
  }

  if (!mapId || mapId === "YOUR_GOOGLE_MAPS_MAP_ID") {
    setStatus("Set VITE_GOOGLE_MAPS_MAP_ID in .env to a vector map ID, then restart npm run dev.");
    return;
  }

  const map = createGoogleMap(mapElement, mapId, sculpturePosition);
  const overlay = attachSculptureOverlay(map, sculpturePosition);

  document.querySelector<HTMLButtonElement>("#reset-view")?.addEventListener("click", () => {
    resetMapView(map, sculpturePosition);
  });

  document.querySelector<HTMLInputElement>("#sculpture-visible")?.addEventListener("change", (event) => {
    const checkbox = event.currentTarget as HTMLInputElement;
    overlay.setVisible(checkbox.checked);
  });

  document.querySelector<HTMLButtonElement>("#clear-cubes")?.addEventListener("click", () => {
    overlay.clearCubes();
  });

  setStatus("");
};

loadGoogleMaps();
