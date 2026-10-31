export type Agent = {
  id: string
  description: string
  type: string
  model: string
  status: string
  startedAt: number
  endedAt?: number
  tools: number
}

declare module 'claude-code' {
  interface PluginState {
    'agents-live': { agents: Shaped<Agent[]>; now: number }
  }
}
