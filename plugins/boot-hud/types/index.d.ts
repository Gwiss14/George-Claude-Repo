export type Hud = {
  phase: 'idle' | 'running' | 'done'
  // Animation frame since the prompt was submitted; four to the second.
  frame: number
  tools: number
  // The latest tool's name, and the frame it fired on (-1 before any tool).
  tool: string | null
  toolFrame: number
}

declare module 'claude-code' {
  interface PluginState {
    'boot-hud': { hud: Shaped<Hud> }
  }
}
