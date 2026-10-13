import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { makeBike } from './game/models';
import { createWorld } from './game/world';
import { CONFIG } from './game/config';
import { freshState, step, distanceProgress, type Controls, type BikeState } from './game/physics';

export type Mode = 'ready' | 'running' | 'paused' | 'finished';
type Props = {
  mode: Mode;
  restart: number;
  touch: Controls;
  onUpdate: (s: BikeState) => void;
  onFinish: (s: BikeState) => void;
  onPause: () => void;
};

// Obstáculos adicionales: los originales de config.ts siguen funcionando.
// X = posición lateral. Z negativo = avance hacia la meta.
// halfWidth y halfDepth son la mitad del ancho y de la profundidad.
type ExtraObstacle = {
  kind: 'barrel' | 'log' | 'barrier';
  x: number; z: number; halfWidth: number; halfDepth: number;
};
export const EXTRA_OBSTACLES: ExtraObstacle[] = [
  { kind: 'barrel', x: 4, z: -17, halfWidth: 0.65, halfDepth: 0.65 },
  { kind: 'log', x: -2, z: -54, halfWidth: 2.2, halfDepth: 0.5 },
  { kind: 'barrier', x: 2, z: -89, halfWidth: 1.5, halfDepth: 0.45 },
  { kind: 'barrel', x: -4, z: -115, halfWidth: 0.65, halfDepth: 0.65 },
  { kind: 'log', x: 2, z: -132, halfWidth: 2.2, halfDepth: 0.5 },
];

// No modifica el objeto recibido: devuelve una copia cuando hay un choque.
// Barriles: círculo. Troncos y vallas: rectángulo contra círculo de la moto.
export function resolveExtraCollisions(next: BikeState, previous: BikeState): BikeState {
  if (next.won) return next;
  const bikeRadius = 0.55;
  for (const o of EXTRA_OBSTACLES) {
    let collided: boolean;
    if (o.kind === 'barrel') {
      collided = Math.hypot(next.x - o.x, next.z - o.z) < o.halfWidth + bikeRadius;
    } else {
      // Punto más cercano del rectángulo al centro de la moto.
      const nearestX = T.MathUtils.clamp(next.x, o.x - o.halfWidth, o.x + o.halfWidth);
      const nearestZ = T.MathUtils.clamp(next.z, o.z - o.halfDepth, o.z + o.halfDepth);
      collided = Math.hypot(next.x - nearestX, next.z - nearestZ) < bikeRadius;
    }
    if (!collided) continue;
    const s = { ...next, z: previous.z, speed: 0 };
    // cooldown evita contar muchos choques seguidos contra la misma pieza.
    if (s.cooldown === 0) { s.bumps += 1; s.cooldown = 0.8; }
    const side = previous.x >= o.x ? 1 : -1;
    const clearance = o.halfWidth + bikeRadius + 0.1;
    let exitX = o.x + side * clearance;
    // Si no entra por ese lateral, prueba el lado contrario.
    if (Math.abs(exitX) > CONFIG.roadHalfWidth) exitX = o.x - side * clearance;
    s.x = T.MathUtils.clamp(exitX, -CONFIG.roadHalfWidth, CONFIG.roadHalfWidth);
    return s;
  }
  return next;
}

// La noche no avanza antes de ganar. Función separada para poder probarla.
export function advanceNight(current: number, won: boolean, dt: number, seconds = 2.5) {
  if (!won) return 0;
  return Math.min(1, current + Math.max(0, dt) / seconds);
}

// Construye las piezas nuevas con geometrías simples, sin modelos externos.
function addExtraObstacles(scene: T.Scene) {
  const rust = new T.MeshStandardMaterial({ color: '#b84c28', roughness: 0.8 });
  const iron = new T.MeshStandardMaterial({ color: '#394347', roughness: 0.65 });
  const bark = new T.MeshStandardMaterial({ color: '#653b24', roughness: 1 });
  const cutWood = new T.MeshStandardMaterial({ color: '#d5a56e', roughness: 1 });
  const orange = new T.MeshStandardMaterial({ color: '#f28b25', roughness: 0.8 });
  const cream = new T.MeshStandardMaterial({ color: '#ffead0', roughness: 0.8 });
  const add = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material,
    x = 0, y = 0, z = 0) => {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  };
  for (const o of EXTRA_OBSTACLES) {
    const group = new T.Group(); group.position.set(o.x, 0, o.z); scene.add(group);
    if (o.kind === 'barrel') {
      // Cuerpo del barril y dos aros oscuros.
      add(group, new T.CylinderGeometry(o.halfWidth, o.halfWidth, 1.3, 12), rust, 0, 0.7);
      for (const y of [0.35, 1.05]) {
        add(group, new T.CylinderGeometry(o.halfWidth + 0.02, o.halfWidth + 0.02, 0.12, 12), iron, 0, y);
      }
    }
    if (o.kind === 'log') {
      // Cilindro acostado transversalmente: corteza y extremos claros.
      const log = new T.Mesh(
        new T.CylinderGeometry(o.halfDepth, o.halfDepth, o.halfWidth * 2, 10), [bark, cutWood, cutWood]
      );
      log.position.y = 0.55; log.rotation.z = Math.PI / 2;
      log.castShadow = true; log.receiveShadow = true; group.add(log);
    }
    if (o.kind === 'barrier') {
      // Tablero naranja con franjas y dos patas.
      add(group, new T.BoxGeometry(o.halfWidth * 2, 0.65, 0.24), orange, 0, 1);
      for (const x of [-o.halfWidth * 0.66, 0, o.halfWidth * 0.66]) add(group, new T.BoxGeometry(0.25, 0.66, 0.26), cream, x, 1);
      for (const x of [-o.halfWidth * 0.8, o.halfWidth * 0.8]) {
        add(group, new T.BoxGeometry(0.12, 1.1, 0.12), iron, x, 0.6);
        add(group, new T.BoxGeometry(0.3, 0.12, o.halfDepth * 2), iron, x, 0.12);
      }
    }
  }
}

// Fogata real en el escenario: no se superpone a la carretera como las estrellas.
function addCampfire(scene: T.Scene) {
  const group = new T.Group();
  // Dentro de la carretera, 3.5 unidades DESPUÉS de la meta.
  // Se desplaza a la derecha para quedar junto a la moto al terminar.
  group.position.set(3.6, 0.05, CONFIG.finishZ - 3.5);
  scene.add(group);
  const stone = new T.MeshStandardMaterial({ color: '#766c64', roughness: 1 });
  const wood = new T.MeshStandardMaterial({ color: '#4f2e20', roughness: 1 });
  const outerMaterial = new T.MeshBasicMaterial({
    color: '#ff5416', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false,
  });
  const innerMaterial = new T.MeshBasicMaterial({ color: '#ffc444', toneMapped: false });
  const sparkMaterial = new T.MeshBasicMaterial({ color: '#ffcf69', toneMapped: false });
  // Piedras formando un círculo alrededor del fuego.
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    const rock = new T.Mesh(new T.DodecahedronGeometry(0.2, 0), stone);
    rock.position.set(Math.cos(angle) * 0.9, 0.15, Math.sin(angle) * 0.9);
    rock.scale.y = 0.7; rock.castShadow = true; rock.receiveShadow = true; group.add(rock);
  }
  // Dos troncos cruzados.
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const log = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 1.4, 8), wood);
    log.rotation.z = Math.PI / 2; log.rotation.y = angle;
    log.position.y = 0.23; log.castShadow = true; group.add(log);
  }
  // Grupo separado: permite animar las llamas sin mover las piedras.
  const flames = new T.Group(); group.add(flames);
  for (let i = 0; i < 3; i++) {
    const flame = new T.Mesh(new T.ConeGeometry(0.32, 1.15, 7), outerMaterial);
    flame.position.set((i - 1) * 0.24, 0.83, (i % 2) * 0.15); flames.add(flame);
  }
  const core = new T.Mesh(new T.ConeGeometry(0.25, 0.8, 7), innerMaterial);
  core.position.y = 0.65; flames.add(core);
  // Chispas pequeñas con prueba de profundidad activada:
  // los objetos que estén delante las ocultan correctamente.
  const sparks: T.Mesh[] = [];
  const sparkGeometry = new T.SphereGeometry(0.025, 5, 4);
  for (let i = 0; i < 10; i++) {
    const spark = new T.Mesh(sparkGeometry, sparkMaterial);
    group.add(spark); sparks.push(spark);
  }
  // Esta luz sí ilumina los objetos y el suelo cercanos.
  const light = new T.PointLight('#ff8c30', 6, 18, 2);
  light.position.y = 1.2; group.add(light);
  return { group, flames, sparks, light };
}

// Personas low poly reunidas alrededor de la fogata.
// Las piezas se agrupan: raíz para saltar y hombros para mover los brazos.
function addCelebratingPeople(scene: T.Scene, firePosition: T.Vector3) {
  const crowd = new T.Group();
  crowd.position.copy(firePosition);
  scene.add(crowd);
  const shirtColors = ['#408f96', '#d97436', '#9b75ad', '#8baf6d', '#d3b353', '#c96b75'];
  const skinColors = ['#c68b65', '#ebba92', '#945c42', '#dca17b', '#ba7958', '#e4ad86'];
  const pants = new T.MeshStandardMaterial({ color: '#303d4a', roughness: 1 });
  const shoes = new T.MeshStandardMaterial({ color: '#252829', roughness: 1 });
  const hair = new T.MeshStandardMaterial({ color: '#392923', roughness: 1 });
  const people: { root: T.Group; leftArm: T.Group; rightArm: T.Group; phase: number }[] = [];

  const piece = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material,
    x: number, y: number, z: number) => {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  for (let i = 0; i < 6; i++) {
    const root = new T.Group();
    const angle = i / 6 * Math.PI * 2;
    // Radio de 2.2 unidades: suficiente espacio para no pisar el fuego.
    root.position.set(Math.cos(angle) * 2.2, 0, Math.sin(angle) * 2.2);
    // El frente de cada persona apunta hacia el centro del círculo.
    root.rotation.y = Math.atan2(root.position.x, root.position.z);
    root.scale.setScalar(0.9 + (i % 3) * 0.08);
    crowd.add(root);

    const shirt = new T.MeshStandardMaterial({ color: shirtColors[i], roughness: 1 });
    const skin = new T.MeshStandardMaterial({ color: skinColors[i], roughness: 1 });
    // Torso, cabeza, cabello y nariz: el detalle frontal ayuda a ver la orientación.
    piece(root, new T.BoxGeometry(0.5, 0.62, 0.3), shirt, 0, 1.05, 0);
    piece(root, new T.SphereGeometry(0.23, 10, 7), skin, 0, 1.62, 0);
    const hairstyle = piece(root, new T.SphereGeometry(0.235, 10, 7), hair, 0, 1.75, 0.025);
    hairstyle.scale.set(1, 0.55, 1);
    piece(root, new T.BoxGeometry(0.07, 0.09, 0.08), skin, 0, 1.6, -0.22);
    // Piernas y calzado.
    for (const x of [-0.14, 0.14]) {
      piece(root, new T.BoxGeometry(0.19, 0.62, 0.21), pants, x, 0.43, 0);
      piece(root, new T.BoxGeometry(0.22, 0.13, 0.34), shoes, x, 0.09, -0.05);
    }
    // Los grupos de los brazos giran desde el hombro, no desde la mano.
    const leftArm = new T.Group();
    const rightArm = new T.Group();
    leftArm.position.set(-0.32, 1.3, 0);
    rightArm.position.set(0.32, 1.3, 0);
    root.add(leftArm, rightArm);
    for (const arm of [leftArm, rightArm]) {
      piece(arm, new T.BoxGeometry(0.17, 0.34, 0.2), shirt, 0, -0.15, 0);
      piece(arm, new T.BoxGeometry(0.14, 0.25, 0.16), skin, 0, -0.43, 0);
      piece(arm, new T.SphereGeometry(0.095, 7, 5), skin, 0, -0.58, 0);
    }
    // Cada persona usa una fase diferente: no saltan todos al mismo tiempo.
    people.push({ root, leftArm, rightArm, phase: i * 1.1 });
  }
  return people;
}

// Parámetros del evento: editable sin cambiar el resto del juego.
export const METEOR_CONFIG = {
  triggerProgress: 0.62, // Día normal hasta el 62%: entonces aparece muy lejos.
  impactZ: CONFIG.finishZ + 6, // Aterriza seis unidades ANTES de la meta.
  duration: 2.5,        // Aproximación: lejos → cerca → impacto en el tramo final.
  minimumLead: 5,       // Mantiene el aterrizaje delante de la moto.
  startHeight: 36,      // Altura inicial en el cielo.
  approachDistance: 60, // Aparece muy por delante del lugar de impacto.
};
export type MeteorState = {
  stage: 'waiting' | 'falling' | 'landed';
  elapsed: number;
  phase: number;
  impactAge: number;
  impactX: number;
};
export const freshMeteorState = (): MeteorState => ({
  stage: 'waiting', elapsed: 0, phase: 0, impactAge: 0, impactX: -3.8,
});

// Máquina de estados del meteoro. No modifica su entrada.
// La pausa y el reinicio se controlan desde el ciclo del juego.
export function advanceMeteor(event: MeteorState, bike: BikeState, dt: number): MeteorState {
  const safeDt = T.MathUtils.clamp(dt, 0, 0.05);
  if (event.stage === 'waiting') {
    if (distanceProgress(bike) < METEOR_CONFIG.triggerProgress) return event;
    return {
      ...event, stage: 'falling',
      // Elige el lado opuesto al que ocupaba la moto cuando se activa.
      // Es un efecto decorativo: no causa daño ni colisiones.
      impactX: bike.x >= 0 ? -3.8 : 3.8,
    };
  }
  if (event.stage === 'falling') {
    const elapsed = event.elapsed + safeDt;
    // Mantiene el aterrizaje delante de la moto si el jugador se acerca rápido.
    const approaching = bike.z <= METEOR_CONFIG.impactZ + METEOR_CONFIG.minimumLead;
    const phase = approaching ? 1 : Math.min(1, elapsed / METEOR_CONFIG.duration);
    return { ...event, elapsed, phase, stage: phase >= 1 ? 'landed' : 'falling' };
  }
  return { ...event, impactAge: event.impactAge + safeDt };
}

// Meteoro, estela, polvo y cráter visual: todo dentro del mundo 3D.
function createMeteorEvent(scene: T.Scene) {
  const root = new T.Group(); scene.add(root);
  const rockMaterial = new T.MeshStandardMaterial({
    color: '#4e3028', emissive: '#ffd859', emissiveIntensity: 4,
    roughness: 0.9, flatShading: true,
  });
  const rock = new T.Mesh(new T.IcosahedronGeometry(0.85, 1), rockMaterial);
  rock.castShadow = true; root.add(rock);
  const trailMaterial = new T.MeshBasicMaterial({
    color: '#ffd859', transparent: true, opacity: 0.55,
    depthWrite: false, toneMapped: false,
  });
  const trailGeometry = new T.SphereGeometry(0.6, 8, 5);
  const trail: T.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const segment = new T.Mesh(trailGeometry, trailMaterial);
    root.add(segment); trail.push(segment);
  }
  const light = new T.PointLight('#ffd859', 350, 100, 2);
  root.add(light);

  const crater = new T.Group(); root.add(crater);
  const blackened = new T.MeshStandardMaterial({ color: '#282321', roughness: 1 });
  const debrisMaterial = new T.MeshStandardMaterial({ color: '#6d4c3b', roughness: 1 });
  const hotMaterial = new T.MeshBasicMaterial({ color: '#f44d20', toneMapped: false });
  // Mancha sobre el pavimento: representa el fondo, no perfora la carretera.
  const scar = new T.Mesh(new T.CircleGeometry(1.5, 20), blackened);
  scar.rotation.x = -Math.PI / 2; scar.position.y = 0.11;
  scar.receiveShadow = true; crater.add(scar);
  const hotRing = new T.Mesh(new T.RingGeometry(0.82, 0.94, 20), hotMaterial);
  hotRing.rotation.x = -Math.PI / 2; hotRing.position.y = 0.12; crater.add(hotRing);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    const debris = new T.Mesh(new T.DodecahedronGeometry(0.25 + (i % 3) * 0.07, 0), debrisMaterial);
    debris.position.set(Math.cos(a) * 1.55, 0.2, Math.sin(a) * 1.55);
    debris.scale.set(1.4, 0.6 + (i % 2) * 0.2, 1);
    debris.rotation.y = i; debris.castShadow = true; debris.receiveShadow = true;
    crater.add(debris);
  }
  const dustMaterial = new T.MeshStandardMaterial({
    color: '#b98561', transparent: true, opacity: 0.4, depthWrite: false,
  });
  const dustGeometry = new T.SphereGeometry(0.5, 7, 5);
  const dust: T.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const particle = new T.Mesh(dustGeometry, dustMaterial);
    root.add(particle); dust.push(particle);
  }
  root.visible = false; crater.visible = false;
  const start = new T.Vector3();
  const target = new T.Vector3();
  const behind = new T.Vector3();
  const yellow = new T.Color('#ffd859');
  const orange = new T.Color('#ff892e');
  const red = new T.Color('#ff3d1b');
  const glow = new T.Color();

  // Actualiza solo la parte visual; el estado de la caída vive fuera.
  const update = (event: MeteorState, reducedMotion: boolean) => {
    root.visible = event.stage !== 'waiting';
    if (!root.visible) return;
    const landed = event.stage === 'landed';
    start.set(event.impactX - 10, METEOR_CONFIG.startHeight,
      METEOR_CONFIG.impactZ - METEOR_CONFIG.approachDistance);
    target.set(event.impactX, 0.8, METEOR_CONFIG.impactZ);
    const flight = event.phase * event.phase; // Acelera visualmente al acercarse.
    rock.position.copy(start).lerp(target, flight);
    rock.rotation.set(event.elapsed * 1.7, event.elapsed * 0.8, event.elapsed);
    const orangeMix = T.MathUtils.smoothstep(event.phase, 0.45, 0.95);
    glow.copy(yellow).lerp(orange, orangeMix);
    // Rojo solamente al aterrizar.
    if (landed) glow.copy(red);
    rockMaterial.emissive.copy(glow);
    rockMaterial.emissiveIntensity = landed ? 1.5 + 3 * Math.exp(-event.impactAge / 4) : 4;
    trailMaterial.color.copy(glow); light.color.copy(glow);
    light.position.copy(rock.position); light.position.y += 0.8;
    light.intensity = landed ? 35 + 90 * Math.exp(-event.impactAge / 3) : 350 + flight * 250;
    // La estela queda detrás de la dirección de caída.
    behind.copy(start).sub(target).normalize();
    trail.forEach((segment, i) => {
      segment.visible = !landed;
      segment.position.copy(rock.position).addScaledVector(behind, (i + 1) * 0.8);
      segment.scale.setScalar((1 - i / trail.length) * 1.2);
    });
    crater.visible = landed;
    crater.position.set(event.impactX, 0, METEOR_CONFIG.impactZ);
    dustMaterial.opacity = reducedMotion ? 0 : 0.4 * Math.max(0, 1 - event.impactAge / 2);
    dust.forEach((particle, i) => {
      particle.visible = landed && event.impactAge < 2 && !reducedMotion;
      const a = i / dust.length * Math.PI * 2;
      const r = 0.8 + event.impactAge * (1 + (i % 3) * 0.2);
      particle.position.set(event.impactX + Math.cos(a) * r,
        0.4 + event.impactAge * 0.6, METEOR_CONFIG.impactZ + Math.sin(a) * r);
      particle.scale.setScalar(0.6 + event.impactAge * 0.7);
    });
  };
  return { update };
}

export default function GameCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const inputs = useRef(props); inputs.current = props;
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true }); }
    catch { setError(true); return; }
    setError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const worldFog = new T.Fog('#eddcbe', 65, 180); scene.fog = worldFog;
    // Perspectiva y cámara baja: se ve el cielo por encima del horizonte.
    const camera = new T.PerspectiveCamera(58, 1, 0.1, 400);
    const ambientLight = new T.HemisphereLight('#fff6de', '#91816b', 2.5);
    scene.add(ambientLight);
    const sunlight = new T.DirectionalLight('#fff6db', 3);
    sunlight.castShadow = true; sunlight.shadow.mapSize.set(1024, 1024);
    Object.assign(sunlight.shadow.camera, {
      left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 95,
    });
    sunlight.shadow.normalBias = 0.04; scene.add(sunlight, sunlight.target);

    // El color global depende del meteoro, no del porcentaje del recorrido.
    const palette = {
      daySky: new T.Color('#eddcbe'), yellowSky: new T.Color('#ffd472'),
      orangeSky: new T.Color('#ff771f'), redSky: new T.Color('#ad392f'),
      nightSky: new T.Color('#10182c'), dayAmbient: new T.Color('#fff6de'),
      yellowAmbient: new T.Color('#ffe095'), orangeAmbient: new T.Color('#ff923b'),
      redAmbient: new T.Color('#f58c75'), nightAmbient: new T.Color('#9db8ed'),
      dayGround: new T.Color('#91816b'), redGround: new T.Color('#74352f'),
      nightGround: new T.Color('#26334b'), daySun: new T.Color('#fff6db'),
      yellowSun: new T.Color('#ffe066'), orangeSun: new T.Color('#ff721f'),
      redSun: new T.Color('#ff5b38'), nightSun: new T.Color('#93b4ed'),
    };
    const skyColor = new T.Color(); renderer.setClearColor(palette.daySky);
    createWorld(scene);
    addExtraObstacles(scene);
    const campfire = addCampfire(scene);
    const crowd = addCelebratingPeople(scene, campfire.group.position);
    const meteorVisual = createMeteorEvent(scene);
    const bike = makeBike(); scene.add(bike.group);

    const keys = new Set<string>();
    const handleKey = (e: KeyboardEvent) => {
      // No captura controles mientras se escribe en un campo de texto.
      const element = e.target as HTMLElement | null;
      if (element?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keys.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); };
    const blur = () => { keys.clear(); if (inputs.current.mode === 'running') inputs.current.onPause(); };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);

    const resize = () => {
      const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = w < 650 ? 72 : 58;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    let state = freshState();
    let meteor = freshMeteorState();
    let last: number | null = null;
    let lastHud = 0;
    let version = inputs.current.restart;
    let cameraInitialized = false;
    let fireTime = 0;
    let night = 0;
    // Duración de la transición a noche DESPUÉS de ganar, en segundos.
    const nightTransitionSeconds = 2.5;
    const camTarget = new T.Vector3(), cameraPosition = new T.Vector3();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    renderer.setAnimationLoop((now) => {
      const dt = last === null ? 0 : Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now; const p = inputs.current;
      if (version !== p.restart) {
        state = freshState(); version = p.restart;
        night = 0; fireTime = 0; cameraInitialized = false;
        meteor = freshMeteorState();
        keys.clear(); p.onUpdate(state);
      }
      if (p.mode === 'running') {
        const controls: Controls = {
          forward: keys.has('w') || keys.has('arrowup') || p.touch.forward,
          brake: keys.has('s') || keys.has('arrowdown') || keys.has(' ') || p.touch.brake,
          left: keys.has('a') || keys.has('arrowleft') || p.touch.left,
          right: keys.has('d') || keys.has('arrowright') || p.touch.right,
        };
        const previous = state;
        // step conserva los obstáculos originales; luego revisamos los nuevos.
        state = resolveExtraCollisions(step(state, controls, dt), previous);
        if (state.won && !previous.won) {
          keys.clear(); p.onUpdate(state); p.onFinish(state);
        }
      } else keys.clear();

      bike.group.position.set(state.x, 0.03, state.z); bike.group.rotation.y = state.yaw;
      bike.group.rotation.z = T.MathUtils.lerp(
        bike.group.rotation.z, Math.sin(state.yaw) * state.speed * 0.018,
        1 - Math.exp(-8 * dt)
      );
      // Las ruedas ya no giran mientras la simulación está pausada.
      if (p.mode === 'running') {
        for (const wheel of bike.wheels) wheel.rotation.x -= state.speed * dt * 2;
      }
      const mobile = container.clientWidth < 650;
      // Vista de seguimiento más baja, con espacio para el cielo.
      cameraPosition.set(state.x * 0.65 + (mobile ? 2 : 5), mobile ? 8 : 7, state.z + (mobile ? 20 : 15));
      camera.position.lerp(cameraPosition, cameraInitialized ? 1 - Math.exp(-5 * dt) : 1);
      cameraInitialized = true;
      camTarget.set(state.x * 0.4, 3.5, state.z - 18); camera.lookAt(camTarget);

      // La caída se congela al pausar y se inicia una sola vez por partida.
      if (p.mode === 'running') meteor = advanceMeteor(meteor, state, dt);
      meteorVisual.update(meteor, reducedMotion.matches);
      const active = meteor.stage !== 'waiting';
      const landed = meteor.stage === 'landed';
      // Sin evento activo, todas las mezclas valen 0: iluminación diurna original.
      // Amarillo al verlo lejos; naranja intenso solo durante el acercamiento.
      const yellowMix = active ? T.MathUtils.smoothstep(meteor.phase, 0, 0.2) : 0;
      const orangeMix = active ? T.MathUtils.smoothstep(meteor.phase, 0.45, 0.95) : 0;
      // Rojo al aterrizar: transición breve, sin destello brusco.
      const redMix = landed ? T.MathUtils.smoothstep(meteor.impactAge, 0, 0.35) : 0;
      night = advanceNight(night, state.won, dt, nightTransitionSeconds);
      const nightMix = T.MathUtils.smoothstep(night, 0, 1);

      skyColor.copy(palette.daySky).lerp(palette.yellowSky, yellowMix)
        .lerp(palette.orangeSky, orangeMix).lerp(palette.redSky, redMix)
        .lerp(palette.nightSky, nightMix);
      renderer.setClearColor(skyColor); worldFog.color.copy(skyColor);
      ambientLight.color.copy(palette.dayAmbient).lerp(palette.yellowAmbient, yellowMix)
        .lerp(palette.orangeAmbient, orangeMix).lerp(palette.redAmbient, redMix)
        .lerp(palette.nightAmbient, nightMix);
      ambientLight.groundColor.copy(palette.dayGround).lerp(palette.redGround, redMix)
        .lerp(palette.nightGround, nightMix);
      ambientLight.intensity = T.MathUtils.lerp(2.5 + orangeMix * 0.2 - redMix * 0.7, 0.65, nightMix);
      sunlight.color.copy(palette.daySun).lerp(palette.yellowSun, yellowMix)
        .lerp(palette.orangeSun, orangeMix).lerp(palette.redSun, redMix)
        .lerp(palette.nightSun, nightMix);
      sunlight.intensity = T.MathUtils.lerp(3 - orangeMix * 0.4 - redMix * 0.4, 0.35, nightMix);
      renderer.toneMappingExposure = T.MathUtils.lerp(1.15 + orangeMix * 0.05 - redMix * 0.1, 0.95, nightMix);
      // Altura original del sol hasta que el meteoro se acerca.
      sunlight.position.set(state.x - 18, 32 - orangeMix * 10, state.z + 12);
      sunlight.target.position.set(state.x, 0, state.z - 10);

      // La fogata permanece encendida en la meta; se congela al pausar.
      // Movimiento reducido: mantiene una llama y luz estáticas.
      if (p.mode !== 'paused' && !reducedMotion.matches) fireTime += dt;
      const flicker = reducedMotion.matches ? 0 : Math.sin(fireTime * 6) * 0.07;
      campfire.flames.scale.set(1 + flicker, 1 + flicker * 1.5, 1 - flicker);
      campfire.light.intensity = 6 + nightMix * 4 + flicker * 5;
      campfire.sparks.forEach((spark, i) => {
        const phase = (fireTime * 0.4 + i / campfire.sparks.length) % 1;
        const angle = i * 2.4;
        spark.position.set(Math.cos(angle + phase) * (0.15 + phase * 0.3),
          0.6 + phase * 1.8, Math.sin(angle + phase) * (0.15 + phase * 0.3));
        spark.scale.setScalar(1 - phase);
      });
      // Al cruzar la meta, las personas levantan los brazos y celebran.
      // Al reiniciar regresan a una postura de espera.
      // En pausa conservan la pose; movimiento reducido elimina saltos y balanceo.
      if (p.mode !== 'paused') {
        const celebrating = state.won;
        const animate = celebrating && !reducedMotion.matches;
        for (const person of crowd) {
          const wave = animate ? Math.sin(fireTime * 3 + person.phase) * 0.16 : 0;
          const armAngle = celebrating ? 2.4 : 0.12;
          person.leftArm.rotation.z = -armAngle + wave;
          person.rightArm.rotation.z = armAngle + wave;
          person.root.position.y = animate
            ? Math.max(0, Math.sin(fireTime * 3.5 + person.phase)) * 0.18
            : 0;
        }
      }
      if (now - lastHud > 100) { p.onUpdate({ ...state }); lastHud = now; }
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null); observer.disconnect();
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      // Evita liberar varias veces materiales y geometrías compartidas.
      const geometries = new Set<T.BufferGeometry>();
      const materials = new Set<T.Material>();
      const textures = new Set<T.Texture>();
      scene.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          if ('map' in material && material.map instanceof T.Texture) textures.add(material.map);
        }
      });
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
      materials.forEach(m => m.dispose()); sunlight.shadow.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className="game-canvas" role="img"
      aria-label="A motorcycle route with a falling meteor, a glowing crater and people celebrating around a campfire">
      {error && (
        <div className="webgl-error">
          <h2>This ride needs WebGL.</h2>
          <p>Try a browser with hardware acceleration enabled.</p>
        </div>
      )}
    </div>
  );
}

