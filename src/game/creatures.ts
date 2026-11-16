import * as THREE from 'three';
import { SEA_LEVEL } from './worldGen';

export type CreatureKind = 'sheep' | 'bird' | 'fish' | 'zombie' | 'skeleton' | 'spirit';

export interface CreatureEntity {
  id: number;
  kind: CreatureKind;
  hostile: boolean;
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  walkPhase: number;
  changeDirTimer: number;
  hp: number;
  attackCooldown: number;
  limbs: THREE.Object3D[];
  wings: THREE.Object3D[];
  orbiters: THREE.Object3D[];
}

function buildSheep(): { group: THREE.Group; limbs: THREE.Object3D[]; wings: THREE.Object3D[]; orbiters: THREE.Object3D[] } {
  const group = new THREE.Group();
  const woolMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.92, metalness: 0.0 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#d6b49e', roughness: 0.72, metalness: 0.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.25 });

  // Primary silhouette: wool body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.92), woolMat);
  body.position.set(0, 0.62, 0);
  body.castShadow = true;
  group.add(body);

  // Head + snout + ears
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.40, 0.44), skinMat);
  head.position.set(0, 0.78, 0.56);
  head.castShadow = true;
  group.add(head);

  const woolCap = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.34), woolMat);
  woolCap.position.set(0, 0.96, 0.52);
  group.add(woolCap);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), eyeMat);
  eyeL.position.set(-0.12, 0.82, 0.78);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  group.add(eyeL, eyeR);

  const legGeo = new THREE.BoxGeometry(0.16, 0.38, 0.16);
  const legOffsets: [number, number][] = [
    [-0.2, 0.28],
    [0.2, 0.28],
    [-0.2, -0.28],
    [0.2, -0.28],
  ];
  const limbs: THREE.Object3D[] = [];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, skinMat);
    leg.position.set(lx, 0.19, lz);
    leg.castShadow = true;
    group.add(leg);
    limbs.push(leg);
  }
  return { group, limbs, wings: [], orbiters: [] };
}

function buildBird(): { group: THREE.Group; limbs: THREE.Object3D[]; wings: THREE.Object3D[]; orbiters: THREE.Object3D[] } {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.65 });
  const wingMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.7 });
  const beakMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.45 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.42), bodyMat);
  body.position.set(0, 0.16, 0);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), bodyMat);
  head.position.set(0, 0.26, 0.24);
  group.add(head);

  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.14), beakMat);
  beak.position.set(0, 0.24, 0.38);
  group.add(beak);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.22), wingMat);
  tail.position.set(0, 0.18, -0.28);
  group.add(tail);

  const wingGeo = new THREE.BoxGeometry(0.42, 0.04, 0.24);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.32, 0.22, 0.02);
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.32, 0.22, 0.02);
  group.add(wingL, wingR);

  return { group, limbs: [], wings: [wingL, wingR], orbiters: [] };
}

function buildFish(): { group: THREE.Group; limbs: THREE.Object3D[]; wings: THREE.Object3D[]; orbiters: THREE.Object3D[] } {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.35, metalness: 0.15 });
  const finMat = new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.52), bodyMat);
  body.position.set(0, 0.15, 0);
  group.add(body);

  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.26), finMat);
  dorsal.position.set(0, 0.32, -0.02);
  group.add(dorsal);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.2), finMat);
  tail.position.set(0, 0.15, -0.34);
  group.add(tail);

  return { group, limbs: [], wings: [tail], orbiters: [] };
}

function buildZombie(): { group: THREE.Group; limbs: THREE.Object3D[]; wings: THREE.Object3D[]; orbiters: THREE.Object3D[] } {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: '#4d7c3f', roughness: 0.78 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#312e81', roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.28), shirtMat);
  torso.position.set(0, 1.06, 0);
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
  head.position.set(0, 1.65, 0);
  head.castShadow = true;
  group.add(head);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), eyeMat);
  eyeL.position.set(-0.11, 1.68, 0.23);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;
  group.add(eyeL, eyeR);

  const armGeo = new THREE.BoxGeometry(0.2, 0.64, 0.2);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.36, 1.24, 0.26);
  armL.rotation.x = -Math.PI / 2.2;
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.36, 1.24, 0.26);
  armR.rotation.x = -Math.PI / 2.2;
  group.add(armL, armR);

  const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.14, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0.14, 0.35, 0);
  group.add(legL, legR);

  return { group, limbs: [legL, legR], wings: [], orbiters: [] };
}

function buildSkeleton(): { group: THREE.Group; limbs: THREE.Object3D[]; wings: THREE.Object3D[]; orbiters: THREE.Object3D[] } {
  const group = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.55, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 });
  const bowMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.22), boneMat);
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  group.add(torso);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), boneMat);
  skull.position.set(0, 1.62, 0);
  skull.castShadow = true;
  group.add(skull);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.04), darkMat);
  eyeL.position.set(-0.1, 1.64, 0.21);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  group.add(eyeL, eyeR);

  const armGeo = new THREE.BoxGeometry(0.12, 0.62, 0.12);
  const armL = new THREE.Mesh(armGeo, boneMat);
  armL.position.set(-0.29, 1.15, 0.12);
  armL.rotation.x = -0.6;
  const armR = new THREE.Mesh(armGeo, boneMat);
  armR.position.set(0.29, 1.15, 0.22);
  armR.rotation.x = -1.2;
  group.add(armL, armR);

  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.08), bowMat);
  bow.position.set(0.32, 1.2, 0.46);
  group.add(bow);

  const legGeo = new THREE.BoxGeometry(0.13, 0.7, 0.13);
  const legL = new THREE.Mesh(legGeo, boneMat);
  legL.position.set(-0.12, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, boneMat);
  legR.position.set(0.12, 0.35, 0);
  group.add(legL, legR);

  return { group, limbs: [legL, legR], wings: [], orbiters: [] };
}

function buildSpirit(): { group: THREE.Group; limbs: THREE.Object3D[]; wings: THREE.Object3D[]; orbiters: THREE.Object3D[] } {
  const group = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0ea5e9',
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.6,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: '#1e1b4b',
    roughness: 0.35,
    metalness: 0.75,
  });

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.46), coreMat);
  core.position.set(0, 1.0, 0);
  group.add(core);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.28, 0.56), armorMat);
  crown.position.set(0, 1.56, 0);
  group.add(crown);

  const orbiters: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.16), coreMat);
    const angle = (i / 4) * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.65, 1.0, Math.sin(angle) * 0.65);
    group.add(shard);
    orbiters.push(shard);
  }

  return { group, limbs: [], wings: [], orbiters };
}

export class CreatureManager {
  private entities: CreatureEntity[] = [];
  private nextId = 1;
  private parentGroup = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.parentGroup);
  }

  public getCreatures(): CreatureEntity[] {
    return this.entities;
  }

  public spawnInitial(
    playerPos: THREE.Vector3,
    getGroundY: (x: number, z: number) => number,
    isWaterAt: (x: number, y: number, z: number) => boolean
  ) {
    this.clear();
    for (let i = 0; i < 16; i++) {
      this.trySpawnNear(playerPos, getGroundY, isWaterAt, false);
    }
  }

  public clear() {
    for (const e of this.entities) {
      this.parentGroup.remove(e.group);
    }
    this.entities = [];
  }

  private trySpawnNear(
    playerPos: THREE.Vector3,
    getGroundY: (x: number, z: number) => number,
    isWaterAt: (x: number, y: number, z: number) => boolean,
    isNight: boolean
  ) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 34;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const groundY = getGroundY(Math.floor(x), Math.floor(z));
    const inWater = isWaterAt(Math.floor(x), SEA_LEVEL, Math.floor(z));

    let kind: CreatureKind = 'sheep';
    let y = groundY;
    let hostile = false;

    const r = Math.random();
    if (inWater && groundY < SEA_LEVEL - 2) {
      kind = 'fish';
      y = groundY + 1 + Math.random() * Math.max(1, SEA_LEVEL - groundY - 2);
    } else if (r < 0.24) {
      kind = 'bird';
      y = Math.max(groundY, SEA_LEVEL) + 6 + Math.random() * 8;
    } else if (isNight && r < 0.65) {
      kind = r < 0.44 ? 'zombie' : 'skeleton';
      hostile = true;
    } else if (r > 0.9) {
      kind = 'spirit';
    } else {
      kind = 'sheep';
    }

    const built =
      kind === 'sheep'
        ? buildSheep()
        : kind === 'bird'
          ? buildBird()
          : kind === 'fish'
            ? buildFish()
            : kind === 'zombie'
              ? buildZombie()
              : kind === 'skeleton'
                ? buildSkeleton()
                : buildSpirit();

    built.group.position.set(x, y, z);
    this.parentGroup.add(built.group);

    this.entities.push({
      id: this.nextId++,
      kind,
      hostile,
      group: built.group,
      position: built.group.position,
      velocity: new THREE.Vector3(),
      yaw: Math.random() * Math.PI * 2,
      walkPhase: Math.random() * Math.PI * 2,
      changeDirTimer: 1 + Math.random() * 4,
      hp: hostile ? 20 : 12,
      attackCooldown: 0,
      limbs: built.limbs,
      wings: built.wings,
      orbiters: built.orbiters,
    });
  }

  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    isNight: boolean,
    isSurvival: boolean,
    getGroundY: (x: number, z: number) => number,
    isWaterAt: (x: number, y: number, z: number) => boolean,
    onDamagePlayer: (dmg: number) => void
  ) {
    // Maintain healthy population around player
    if (this.entities.length < 18) {
      this.trySpawnNear(playerPos, getGroundY, isWaterAt, isNight);
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const distToPlayer = e.position.distanceTo(playerPos);

      // Despawn far creatures
      if (distToPlayer > 72) {
        this.parentGroup.remove(e.group);
        this.entities.splice(i, 1);
        continue;
      }

      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.changeDirTimer -= dt;

      let speed = e.kind === 'bird' ? 5.2 : e.kind === 'fish' ? 2.6 : e.hostile ? 2.5 : 1.7;

      if (e.hostile && isSurvival && distToPlayer < 18) {
        const dx = playerPos.x - e.position.x;
        const dz = playerPos.z - e.position.z;
        e.yaw = Math.atan2(dx, dz);
        if (distToPlayer < 1.85 && e.attackCooldown <= 0) {
          onDamagePlayer(e.kind === 'zombie' ? 2 : 1);
          e.attackCooldown = 1.4;
        }
      } else if (e.changeDirTimer <= 0) {
        e.changeDirTimer = 2 + Math.random() * 4;
        e.yaw += (Math.random() - 0.5) * Math.PI * 1.2;
      }

      const moveX = Math.sin(e.yaw) * speed * dt;
      const moveZ = Math.cos(e.yaw) * speed * dt;

      if (e.kind === 'bird') {
        e.position.x += moveX;
        e.position.z += moveZ;
        const floorY = Math.max(getGroundY(Math.floor(e.position.x), Math.floor(e.position.z)), SEA_LEVEL);
        const targetY = floorY + 8 + Math.sin(elapsed * 1.4 + e.id) * 2.2;
        e.position.y = THREE.MathUtils.lerp(e.position.y, targetY, dt * 2.5);
        const flap = Math.sin(elapsed * 13 + e.id) * 0.65;
        if (e.wings[0]) e.wings[0].rotation.z = flap;
        if (e.wings[1]) e.wings[1].rotation.z = -flap;
      } else if (e.kind === 'fish') {
        const nx = e.position.x + moveX;
        const nz = e.position.z + moveZ;
        if (isWaterAt(Math.floor(nx), SEA_LEVEL, Math.floor(nz))) {
          e.position.x = nx;
          e.position.z = nz;
        } else {
          e.yaw += Math.PI * 0.85;
        }
        const gY = getGroundY(Math.floor(e.position.x), Math.floor(e.position.z));
        e.position.y = THREE.MathUtils.clamp(
          e.position.y + Math.sin(elapsed * 2 + e.id) * 0.3 * dt,
          gY + 0.6,
          SEA_LEVEL - 0.5
        );
        if (e.wings[0]) {
          e.wings[0].rotation.y = Math.sin(elapsed * 9 + e.id) * 0.45;
        }
      } else if (e.kind === 'spirit') {
        e.position.x += moveX * 0.7;
        e.position.z += moveZ * 0.7;
        const gY = getGroundY(Math.floor(e.position.x), Math.floor(e.position.z));
        e.position.y = THREE.MathUtils.lerp(e.position.y, gY + 1.1 + Math.sin(elapsed * 2.2 + e.id) * 0.4, dt * 3);
        e.orbiters.forEach((shard, idx) => {
          const a = elapsed * 2.4 + (idx / e.orbiters.length) * Math.PI * 2;
          shard.position.x = Math.cos(a) * 0.68;
          shard.position.z = Math.sin(a) * 0.68;
          shard.position.y = 1.0 + Math.sin(elapsed * 3 + idx) * 0.14;
          shard.rotation.y = -a;
        });
      } else {
        // Land creatures (sheep, zombie, skeleton)
        const nx = e.position.x + moveX;
        const nz = e.position.z + moveZ;
        const curG = getGroundY(Math.floor(e.position.x), Math.floor(e.position.z));
        const nextG = getGroundY(Math.floor(nx), Math.floor(nz));
        const nextInWater = isWaterAt(Math.floor(nx), SEA_LEVEL, Math.floor(nz));

        if (Math.abs(nextG - curG) <= 1.2 && (!nextInWater || e.hostile)) {
          e.position.x = nx;
          e.position.z = nz;
          e.position.y = THREE.MathUtils.lerp(e.position.y, nextG, Math.min(1, dt * 12));
        } else {
          e.yaw += Math.PI * 0.7;
        }

        e.walkPhase += dt * speed * 3.8;
        const swing = Math.sin(e.walkPhase) * 0.55;
        e.limbs.forEach((leg, idx) => {
          leg.rotation.x = idx % 2 === 0 ? swing : -swing;
        });
      }

      e.group.rotation.y = e.yaw;
    }
  }
}
