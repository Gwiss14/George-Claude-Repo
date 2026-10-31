export type Work = {
  phase: 'idle' | 'running' | 'done'
  seconds: number
  tools: number
  done: number
  total: number
  current: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'work-bar': { work: Shaped<Work> }
  }
}
