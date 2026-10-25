export type Step = { id: string; title: string; active: string; status: 'pending' | 'in_progress' | 'completed' }

declare module 'claude-code' {
  interface PluginState {
    'progress-tracker': { steps: Shaped<Step[]> }
  }
}
