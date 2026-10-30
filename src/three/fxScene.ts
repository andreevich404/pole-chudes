import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three'
import { disposeObject, safeDispose } from './dispose'
import { glowSprite } from './sprite'

export interface FxScene {
  fireworks: () => void
  dispose: () => void
}

interface Burst {
  points: Points
  vel: Float32Array
  age: number
  life: number
}

const PALETTE = ['#fbbf24', '#f43f5e', '#38bdf8', '#4ade80', '#c084fc', '#fb923c', '#ffffff']
const CONFETTI = 220

/** Слой салюта и конфетти поверх интерфейса. Рендерит только пока идут эффекты. */
export function createFxScene(canvas: HTMLCanvasElement, onIdle: () => void, onActive: () => void): FxScene | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(50, 1, 0.1, 80)
  camera.position.set(0, 0, 14)

  const sprite = glowSprite()
  const bursts: Burst[] = []
  const queue: number[] = [] // время запуска (сек от старта) будущих залпов
  let clock = 0
  let confettiAge = -1

  /* конфетти */
  const confGeo = new BoxGeometry(0.28, 0.16, 0.02)
  const confMat = new MeshBasicMaterial({ side: DoubleSide })
  const confetti = new InstancedMesh(confGeo, confMat, CONFETTI)
  confetti.visible = false
  confetti.frustumCulled = false
  const cPos = new Float32Array(CONFETTI * 3)
  const cVel = new Float32Array(CONFETTI * 3)
  const cRot = new Float32Array(CONFETTI * 3)
  const cSpin = new Float32Array(CONFETTI * 3)
  const tmp = new Object3D()
  const tmpColor = new Color()
  scene.add(confetti)

  const resize = (): void => {
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  const spawnBurst = (): void => {
    const count = 150
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const cx = MathUtils.randFloatSpread(14)
    const cy = MathUtils.randFloat(1, 5)
    const base = new Color(PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? '#fff')
    for (let i = 0; i < count; i++) {
      pos[i * 3] = cx
      pos[i * 3 + 1] = cy
      pos[i * 3 + 2] = 0
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const sp = 3 + Math.random() * 4
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * sp
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * sp
      vel[i * 3 + 2] = Math.cos(phi) * sp * 0.5
      const c = Math.random() < 0.3 ? new Color('#ffffff') : base
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 3))
    const mat = new PointsMaterial({
      map: sprite,
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const points = new Points(geo, mat)
    points.frustumCulled = false
    scene.add(points)
    bursts.push({ points, vel, age: 0, life: 1.8 })
  }

  const startConfetti = (): void => {
    for (let i = 0; i < CONFETTI; i++) {
      cPos[i * 3] = MathUtils.randFloatSpread(18)
      cPos[i * 3 + 1] = 8 + Math.random() * 8
      cPos[i * 3 + 2] = MathUtils.randFloatSpread(6)
      cVel[i * 3] = MathUtils.randFloatSpread(1.5)
      cVel[i * 3 + 1] = -(2 + Math.random() * 3)
      cVel[i * 3 + 2] = 0
      cRot[i * 3] = Math.random() * 6
      cRot[i * 3 + 1] = Math.random() * 6
      cRot[i * 3 + 2] = Math.random() * 6
      cSpin[i * 3] = MathUtils.randFloatSpread(8)
      cSpin[i * 3 + 1] = MathUtils.randFloatSpread(8)
      cSpin[i * 3 + 2] = MathUtils.randFloatSpread(8)
      confetti.setColorAt(i, tmpColor.set(PALETTE[i % PALETTE.length] ?? '#fff'))
    }
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true
    confetti.visible = true
    confettiAge = 0
  }

  let last = performance.now()
  let running = false
  let disposed = false

  const stop = (): void => {
    renderer.setAnimationLoop(null)
    running = false
  }

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    clock += dt

    while (queue.length && queue[0]! <= clock) {
      queue.shift()
      spawnBurst()
    }

    for (let b = bursts.length - 1; b >= 0; b--) {
      const burst = bursts[b]!
      burst.age += dt
      const attr = burst.points.geometry.getAttribute('position') as BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < arr.length; i += 3) {
        burst.vel[i + 1]! -= 5 * dt
        arr[i]! += burst.vel[i]! * dt
        arr[i + 1]! += burst.vel[i + 1]! * dt
        arr[i + 2]! += burst.vel[i + 2]! * dt
      }
      attr.needsUpdate = true
      const mat = burst.points.material as PointsMaterial
      mat.opacity = Math.max(0, 1 - burst.age / burst.life)
      if (burst.age >= burst.life) {
        scene.remove(burst.points)
        disposeObject(burst.points)
        bursts.splice(b, 1)
      }
    }

    if (confettiAge >= 0) {
      confettiAge += dt
      for (let i = 0; i < CONFETTI; i++) {
        cPos[i * 3]! += cVel[i * 3]! * dt + Math.sin(confettiAge * 2 + i) * 0.01
        cPos[i * 3 + 1]! += cVel[i * 3 + 1]! * dt
        tmp.position.set(cPos[i * 3]!, cPos[i * 3 + 1]!, cPos[i * 3 + 2]!)
        tmp.rotation.set(
          cRot[i * 3]! + cSpin[i * 3]! * confettiAge,
          cRot[i * 3 + 1]! + cSpin[i * 3 + 1]! * confettiAge,
          cRot[i * 3 + 2]! + cSpin[i * 3 + 2]! * confettiAge,
        )
        tmp.updateMatrix()
        confetti.setMatrixAt(i, tmp.matrix)
      }
      confetti.instanceMatrix.needsUpdate = true
      if (confettiAge > 5) {
        confettiAge = -1
        confetti.visible = false
      }
    }

    renderer.render(scene, camera)

    if (queue.length === 0 && bursts.length === 0 && confettiAge < 0) {
      stop()
      renderer.clear()
      onIdle()
    }
  }

  const start = (): void => {
    if (running || disposed) return
    running = true
    last = performance.now()
    renderer.setAnimationLoop(frame)
  }

  const onVisibility = (): void => {
    if (document.hidden) renderer.setAnimationLoop(null)
    else if (running) renderer.setAnimationLoop(frame)
  }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    fireworks() {
      onActive()
      clock = 0
      queue.length = 0
      for (let i = 0; i < 7; i++) queue.push(i * 0.45 + Math.random() * 0.2)
      startConfetti()
      start()
    },
    dispose() {
      disposed = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
      bursts.forEach((b) => disposeObject(b.points))
      disposeObject(scene)
      safeDispose(confetti, sprite, renderer)
      renderer.forceContextLoss()
    },
  }
}
