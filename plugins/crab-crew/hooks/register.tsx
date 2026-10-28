import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Progress } from '../types'

const EMPTY: Progress = { done: 0, total: 0, steps: 0, current: null }
const progress = atom({ plugin: 'crab-crew', key: 'progress' } as const, EMPTY)

const WORDS = ['Scuttling', 'Pinching', 'Sidestepping', 'Molting', 'Burrowing', 'Clicking claws', 'Tide-pooling', 'Shell-shocking']
const PAST = ['Scuttled', 'Pinched', 'Sidestepped', 'Molted', 'Burrowed']
const WIDTH = 24

const pick = (list: string[], seed: string) => {
  let n = 0
  for (const c of seed) n = (n * 31 + c.charCodeAt(0)) >>> 0
  return list[n % list.length] ?? list[0] ?? seed
}

export const register: Register = on => {
  // Task ids the model marked done through TaskUpdate, and how many it created.
  let created = 0
  const finished = new Set<string>()

  on('prompt.submit', async ($, e, next) => {
    created = 0
    finished.clear()
    await update($, progress, () => EMPTY)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'TodoWrite') {
      const doing = e.todos.find(t => t.status === 'in_progress')
      await update($, progress, p => ({
        ...p,
        total: e.todos.length,
        done: e.todos.filter(t => t.status === 'completed').length,
        current: doing ? doing.activeForm : p.current,
      }))
    } else if (e.tool === 'TaskCreate') {
      created += 1
      await update($, progress, p => ({ ...p, total: created, done: finished.size }))
    } else if (e.tool === 'TaskUpdate') {
      if (e.status === 'completed') finished.add(e.taskId)
      if (e.status === 'deleted') created = Math.max(0, created - 1)
      await update($, progress, p => ({
        ...p,
        total: Math.max(created, finished.size),
        done: finished.size,
        current: e.status === 'in_progress' && e.activeForm ? e.activeForm : p.current,
      }))
    }
    await update($, progress, p => ({ ...p, steps: p.steps + 1 }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Subagents show up as crabs.
  on('agent.spawn', ($, e, next) =>
    next({ ...e, description: e.description.startsWith('🦀') ? e.description : `🦀 ${e.description}` }),
  ).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Spinner' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, word: pick(WORDS, e.props.word), suffix: '… 🦀' } }),
  )

  on('ui.render', { component: 'TurnDuration' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, word: `🦀 ${pick(PAST, e.props.word)}` } }),
  )

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !e.props.isWorking) return next(e)

    const p = await read($, progress)
    const { Box, Text } = $.ui.resolve(e)

    if (p.total > 0) {
      const filled = Math.round((p.done / p.total) * WIDTH)
      const crab = Math.min(filled, WIDTH - 1)
      const track = '='.repeat(crab) + '🦀' + '·'.repeat(Math.max(0, WIDTH - crab - 1))
      const percent = Math.round((p.done / p.total) * 100)
      return (
        <Box flexDirection="column">
          <Text>
            <Text color="red">[{track}]</Text> {percent}% · {p.done}/{p.total} tasks
          </Text>
          {p.current ? <Text dimColor>  {p.current}…</Text> : null}
        </Box>
      )
    }

    // No task list yet: the crab walks back and forth with each tool call.
    const span = WIDTH - 1
    const phase = p.steps % (span * 2)
    const at = phase <= span ? phase : span * 2 - phase
    const track = '·'.repeat(at) + '🦀' + '·'.repeat(span - at)
    return (
      <Text>
        <Text color="red">[{track}]</Text> <Text dimColor>coding… {p.steps} steps</Text>
      </Text>
    )
  })
}
