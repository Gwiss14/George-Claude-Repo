export type Progress = { done: number; total: number; steps: number; current: string | null }

declare module 'claude-code' {
  interface PluginState {
    'crab-crew': { progress: Progress }
  }
}
