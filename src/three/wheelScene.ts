import {
  AmbientLight,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SpotLight,
  TorusGeometry,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { SECTORS } from '../game/wheelSectors'
import { disposeObject, safeDispose } from './dispose'
import { createParallax } from './parallax'
import { createWheelTexture } from './wheelTexture'

export interface WheelScene {
  /** Угол поворота барабана в градусах (по часовой стрелке, как в engine) */
  setAngle: (deg: number) => void
  /** Щелчок указателя о шпильку */
  kick: () => void
  /** Тряска камеры (банкрот) */
  shake: () => void
  dispose: () => void
}

interface Options {
  reduced: boolean
}

/** Создаёт 3D-барабан. Возвращает null, если WebGL недоступен. */
export function createWheelScene(canvas: HTMLCanvasElement, { reduced }: Options): WheelScene | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const envScene = new RoomEnvironment()
  const envRT = pmrem.fromScene(envScene, 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.55

  const camera = new PerspectiveCamera(28, 1, 0.1, 50)
  const camBase = { x: 0, y: 0.45, z: 5.2 }
  camera.position.set(camBase.x, camBase.y, camBase.z)

  /* ---------- барабан ---------- */
  const tilt = new Group()
  tilt.rotation.x = -0.26
  scene.add(tilt)

  const faceTexture = createWheelTexture(1024, renderer.capabilities.getMaxAnisotropy())
  const faceMat = new MeshStandardMaterial({
    map: faceTexture,
    emissive: 0xffffff,
    emissiveMap: faceTexture,
    emissiveIntensity: 0.5,
    roughness: 0.5,
    metalness: 0,
    envMapIntensity: 0.15,
  })
  const FACE_R = 0.92
  const disc = new Group()
  const face = new Mesh(new CircleGeometry(FACE_R, 96), faceMat)
  face.castShadow = true
  face.receiveShadow = true
  disc.add(face)

  const goldMat = new MeshStandardMaterial({ color: 0xf6b81c, metalness: 1, roughness: 0.22 })
  const pegGeo = new SphereGeometry(0.03, 16, 12)
  for (let i = 0; i < SECTORS.length; i++) {
    const a = (i * 2 * Math.PI) / SECTORS.length
    const peg = new Mesh(pegGeo, goldMat)
    // угол от верха по часовой стрелке
    peg.position.set(Math.sin(a) * (FACE_R - 0.01), Math.cos(a) * (FACE_R - 0.01), 0.035)
    peg.castShadow = true
    disc.add(peg)
  }
  tilt.add(disc)

  const rim = new Mesh(new TorusGeometry(0.97, 0.075, 28, 128), goldMat)
  rim.position.z = 0.01
  rim.castShadow = true
  tilt.add(rim)

  const bodyMat = new MeshStandardMaterial({ color: 0x2a1470, metalness: 0.6, roughness: 0.4 })
  const body = new Mesh(new CylinderGeometry(1.03, 1.03, 0.2, 96), bodyMat)
  body.rotation.x = Math.PI / 2
  body.position.z = -0.12
  body.castShadow = true
  tilt.add(body)

  const hub = new Mesh(new SphereGeometry(0.15, 32, 24), goldMat)
  hub.scale.z = 0.55
  hub.position.z = 0.05
  hub.castShadow = true
  tilt.add(hub)

  /* ---------- указатель ---------- */
  const pointer = new Group()
  pointer.position.set(0, 1.2, 0.2)
  const coneMat = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.25 })
  const cone = new Mesh(new ConeGeometry(0.11, 0.42, 28), coneMat)
  cone.rotation.z = Math.PI // остриём вниз
  cone.position.y = -0.21
  cone.castShadow = true
  const knobMat = new MeshStandardMaterial({ color: 0xdc2626, metalness: 0.4, roughness: 0.25 })
  const knob = new Mesh(new SphereGeometry(0.09, 24, 16), knobMat)
  knob.position.y = 0.01
  pointer.add(cone, knob)
  tilt.add(pointer)

  /* ---------- подложка для мягкой тени ---------- */
  const shadowMat = new ShadowMaterial({ opacity: 0.38 })
  const shadowPlane = new Mesh(new PlaneGeometry(9, 9), shadowMat)
  shadowPlane.position.z = -0.9
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  /* ---------- свет ---------- */
  scene.add(new AmbientLight(0xffffff, 0.15))
  const warm = new PointLight(0xffe2a0, 2.5, 0, 2)
  warm.position.set(-2.4, 2.4, 3.2)
  const cool = new PointLight(0x8fb0ff, 1.5, 0, 2)
  cool.position.set(2.6, -1.2, 3)
  const spot = new SpotLight(0xffffff, 6, 0, 0.7, 1, 2)
  spot.position.set(0.5, 3.2, 4.2)
  spot.castShadow = true
  spot.shadow.mapSize.set(512, 512)
  spot.shadow.radius = 6
  spot.shadow.bias = -0.0004
  spot.target.position.set(0, 0, 0)
  scene.add(warm, cool, spot, spot.target)

  /* ---------- состояние ---------- */
  const parallax = createParallax(!reduced)
  let kickAmount = 0
  let shakeAmount = 0
  let last = performance.now()
  let disposed = false

  const resize = (): void => {
    const parent = canvas.parentElement
    const w = Math.max(1, parent?.clientWidth ?? canvas.clientWidth)
    const h = Math.max(1, parent?.clientHeight ?? canvas.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    parallax.update(dt)
    kickAmount *= Math.exp(-dt * 12)
    pointer.rotation.z = -kickAmount * 0.5
    shakeAmount *= Math.exp(-dt * 4.5)
    const sx = shakeAmount > 0.002 ? (Math.random() - 0.5) * shakeAmount : 0
    const sy = shakeAmount > 0.002 ? (Math.random() - 0.5) * shakeAmount : 0
    camera.position.set(camBase.x + parallax.x * 0.3 + sx, camBase.y - parallax.y * 0.2 + sy, camBase.z)
    camera.lookAt(0, 0.2, 0)
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
    setAngle(deg: number) {
      disc.rotation.z = (-deg * Math.PI) / 180
    },
    kick() {
      kickAmount = 1
    },
    shake() {
      if (!reduced) shakeAmount = 0.35
    },
    dispose() {
      disposed = true
      renderer.setAnimationLoop(null)
      document.removeEventListener('visibilitychange', onVisibility)
      ro.disconnect()
      parallax.dispose()
      disposeObject(scene)
      disposeObject(envScene)
      safeDispose(faceTexture, envRT, pmrem, renderer)
      renderer.forceContextLoss()
    },
  }
}
