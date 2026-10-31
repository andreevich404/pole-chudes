import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SpotLight,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { glowSprite } from "./sprite";
import { disposeObject } from "./dispose";
import { createWheelTexture } from "./wheelTexture";
import { SECTORS } from "../game/wheelSectors";
import type { StudioView } from "./studioBridge";

export interface StudioData {
  answer: string;
  guessed: string[];
  active: boolean;
  current: number;
  players: { name: string; roundScore: number }[];
  pickable: boolean;
}
export interface StudioScene {
  shake: () => void;
  setAngle: (angle: number) => void;
  setView: (view: StudioView) => void;
  update: (data: StudioData) => void;
  pick: (x: number, y: number) => string | "spin" | null;
  dispose: () => void;
}

/** One physical set: all props, shadows, reflections and camera shots share world space. */
export function createStudioScene(
  canvas: HTMLCanvasElement,
  { reduced }: { reduced: boolean },
): StudioScene {
  const compact = window.innerWidth < 700;
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  // Keep Retina detail; supersample standard-density displays instead of upscaling them.
  const renderPixelRatio = () =>
    Math.min(3, Math.max(window.devicePixelRatio || 1, compact ? 1.5 : 2));
  renderer.setPixelRatio(renderPixelRatio());
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new Scene();
  scene.background = new Color("#060b14");
  scene.fog = new FogExp2("#060b14", 0.012);
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.5;
  const gold = new MeshStandardMaterial({
    color: "#b99a61",
    metalness: 0.88,
    roughness: 0.26,
  });
  const dark = new MeshPhysicalMaterial({
    color: "#101a28",
    metalness: 0.7,
    roughness: 0.28,
    clearcoat: 0.6,
  });
  const black = new MeshStandardMaterial({ color: "#070b13", roughness: 0.76 });
  const blue = new MeshStandardMaterial({
    color: "#12345d",
    metalness: 0.65,
    roughness: 0.3,
  });
  const white = new MeshStandardMaterial({
    color: "#cdd8df",
    metalness: 0.5,
    roughness: 0.25,
  });
  const led = (color: string, intensity = 2) =>
    new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
    });
  const glowMap = glowSprite();
  function glow(color: string, x: number, y: number, z: number, scale = 1.4) {
    const sprite = new Sprite(
      new SpriteMaterial({
        map: glowMap,
        color,
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(scale);
    scene.add(sprite);
  }
  const blueLed = led("#267fe3", 2.5);
  const warmLed = led("#f5ce86", 2);
  function mesh(
    geo: ConstructorParameters<typeof Mesh>[0],
    mat: Material,
    x: number,
    y: number,
    z: number,
    parent = scene as Scene | Group,
  ) {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(
    w: number,
    h: number,
    d: number,
    mat: Material,
    x: number,
    y: number,
    z: number,
    parent?: Group,
  ) {
    return mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(0.055, w / 4, h / 4, d / 4)),
      mat,
      x,
      y,
      z,
      parent,
    );
  }
  function ring(radius: number, tube: number, mat: Material, y: number, z = 0) {
    const m = mesh(new TorusGeometry(radius, tube, 8, 128), mat, 0, y, z);
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  function textTexture(
    text: string,
    fg = "#eee1bc",
    bg = "#0a1423",
    aspect = 4,
  ) {
    const c = document.createElement("canvas");
    c.width = Math.min(2048, renderer.capabilities.maxTextureSize);
    c.height = Math.max(128, Math.round(c.width / aspect));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    const fontSize = c.height * 0.68;
    ctx.font = `600 ${fontSize}px 'Onest', sans-serif`;
    const fittedSize =
      fontSize *
      Math.min(1, (c.width * 0.92) / Math.max(1, ctx.measureText(text).width));
    ctx.font = `600 ${fittedSize}px 'Onest', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fg;
    ctx.fillText(text, c.width / 2, c.height / 2);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  }
  function sign(
    text: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    fg?: string,
  ) {
    const material = new MeshBasicMaterial({
      map: textTexture(text, fg, undefined, w / h),
      toneMapped: false,
    });
    return mesh(new PlaneGeometry(w, h), material, x, y, z);
  }

  // Polished floor, concentric stage and brass inlay.
  const floor = new Reflector(new PlaneGeometry(100, 100), {
    color: 0x303846,
    textureWidth: compact ? 1024 : 2048,
    textureHeight: compact ? 1024 : 2048,
    clipBias: 0.003,
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;
  scene.add(floor);
  for (let i = 0; i < 3; i++) {
    mesh(
      new CylinderGeometry(5.6 - i * 0.33, 5.6 - i * 0.33, 0.12, 128),
      dark,
      0,
      i * 0.12,
      0,
    );
    ring(5.58 - i * 0.33, 0.018, i === 1 ? blueLed : gold, i * 0.12 + 0.065);
  }
  ring(7.4, 0.025, blueLed, 0.005);
  ring(8, 0.018, gold, 0.005);
  // Architectural backdrop: layered rounded portals and illuminated fluting.
  box(28, 13, 0.6, black, 0, 5.5, -6.7);
  for (let i = 0; i < 4; i++) {
    const arch = mesh(
      new TorusGeometry(5.6 + i * 0.64, 0.07, 12, 128, Math.PI),
      i % 2 ? gold : blueLed,
      0,
      1.15,
      -6.15 - i * 0.03,
    );
    arch.rotation.z = 0;
    for (const side of [-1, 1])
      box(
        0.14,
        3,
        0.15,
        i % 2 ? gold : blueLed,
        side * (5.6 + i * 0.64),
        -0.3,
        -6.15,
      );
  }
  for (let i = -17; i <= 17; i++) {
    const x = i * 0.65;
    if (Math.abs(x) < 6.1) continue;
    box(0.24, 7.6, 0.45, blue, x, 3.9, -5.8);
    box(0.022, 6.9, 0.05, warmLed, x - 0.09, 3.9, -5.54);
  }
  sign("П О Л Е   Ч У Д Е С", 7.5, 1.05, 0, 7.05, -6.02);
  sign(
    "Т Е Л Е В И З И О Н Н А Я   И Г Р А",
    4.5,
    0.4,
    0,
    6.37,
    -6.01,
    "#86a8cf",
  );

  // Brass seams in the radial stage decking.
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const seam = box(
      0.009,
      0.006,
      0.65,
      gold,
      Math.sin(a) * 4.8,
      0.306,
      Math.cos(a) * 4.8,
    );
    seam.rotation.y = a;
  }
  // Word board, physically inset into a metal cabinet.
  const board = new Group();
  board.position.set(0, 4.15, -4.4);
  scene.add(board);
  box(9.7, 2.65, 0.45, dark, 0, 0, 0, board);
  box(9.5, 2.45, 0.08, gold, 0, 0, 0.26, board);
  box(9.35, 2.3, 0.1, black, 0, 0, 0.32, board);
  for (const x of [-4.9, 4.9]) {
    box(0.12, 2.7, 0.12, warmLed, x, 0, 0.25, board);
    glow("#f5ce86", x, 4.15, -4.05, 2.2);
  }
  for (const x of [-3.65, 3.65]) box(0.18, 2.2, 0.2, gold, x, -2.1, 0, board);
  const tiles = new Group();
  board.add(tiles);
  let tileMeshes: {
    group: Group;
    char: string;
    open: boolean;
    target: number;
    panel: Mesh;
  }[] = [];
  let boardKey = "";
  let data: StudioData = {
    answer: "",
    guessed: [],
    active: false,
    current: 0,
    players: [],
    pickable: false,
  };
  function updateBoard(answer: string, guessed: string[]) {
    const chars = Array.from(answer.toUpperCase().replace(/Ё/g, "Е"));
    if (boardKey !== answer) {
      disposeObject(tiles);
      tiles.clear();
      tileMeshes = [];
      boardKey = answer;
      const cols = Math.max(chars.length, 9),
        step = Math.min(0.86, 8.8 / cols);
      chars.forEach((char, i) => {
        const group = new Group();
        group.position.set((i - (chars.length - 1) / 2) * step, 0, 0.48);
        tiles.add(group);
        const closed = new MeshStandardMaterial({
          color: "#174373",
          metalness: 0.4,
          roughness: 0.24,
          emissive: "#0b2544",
          emissiveIntensity: 0.3,
        });
        const panel = box(step - 0.055, 1.55, 0.16, closed, 0, 0, 0, group);
        box(step - 0.1, 0.018, 0.02, blueLed.clone(), 0, -0.65, 0.09, group);
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 1024;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#e6ebed";
        ctx.fillRect(0, 0, 512, 1024);
        ctx.font = "600 420px 'Onest', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#122032";
        ctx.fillText(char, 256, 530, 470);
        const letterTexture = new CanvasTexture(c);
        letterTexture.colorSpace = SRGBColorSpace;
        letterTexture.anisotropy = anisotropy;
        const letter = mesh(
          new PlaneGeometry(step - 0.06, 1.54),
          new MeshBasicMaterial({ map: letterTexture }),
          0,
          0,
          -0.091,
          group,
        );
        letter.rotation.y = Math.PI;
        panel.userData.char = char;
        tileMeshes.push({ group, char, open: false, target: 0, panel });
      });
    }
    tileMeshes.forEach((t) => {
      t.open = guessed.includes(t.char) || /[^А-ЯA-Z]/.test(t.char);
      t.target = t.open ? Math.PI : 0;
    });
  }
  updateBoard("ПОЛЕ ЧУДЕС", Array.from("ПОЛЕЧУДЕС"));

  // Turntable: rotating face, spindle, twenty-one brass pegs, stationary pointer.
  const wheel = new Group();
  wheel.position.set(0, 1.55, 1.15);
  wheel.rotation.x = -Math.PI / 2;
  scene.add(wheel);
  const disc = new Group();
  wheel.add(disc);
  mesh(
    new CylinderGeometry(2.08, 1.94, 0.25, 96),
    dark,
    0,
    0.86,
    1.15,
  ).castShadow = true;
  mesh(new CylinderGeometry(0.75, 1.15, 0.85, 64), gold, 0, 0.7, 1.15);
  const body = mesh(
    new CylinderGeometry(2.05, 2.05, 0.3, 128),
    dark,
    0,
    0,
    -0.15,
    wheel,
  );
  body.rotation.x = Math.PI / 2;
  const faceTexture = createWheelTexture(
    Math.min(4096, renderer.capabilities.maxTextureSize),
    anisotropy,
  );
  const face = mesh(
    new CircleGeometry(1.94, 128),
    new MeshBasicMaterial({ map: faceTexture, toneMapped: false }),
    0,
    0,
    0.015,
    disc,
  );
  face.userData.spin = true;
  mesh(new TorusGeometry(2, 0.065, 16, 128), gold, 0, 0, 0.025, wheel);
  mesh(new TorusGeometry(1.87, 0.018, 8, 128), gold, 0, 0, 0.05, disc);
  for (let i = 0; i < SECTORS.length; i++) {
    const a = (i * Math.PI * 2) / SECTORS.length;
    const peg = mesh(
      new CylinderGeometry(0.025, 0.035, 0.17, 10),
      gold,
      Math.sin(a) * 1.95,
      Math.cos(a) * 1.95,
      0.12,
      disc,
    );
    peg.rotation.x = Math.PI / 2;
    mesh(
      new SphereGeometry(0.041, 10, 8),
      white,
      Math.sin(a) * 1.95,
      Math.cos(a) * 1.95,
      0.21,
      disc,
    );
  }
  for (let i = 0; i < 64; i++) {
    const a = (i * Math.PI * 2) / 64;
    mesh(
      new SphereGeometry(0.025, 8, 6),
      warmLed,
      Math.sin(a) * 2.025,
      Math.cos(a) * 2.025,
      0.055,
      wheel,
    );
  }
  const hub = mesh(new SphereGeometry(0.28, 32, 16), gold, 0, 0, 0.07, disc);
  hub.scale.z = 0.4;
  mesh(new TorusGeometry(0.33, 0.025, 12, 48), gold, 0, 0, 0.04, disc);
  const pointer = mesh(
    new ConeGeometry(0.15, 0.48, 3),
    led("#eb6146", 0.25),
    0,
    1.98,
    0.25,
    wheel,
  );
  pointer.rotation.z = Math.PI;
  mesh(new SphereGeometry(0.08, 16, 12), gold, 0, 2.21, 0.17, wheel);

  // Contestant podiums, microphones and upholstered audience seating.
  const podiumScreens: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 3.45,
      z = -2.15 + Math.abs(i - 1) * 0.38;
    box(2.05, 1.4, 0.8, dark, x, 1.05, z);
    box(2.15, 0.1, 0.95, gold, x, 1.8, z);
    box(1.92, 0.035, 0.04, blueLed, x, 0.42, z + 0.42);
    podiumScreens.push(
      sign(["ИГРОК", "АЛЕКСАНДР", "МАРИЯ"][i]!, 1.8, 0.48, x, 1.2, z + 0.411),
    );
    const mic = mesh(
      new CylinderGeometry(0.015, 0.015, 0.4, 8),
      black,
      x + 0.6,
      2.02,
      z,
    );
    mic.rotation.z = -0.2;
    mesh(new SphereGeometry(0.055, 12, 8), black, x + 0.64, 2.22, z);
  }
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      box(
        3.7,
        0.25 + row * 0.23,
        1.05,
        black,
        side * 9.1,
        row * 0.12,
        row * 1.3 - 1,
      );
      for (let col = 0; col < 5; col++) {
        const x = side * (7.6 + col * 0.68),
          z = row * 1.3 - 1;
        const fabric = new MeshStandardMaterial({
          color: row % 2 ? "#182b44" : "#142236",
          roughness: 0.94,
        });
        box(0.55, 0.15, 0.55, fabric, x, 0.55 + row * 0.25, z);
        box(0.55, 0.72, 0.12, fabric, x, 0.92 + row * 0.25, z - 0.28);
      }
    }
  }
  // Overhead truss and spot fixtures, with faint volumetric shafts.
  box(22, 0.12, 0.12, white, 0, 9, -1);
  scene.add(new AmbientLight("#9bb5d5", 0.5));
  const key = new SpotLight("#fff0d2", 650, 45, 0.65, 0.55, 2);
  key.position.set(2, 10, 6);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  for (const side of [-1, 1]) {
    const fill = new PointLight(side === 1 ? "#609fff" : "#ffd9a0", 95, 25);
    fill.position.set(side * 6, 5, 2);
    scene.add(fill);
    const back = new SpotLight("#387cfa", 200, 30, 0.55, 0.7, 2);
    back.position.set(side * 6, 8.5, -4);
    back.target.position.set(side * 2, 0, 3);
    scene.add(back, back.target);
  }
  const beams: Mesh[] = [];
  for (const x of [-7, -3.5, 3.5, 7]) {
    const fixture = mesh(
      new CylinderGeometry(0.16, 0.22, 0.4, 16),
      black,
      x,
      8.8,
      -1,
    );
    fixture.rotation.z = x * 0.06;
    glow("#b8d4ff", x, 8.52, -1, 1.5);
    mesh(new CircleGeometry(0.16, 24), warmLed, x, 8.58, -1).rotation.x =
      -Math.PI / 2;
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 vUv; void main(){float edge=pow(sin(vUv.x*3.14159),3.);gl_FragColor=vec4(.45,.65,1.,edge*pow(vUv.y,1.5)*.045);}",
    });
    const beam = mesh(new ConeGeometry(2, 8.5, 32, 1, true), mat, x, 4.3, -1);
    beam.rotation.z = -x * 0.04;
    beams.push(beam);
  }

  const raycaster = new Raycaster();
  const pointerPos = new Vector2();
  let view: StudioView = "wide",
    shake = 0,
    last = performance.now(),
    disposed = false;
  const look = new Vector3(0, 2, -1);
  camera.position.set(10, 8, 18);
  const cameraTarget = new Vector3(),
    lookTarget = new Vector3();
  function resize() {
    const w = Math.max(1, canvas.clientWidth),
      h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(renderPixelRatio());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const narrow = camera.aspect < 0.8;
    if (!data.active) {
      cameraTarget.set(narrow ? 11 : 10.5, narrow ? 10 : 7.8, narrow ? 34 : 19);
      lookTarget.set(narrow ? 0 : -3.6, 2.3, -0.7);
    } else {
      // Fit each shot to the actual scene region, leaving all controls outside it.
      const halfFov = Math.tan((camera.fov * Math.PI) / 360);
      const fit = (width: number, height: number) =>
        Math.max(width / camera.aspect, height) / (2 * halfFov);
      if (view === "wheel") {
        const distance = fit(5.1, 5.1);
        lookTarget.set(0, 1.55, 1.15);
        cameraTarget.set(0, 1.55 + distance * 0.94, 1.15 + distance * 0.34);
      } else if (view === "board") {
        const distance = fit(11, 4);
        lookTarget.set(0, 4.15, -4.4);
        cameraTarget.set(0, 4.5, -4.4 + distance);
      } else {
        const distance = fit(16, 10);
        lookTarget.set(0, 2.8, -1);
        cameraTarget.set(
          distance * 0.3,
          2.8 + distance * 0.24,
          -1 + distance * 0.93,
        );
      }
    }
    if (!reduced && view !== "wheel")
      cameraTarget.x += Math.sin(now * 0.00012) * 0.18;
    camera.position.lerp(cameraTarget, reduced ? 1 : 1 - Math.exp(-dt * 3));
    look.lerp(lookTarget, reduced ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
    shake *= Math.exp(-dt * 7);
    if (shake > 0.001) camera.position.x += Math.sin(now * 0.1) * shake;
    tileMeshes.forEach((t) => {
      t.group.rotation.y +=
        (t.target - t.group.rotation.y) * (reduced ? 1 : 1 - Math.exp(-dt * 8));
    });
    if (!reduced)
      beams.forEach((b, i) => {
        b.rotation.z += Math.sin(now * 0.0004 + i) * dt * 0.01;
      });
    renderer.render(scene, camera);
  }
  function start() {
    last = performance.now();
    renderer.setAnimationLoop(frame);
  }
  const visibility = () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else if (!disposed) start();
  };
  document.addEventListener("visibilitychange", visibility);
  start();
  return {
    shake() {
      if (!reduced) shake = 0.12;
    },
    setAngle(angle) {
      disc.rotation.z = (-angle * Math.PI) / 180;
      pointer.rotation.z =
        Math.PI + Math.sin((angle * SECTORS.length * Math.PI) / 180) * 0.09;
    },
    setView(v) {
      view = v;
    },
    update(d) {
      data = d;
      updateBoard(
        d.active && d.answer ? d.answer : "ПОЛЕ ЧУДЕС",
        d.active ? d.guessed : Array.from("ПОЛЕЧУДЕС"),
      );
      podiumScreens.forEach((screen, i) => {
        const p = d.players[i],
          label = p
            ? `${p.name.toUpperCase()}   ${p.roundScore}`
            : ["ВЫ", "АЛЕКСАНДР", "МАРИЯ"][i]!;
        if (screen.userData.label === label + d.current) return;
        screen.userData.label = label + d.current;
        const mat = screen.material as MeshBasicMaterial;
        mat.map?.dispose();
        mat.map = textTexture(label, d.current === i ? "#f2d59d" : "#a7bbd1");
      });
    },
    pick(x, y) {
      const rect = canvas.getBoundingClientRect();
      pointerPos.set(
        ((x - rect.left) / rect.width) * 2 - 1,
        (-(y - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerPos, camera);
      if (data.pickable) {
        const hit = raycaster.intersectObjects(
          tileMeshes.filter((t) => !t.open).map((t) => t.panel),
        )[0];
        if (hit) return hit.object.userData.char as string;
      }
      if (raycaster.intersectObject(face)[0]) return "spin";
      return null;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      floor.dispose();
      disposeObject(scene);
      disposeObject(room);
      glowMap.dispose();
      faceTexture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
