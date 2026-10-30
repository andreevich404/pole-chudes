import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  type Texture,
  WebGLRenderer,
} from 'three'
import { disposeObject, safeDispose } from './dispose'
import { createParallax } from './parallax'
import { glowSprite } from './sprite'

export interface StudioScene {
  shake: () => void
  dispose: () => void
}

interface Options {
  reduced: boolean
}

const BEAM_VERT = /* glsl */ `
  varying float vFade;
  uniform float uLength;
  void main() {
    vFade = 1.0 + position.y / uLength; // 1 у источника, 0 у основания
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const BEAM_FRAG = /* glsl */ `
  varying float vFade;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    gl_FragColor = vec4(uColor, pow(clamp(vFade, 0.0, 1.0), 1.7) * uOpacity);
  }
`

/** Фон студии: прожекторные лучи и парящие золотые искры. null — если WebGL недоступен. */
export function createStudioScene(canvas: HTMLCanvasElement, { reduced }: Options): StudioScene | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(50, 1, 0.1, 60)
  camera.position.set(0, 0, 9)

  /* лучи */
  const beams = new Group()
  const LEN = 18
  const defs = [
    { x: -6, color: '#7c5cff', phase: 0, op: 0.2 },
    { x: 0, color: '#ffd25a', phase: 2.1, op: 0.16 },
    { x: 6, color: '#ff5fd0', phase: 4.2, op: 0.18 },
  ]
  const beamMeshes = defs.map((d) => {
    const geo = new ConeGeometry(2.2, LEN, 40, 1, true)
    geo.translate(0, -LEN / 2, 0)
    const mat = new ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uLength: { value: LEN }, uColor: { value: new Color(d.color) }, uOpacity: { value: d.op } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    })
    const m = new Mesh(geo, mat)
    m.position.set(d.x, 8, -5)
    m.rotation.z = d.x * -0.04
    beams.add(m)
    return { mesh: m, base: d.x * -0.04, phase: d.phase }
  })
  scene.add(beams)

  /* золотые частицы (при reduced-motion не создаются) */
  const COUNT = 140
  let sprite: Texture | null = null
  let points: Points | null = null
  const speeds = new Float32Array(COUNT)
  if (!reduced) {
    sprite = glowSprite()
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18
      pos[i * 3 + 1] = (Math.random() - 0.5) * 11
      pos[i * 3 + 2] = -4 + Math.random() * 7
      speeds[i] = 0.12 + Math.random() * 0.35
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    const mat = new PointsMaterial({
      map: sprite,
      color: 0xffd25a,
      size: 0.26,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    points = new Points(geo, mat)
    scene.add(points)
  }

  const parallax = createParallax(!reduced)
  let shakeAmount = 0
  let last = performance.now()
  let disposed = false

  const resize = (): void => {
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(document.documentElement)

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = now / 1000
    parallax.update(dt)
    if (!reduced) {
      for (const b of beamMeshes) b.mesh.rotation.z = b.base + Math.sin(t * 0.45 + b.phase) * 0.28
      if (points) {
        const attr = points.geometry.getAttribute('position') as BufferAttribute
        for (let i = 0; i < COUNT; i++) {
          let y = attr.getY(i) + speeds[i]! * dt
          if (y > 5.8) y = -5.8
          attr.setY(i, y)
        }
        attr.needsUpdate = true
      }
    }
    shakeAmount *= Math.exp(-dt * 4.5)
    const s = shakeAmount > 0.002 ? shakeAmount : 0
    camera.position.set(parallax.x * 0.7 + (Math.random() - 0.5) * s, -parallax.y * 0.5 + (Math.random() - 0.5) * s, 9)
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
  }

  const start = (): void => {
    last = performance.now()
    renderer.setAnimationLoop(frame)
  }
  const onVisibility = (): void => {
    if (document.hidden) renderer.setAnimationLoop(null)
    else if (!disposed) start()
  }
  document.addEventListener('visibilitychange', onVisibility)
  if (!document.hidden) start()

  return {
    shake() {
      if (!reduced) shakeAmount = 0.5
    },
    dispose() {
      disposed = true
      renderer.setAnimationLoop(null)
      document.removeEventListener('visibilitychange', onVisibility)
      ro.disconnect()
      parallax.dispose()
      disposeObject(scene)
      safeDispose(sprite, renderer)
      renderer.forceContextLoss()
    },
  }
}
