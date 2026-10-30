import type { BufferGeometry, Material, Object3D, Texture } from 'three'

interface Disposable {
  dispose: () => void
}

/** Освобождает геометрии, материалы и текстуры всей иерархии объекта */
export function disposeObject(root: Object3D): void {
  root.traverse((obj) => {
    const withGeo = obj as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] }
    withGeo.geometry?.dispose()
    const mats = withGeo.material ? (Array.isArray(withGeo.material) ? withGeo.material : [withGeo.material]) : []
    for (const m of mats) {
      for (const value of Object.values(m)) {
        if (value && typeof value === 'object' && 'isTexture' in value) (value as Texture).dispose()
      }
      m.dispose()
    }
  })
}

export function safeDispose(...items: (Disposable | null | undefined)[]): void {
  items.forEach((i) => i?.dispose())
}
