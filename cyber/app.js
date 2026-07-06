// ============================================================
// FIWOJ.PL — WebGL core: rozbity kryształ + bloom + partykle
// ============================================================
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const canvas = document.getElementById("gl");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050a, 0.16);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

// --- Rozbity kryształ: Icosahedron z deformacją wierzchołków wzdłuż wektora pozycji ---
// Displacement = pos * (1 + noise*amp). Noise to suma sprzężonych funkcji trygonometrycznych
// (tani, deterministyczny szum proceduralny — bez zależności zewnętrznych).
function noise3(x, y, z) {
  return (Math.sin(x * 1.7 + y * 2.3) * Math.cos(z * 1.9 - x * 0.7)
        + Math.sin(y * 2.1 + z * 1.3) + Math.cos(z * 1.1 + x * 2.4)) * 0.5;
}
function shatter(geometry, amp) {
  const p = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * 1.4, v.y * 1.4, v.z * 1.4);
    const s = 1 + n * amp;
    p.setXYZ(i, v.x * s, v.y * s, v.z * s);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const crystal = new THREE.Group();
// Dwie przenikające się bryły w komplementarnych neonach → dwukolorowy glow po bloomie.
const meshCyan = new THREE.Mesh(
  shatter(new THREE.IcosahedronGeometry(1.5, 6), 0.32),
  new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.9 })
);
const meshMag = new THREE.Mesh(
  shatter(new THREE.IcosahedronGeometry(1.15, 4), 0.5),
  new THREE.MeshBasicMaterial({ color: 0xff00ea, wireframe: true, transparent: true, opacity: 0.75 })
);
meshMag.rotation.set(0.6, 1.1, 0);
crystal.add(meshCyan, meshMag);
scene.add(crystal);

// --- Floating Dust: system partykli ---
const COUNT = 900;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT * 3; i++) positions[i] = (Math.random() - 0.5) * 22;
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0x8a2be2, size: 0.03, transparent: true, opacity: 0.7,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(dust);

// --- Post-processing: bloom ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.6, 0.6, 0.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// --- Parallax kursora z lerpem ---
// current += (target - current) * k  → wygładzone dociąganie kamery/sceny do kursora.
const mouse = { tx: 0, ty: 0, x: 0, y: 0 };
addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

const clock = new THREE.Clock();
function loop() {
  const t = clock.getElapsedTime();
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;

  crystal.rotation.y = t * 0.15 + mouse.x * 0.4;
  crystal.rotation.x = t * 0.08 + mouse.y * 0.3;
  meshMag.rotation.z = t * 0.12;

  dust.rotation.y = t * 0.02;
  camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.04;
  camera.position.y += (-mouse.y * 0.6 - camera.position.y) * 0.04;
  camera.lookAt(scene.position);

  composer.render();
  requestAnimationFrame(loop);
}
loop();

// --- Resize ---
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}, { passive: true });

// --- GSAP: sekwencja wejścia UI ---
gsap.set('[data-anim="up"], [data-anim="shard"]', { opacity: 0, y: 30 });
gsap.set('[data-anim="title"]', { opacity: 0, scale: 1.15, filter: "blur(14px)" });
gsap.timeline({ defaults: { ease: "power3.out" } })
  .to('[data-anim="title"]', { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.1 }, 0.2)
  .to('.eyebrow', { opacity: 1, y: 0, duration: 0.7 }, 0.4)
  .to('.subtitle', { opacity: 1, y: 0, duration: 0.7 }, 0.6)
  .to('[data-anim="shard"]', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.75)
  .to('.cta', { opacity: 1, y: 0, duration: 0.6 }, 1.1);
