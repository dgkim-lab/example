import { createThreeSculptureRenderer, type ThreeSculptureRenderer } from "./three-scene";

export type MapTarget = google.maps.LatLngAltitudeLiteral;

const defaultMapView = {
  zoom: 18.2,
  tilt: 67.5,
  heading: 35,
} as const;

type LoadGoogleMapsOptions = {
  apiKey: string;
  callbackName: string;
  onError: () => void;
};

export function loadGoogleMapsApi({ apiKey, callbackName, onError }: LoadGoogleMapsOptions) {
  const script = document.createElement("script");
  const params = new URLSearchParams({
    key: apiKey,
    v: "weekly",
    callback: callbackName,
    loading: "async",
  });

  script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
  script.async = true;
  script.onerror = onError;
  document.head.append(script);
}

export function createGoogleMap(element: HTMLElement, mapId: string, center: MapTarget) {
  return new google.maps.Map(element, {
    center,
    zoom: defaultMapView.zoom,
    heading: defaultMapView.heading,
    tilt: defaultMapView.tilt,
    mapId,
    renderingType: google.maps.RenderingType.VECTOR,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
    gestureHandling: "greedy",
  });
}

export function resetMapView(map: google.maps.Map, center: MapTarget) {
  map.moveCamera({
    center,
    zoom: defaultMapView.zoom,
    tilt: defaultMapView.tilt,
    heading: defaultMapView.heading,
  });
}

function getDistanceMeters(a: MapTarget, b: MapTarget) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function attachSculptureOverlay(map: google.maps.Map, position: MapTarget) {
  let sculptureRenderer: ThreeSculptureRenderer | undefined;
  let sculptureVisible = true;
  let cubeTargets: MapTarget[] = [];
  const cubeHitRadiusMeters = 8;

  const overlay = new google.maps.WebGLOverlayView();

  function syncRendererState() {
    sculptureRenderer?.setSculptureVisible(sculptureVisible);
    overlay.requestRedraw();
  }

  overlay.onAdd = () => {
    // Scene setup happens after the map provides its shared WebGL context.
  };

  overlay.onContextRestored = ({ gl }) => {
    sculptureRenderer = createThreeSculptureRenderer(gl);
    syncRendererState();
  };

  overlay.onDraw = ({ gl, transformer }) => {
    const rotation = new Float32Array([90, 0, 0]);
    const scale = new Float32Array([1, 1, 1]);
    const matrix = transformer.fromLatLngAltitude(position, rotation, scale);
    const cubeMatrices = cubeTargets.map((cube) => transformer.fromLatLngAltitude(cube, rotation, scale));

    sculptureRenderer?.render(matrix, cubeMatrices);
    gl.disable(gl.SCISSOR_TEST);
  };

  overlay.onContextLost = () => {
    sculptureRenderer?.dispose();
    sculptureRenderer = undefined;
  };

  overlay.onRemove = () => {
    sculptureRenderer?.dispose();
    sculptureRenderer = undefined;
  };

  overlay.setMap(map);

  const clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) {
      return;
    }

    const clickedTarget: MapTarget = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      altitude: position.altitude,
    };
    const cubeIndex = cubeTargets.findIndex((cube) => getDistanceMeters(cube, clickedTarget) <= cubeHitRadiusMeters);

    if (cubeIndex >= 0) {
      cubeTargets = cubeTargets.filter((_, index) => index !== cubeIndex);
    } else {
      cubeTargets = [...cubeTargets, clickedTarget];
    }

    syncRendererState();
  });

  return {
    setVisible(visible: boolean) {
      sculptureVisible = visible;
      syncRendererState();
    },
    clearCubes() {
      cubeTargets = [];
      syncRendererState();
    },
    dispose() {
      clickListener.remove();
      overlay.setMap(null);
    },
  };
}
