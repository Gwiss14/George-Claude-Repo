import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Work } from '../types'

const IDLE: Work = { phase: 'idle', seconds: 0, tools: 0, done: 0, total: 0, current: null }
// Bump the shape tag whenever Work's fields change, so an older stored value is ignored.
const work = atom({ plugin: 'work-bar', key: 'work' } as const, IDLE, { shape: 'work-1' })

const WIDTH = 20
const SWEEP = 5

// Determinate when there is a task list, otherwise a block that sweeps back and forth each second.
function bar(w: Work): string {
  if (w.phase === 'done') return '█'.repeat(WIDTH)
  if (w.total > 0) {
    const full = Math.round((w.done / w.total) * WIDTH)
    return '█'.repeat(full) + '░'.repeat(WIDTH - full)
  }
  const span = WIDTH - SWEEP
  const t = w.seconds % (span * 2)
  const pos = t <= span ? t : span * 2 - t
  return '░'.repeat(pos) + '▓'.repeat(SWEEP) + '░'.repeat(span - pos)
}

const clock = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`)

export const register: Register = on => {
  let startedAt = 0
  let tick: Timer | null = null
  let fade: Timer | null = null
  let created = 0
  const finished = new Set<string>()

  const stopTimers = () => {
    tick?.cancel(); tick = null
    fade?.cancel(); fade = null
  }

  on('prompt.submit', async ($, e, next) => {
    stopTimers()
    created = 0
    finished.clear()
    startedAt = await $.clock.now()
    await update($, work, () => ({ ...IDLE, phase: 'running' }))
    tick = $.clock.every(1000, async () => {
      const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
      await update($, work, w => (w.phase === 'running' ? { ...w, seconds } : w))
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  // Count every tool call the main loop makes; tasks drive the fill.
  on('tool.call', async ($, e, next) => {
    if (e.tool === 'TaskCreate') created += 1
    else if (e.tool === 'TaskUpdate') {
      if (e.status === 'completed') finished.add(e.taskId)
      if (e.status === 'deleted') { created = Math.max(0, created - 1); finished.delete(e.taskId) }
    }
    await update($, work, w => {
      if (w.phase !== 'running') return w
      let { done, total, current } = w
      if (e.tool === 'TodoWrite') {
        total = e.todos.length
        done = e.todos.filter(t => t.status === 'completed').length
        current = e.todos.find(t => t.status === 'in_progress')?.activeForm ?? current
      } else if (e.tool === 'TaskCreate' || e.tool === 'TaskUpdate') {
        total = Math.max(created, finished.size)
        done = finished.size
        if (e.tool === 'TaskUpdate' && e.status === 'in_progress' && e.activeForm) current = e.activeForm
      }
      return { ...w, tools: w.tools + 1, done, total, current }
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    stopTimers()
    const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
    await update($, work, (w): Work => ({ ...w, phase: 'done', seconds, done: w.total }))
    // The finished bar stays up for a few seconds, then clears.
    fade = $.clock.after(6000, () => { fade = null; void update($, work, w => (w.phase === 'done' ? IDLE : w)) })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const w = await read($, work)
    if (e.props.hasSurvey || w.phase === 'idle') return next(e)

    const { Text } = $.ui.resolve(e)
    const pct = w.total > 0 ? ` ${Math.round((w.done / w.total) * 100)}% · ${w.done}/${w.total}` : ''
    const tools = `${w.tools} tool${w.tools === 1 ? '' : 's'}`

    if (w.phase === 'done') {
      return <Text dimColor>{bar(w)} Done in {clock(w.seconds)} · {tools}</Text>
    }
    return (
      <Text dimColor>
        {bar(w)}{pct} · {w.current ? `${w.current} · ` : ''}{clock(w.seconds)} · {tools}
      </Text>
    )
  })
}
