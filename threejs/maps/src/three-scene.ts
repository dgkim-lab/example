import * as THREE from "three";

export type ThreeSculptureRenderer = {
  render: (projectionMatrix: ArrayLike<number>, cubeProjectionMatrices: ArrayLike<number>[]) => void;
  setSculptureVisible: (visible: boolean) => void;
  dispose: () => void;
};

export function createPyramidSculpture() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.ConeGeometry(18, 26, 4),
    new THREE.MeshStandardMaterial({
      color: 0x1f78d1,
      roughness: 0.42,
      metalness: 0.18,
    }),
  );
  base.geometry.translate(0, 13, 0);
  base.rotation.y = Math.PI / 4;
  group.add(base);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 32, 24),
    new THREE.MeshStandardMaterial({
      color: 0xf6c344,
      roughness: 0.28,
      metalness: 0.35,
    }),
  );
  sphere.position.y = 32;
  group.add(sphere);

  return group;
}

export function createThreeSculptureRenderer(gl: WebGLRenderingContext): ThreeSculptureRenderer {
  const scene = new THREE.Scene();
  const cubeScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  scene.add(new THREE.AmbientLight(0xffffff, 0.74));
  cubeScene.add(new THREE.AmbientLight(0xffffff, 0.74));

  const sun = new THREE.DirectionalLight(0xffffff, 1.45);
  sun.position.set(60, 110, 80);
  scene.add(sun);
  cubeScene.add(sun.clone());

  const sculpture = createPyramidSculpture();
  scene.add(sculpture);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(8, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xd94f3d,
      roughness: 0.36,
      metalness: 0.08,
    }),
  );
  cube.geometry.translate(0, 4, 0);
  cubeScene.add(cube);

  const renderer = new THREE.WebGLRenderer({
    canvas: gl.canvas,
    context: gl,
    ...gl.getContextAttributes(),
  });
  renderer.autoClear = false;
  renderer.setPixelRatio(window.devicePixelRatio);

  return {
    render(projectionMatrix, cubeProjectionMatrices) {
      camera.projectionMatrix = new THREE.Matrix4().fromArray(projectionMatrix);
      renderer.render(scene, camera);

      cubeProjectionMatrices.forEach((cubeProjectionMatrix) => {
        camera.projectionMatrix = new THREE.Matrix4().fromArray(cubeProjectionMatrix);
        renderer.render(cubeScene, camera);
      });

      renderer.resetState();
    },
    setSculptureVisible(visible) {
      sculpture.visible = visible;
    },
    dispose() {
      renderer.dispose();
    },
  };
}
