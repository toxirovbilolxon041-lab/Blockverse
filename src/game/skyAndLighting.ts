import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface SkyRig {
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  ambientLight: THREE.AmbientLight;
  skyDome: THREE.Mesh;
  stars: THREE.Points;
  sunDisc: THREE.Mesh;
  moonDisc: THREE.Mesh;
  fog: THREE.FogExp2;
  update: (timeOfDay: number, playerPos: THREE.Vector3, renderDistanceChunks: number, elapsed: number) => void;
  dispose: () => void;
}

const SKY_VERTEX = `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAGMENT = `
  varying vec3 vWorldDir;
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform float uSunsetGlow;

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, -0.2, 1.0);
    float horizonBlend = pow(1.0 - max(h, 0.0), 2.4);
    vec3 sky = mix(uTopColor, uHorizonColor, horizonBlend);

    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float halo = pow(sunDot, 12.0) * (0.25 + uSunsetGlow * 0.55);
    float core = pow(sunDot, 180.0) * 0.9;
    vec3 sunTint = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.45, 0.18), uSunsetGlow);
    sky += sunTint * (halo + core);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

// Pre-allocated scratch colors to avoid per-frame GC
const _topDay = new THREE.Color('#2563eb');
const _topSunset = new THREE.Color('#312e81');
const _topNight = new THREE.Color('#050816');
const _horDay = new THREE.Color('#bae6fd');
const _horSunset = new THREE.Color('#f97316');
const _horNight = new THREE.Color('#0f172a');

const _sunDayColor = new THREE.Color('#fff7ed');
const _sunSetColor = new THREE.Color('#fb923c');
const _moonColor = new THREE.Color('#93c5fd');

const _curTop = new THREE.Color();
const _curHor = new THREE.Color();
const _sunDir = new THREE.Vector3();

export function createSkyAndLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): SkyRig {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.38;
  pmremGenerator.dispose();

  const fog = new THREE.FogExp2('#bae6fd', 0.0085);
  scene.fog = fog;

  const hemiLight = new THREE.HemisphereLight('#bae6fd', '#3f3f46', 0.72);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight('#cbd5e1', 0.25);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight('#fff7ed', 1.45);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 220;
  const d = 58;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const skyGeo = new THREE.SphereGeometry(420, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: {
      uTopColor: { value: new THREE.Color('#2563eb') },
      uHorizonColor: { value: new THREE.Color('#bae6fd') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunsetGlow: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  // Starfield
  const starCount = 1200;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.92 + 0.05);
    const r = 390;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#f8fafc',
    size: 1.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // Sun & Moon orbs
  const sunDisc = new THREE.Mesh(
    new THREE.BoxGeometry(26, 26, 26),
    new THREE.MeshBasicMaterial({ color: '#fef08a', fog: false })
  );
  scene.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({ color: '#e2e8f0', fog: false })
  );
  scene.add(moonDisc);

  const update = (timeOfDay: number, playerPos: THREE.Vector3, renderDistanceChunks: number, elapsed: number) => {
    // timeOfDay in [0, 1): 0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 0.0 = midnight
    const angle = (timeOfDay - 0.25) * Math.PI * 2;
    const sx = Math.cos(angle);
    const sy = Math.sin(angle);
    const sz = 0.28;
    _sunDir.set(sx, sy, sz).normalize();

    const sunElev = _sunDir.y; // -1..1
    const dayFactor = THREE.MathUtils.smoothstep(sunElev, -0.15, 0.35);
    const sunsetBand = Math.exp(-Math.pow((sunElev - 0.03) / 0.16, 2));

    _curTop.copy(_topNight).lerp(_topDay, dayFactor).lerp(_topSunset, sunsetBand * 0.65);
    _curHor.copy(_horNight).lerp(_horDay, dayFactor).lerp(_horSunset, sunsetBand * 0.85);

    skyMat.uniforms.uTopColor.value.copy(_curTop);
    skyMat.uniforms.uHorizonColor.value.copy(_curHor);
    skyMat.uniforms.uSunDir.value.copy(_sunDir);
    skyMat.uniforms.uSunsetGlow.value = sunsetBand;

    fog.color.copy(_curHor);
    const maxDist = Math.max(48, renderDistanceChunks * 16);
    fog.density = 1.55 / maxDist;

    skyDome.position.copy(playerPos);
    stars.position.copy(playerPos);
    stars.rotation.y = elapsed * 0.004;
    starMat.opacity = Math.max(0, 1 - dayFactor * 1.45) * 0.9;

    sunDisc.position.copy(playerPos).addScaledVector(_sunDir, 340);
    sunDisc.lookAt(playerPos);
    sunDisc.visible = sunElev > -0.2;

    moonDisc.position.copy(playerPos).addScaledVector(_sunDir, -340);
    moonDisc.lookAt(playerPos);
    moonDisc.visible = sunElev < 0.2;

    // Snap shadow camera target to 2-block grid to eliminate shadow shimmering
    const snapX = Math.round(playerPos.x / 2) * 2;
    const snapZ = Math.round(playerPos.z / 2) * 2;
    sunLight.target.position.set(snapX, 20, snapZ);
    sunLight.target.updateMatrixWorld();

    if (sunElev >= -0.05) {
      sunLight.position.set(snapX + _sunDir.x * 95, 20 + Math.max(12, _sunDir.y * 95), snapZ + _sunDir.z * 95);
      sunLight.color.copy(_sunDayColor).lerp(_sunSetColor, sunsetBand);
      sunLight.intensity = 0.4 + dayFactor * 1.15;
    } else {
      // Moonlight from opposite side
      sunLight.position.set(snapX - _sunDir.x * 95, 20 + Math.max(14, -_sunDir.y * 95), snapZ - _sunDir.z * 95);
      sunLight.color.copy(_moonColor);
      sunLight.intensity = 0.35;
    }

    hemiLight.color.copy(_curHor);
    hemiLight.intensity = 0.32 + dayFactor * 0.45;
    ambientLight.intensity = 0.22 + dayFactor * 0.14;
    scene.environmentIntensity = 0.18 + dayFactor * 0.28;
  };

  const dispose = () => {
    skyGeo.dispose();
    skyMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    sunDisc.geometry.dispose();
    (sunDisc.material as THREE.Material).dispose();
    moonDisc.geometry.dispose();
    (moonDisc.material as THREE.Material).dispose();
    envTex.dispose();
  };

  return {
    sunLight,
    hemiLight,
    ambientLight,
    skyDome,
    stars,
    sunDisc,
    moonDisc,
    fog,
    update,
    dispose,
  };
}
