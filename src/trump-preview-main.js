import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { assetUrl } from './assetUrl.js';

const canvas = document.getElementById('c');
const status = document.getElementById('status');
const logEl = document.getElementById('log');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2438);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
camera.position.set(1.2, 1.4, 3.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const key = new THREE.DirectionalLight(0xfff2d8, 1.4);
key.position.set(2.2, 3.5, 3.2);
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
fill.position.set(-2.5, 1.2, -1.5);
scene.add(fill);
scene.add(new THREE.GridHelper(6, 12, 0x445566, 0x334455));

const root = new THREE.Group();
scene.add(root);

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function clearRoot() {
  while (root.children.length) root.remove(root.children[0]);
  logEl.textContent = '';
}

function meshBounds(model) {
  const box = new THREE.Box3();
  let any = false;
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    o.geometry.computeBoundingBox();
    if (!o.geometry.boundingBox) return;
    const b = o.geometry.boundingBox.clone();
    b.applyMatrix4(o.matrixWorld);
    if (!any) {
      box.copy(b);
      any = true;
    } else box.union(b);
  });
  if (!any) box.setFromObject(model);
  return box;
}

function fit(model) {
  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  model.updateMatrixWorld(true);
  const box = meshBounds(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 2.0 / Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(s);
  model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  controls.target.set(0, size.y * s * 0.55, 0);
  camera.position.set(1.6, size.y * s * 0.65, 3.4);
  controls.update();
  return { size, s };
}

function dump(model) {
  const lines = [];
  model.traverse((o) => {
    if (o.isMesh) {
      const n = o.geometry?.attributes?.position?.count || 0;
      const morphs = o.morphTargetDictionary ? Object.keys(o.morphTargetDictionary) : [];
      lines.push(`MESH ${o.name || '(anon)'} verts=${n} morphs=[${morphs.join(',')}]`);
    } else if (o.isBone) {
      lines.push(`BONE ${o.name}`);
    } else if (o.name) {
      lines.push(`${o.type} ${o.name}`);
    }
  });
  logEl.textContent = lines.join('\n');
}

async function loadDenys() {
  clearRoot();
  status.textContent = 'Loading Denys Trump FBX…';
  try {
    const fbx = await new FBXLoader().loadAsync(assetUrl('models/trump-denys.fbx'));
    let tex = null;
    try {
      tex = await new THREE.TextureLoader().loadAsync(assetUrl('models/trump-denys.png'));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
    } catch (_) {
      /* ok */
    }
    fbx.traverse((o) => {
      if (o.isSkinnedMesh || o.isMesh) {
        o.frustumCulled = false;
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.isSkinnedMesh && o.skeleton) o.skeleton.update();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const next = mats.map(
          (m) =>
            new THREE.MeshStandardMaterial({
              map: tex || m?.map || null,
              color: 0xffffff,
              roughness: 0.55,
              metalness: 0.05,
              side: THREE.DoubleSide,
            })
        );
        o.material = next.length === 1 ? next[0] : next;
      }
    });
    const { size, s } = fit(fbx);
    root.add(fbx);
    dump(fbx);
    status.textContent = `Denys Trump — raw ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} scale ${s.toFixed(4)}`;
  } catch (e) {
    status.textContent = 'Denys load failed: ' + e;
    console.error(e);
  }
}

async function loadBigT() {
  clearRoot();
  status.textContent = 'Loading Big T GLB…';
  try {
    const gltf = await new GLTFLoader().loadAsync(assetUrl('models/big-t.glb'));
    const model = gltf.scene;
    const { size, s } = fit(model);
    root.add(model);
    dump(model);
    status.textContent = `Big T — raw ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} scale ${s.toFixed(3)}`;
  } catch (e) {
    status.textContent = 'Big T load failed: ' + e;
    console.error(e);
  }
}

async function loadMeshy() {
  clearRoot();
  status.textContent = 'Loading Meshy Trump GLB…';
  try {
    const gltf = await new GLTFLoader().loadAsync(assetUrl('models/trump-meshy.glb'));
    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
      }
    });
    const { size, s } = fit(model);
    root.add(model);
    dump(model);
    status.textContent = `Meshy Trump — raw ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} scale ${s.toFixed(3)}`;
  } catch (e) {
    status.textContent = 'Meshy load failed: ' + e;
    console.error(e);
  }
}

document.getElementById('btn-meshy').addEventListener('click', () => loadMeshy());
document.getElementById('btn-denys').addEventListener('click', () => loadDenys());
document.getElementById('btn-bigt').addEventListener('click', () => loadBigT());
loadMeshy();

(function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
})();
