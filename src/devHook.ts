/** Только для разработки и автотестов: импортируется под import.meta.env.DEV и не попадает в сборку */
import { debug, timing, useGame, wheelBridge } from './composables/useGame'

declare global {
  interface Window {
    __game: {
      game: ReturnType<typeof useGame>
      debug: typeof debug
      timing: typeof timing
      wheelBridge: typeof wheelBridge
    }
  }
}

window.__game = { game: useGame(), debug, timing, wheelBridge }
