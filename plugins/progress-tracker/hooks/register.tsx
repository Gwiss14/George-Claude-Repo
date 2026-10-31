import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Step } from '../types'

const PANE = 'progress'
const WIDTH = 12
// Change the tag when a step's fields change: it declines what an earlier
// version stored, which outlives a reload.
const steps = atom({ plugin: 'progress-tracker', key: 'steps' } as const, [], {
  shape: 'steps-1',
})

const bar = (done: number, total: number) => {
  const full = total ? Math.round((done / total) * WIDTH) : 0
  return '█'.repeat(full) + '░'.repeat(WIDTH - full)
}

const mark = (s: Step) => (s.status === 'completed' ? '✓' : s.status === 'in_progress' ? '▶' : '○')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'progress',
      description: "Open a pane with Claude's full task list",
    })

    return next(e)
  })

  on('command.run', { command: 'progress' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Progress' })

    return { text: 'Progress pane opened.' }
  })

  // A new request starts a fresh list once the last one was finished.
  on('prompt.submit', async ($, e, next) => {
    await update($, steps, list => (list.length && list.every(s => s.status === 'completed') ? [] : list))

    return next(e)
  })

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      const step: Step = {
        id: ran.result.task.id,
        title: e.subject,
        active: e.activeForm ?? e.subject,
        status: 'pending',
      }
      await update($, steps, list => [...list.filter(s => s.id !== step.id), step])
    }

    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      const status = e.status
      await update($, steps, list =>
        status === 'deleted'
          ? list.filter(s => s.id !== e.taskId)
          : list.map(s =>
              s.id === e.taskId
                ? {
                    ...s,
                    title: e.subject ?? s.title,
                    active: e.activeForm ?? s.active,
                    status: status ?? s.status,
                  }
                : s,
            ),
      )
    }

    return ran
  })

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      await update($, steps, () =>
        e.todos.map((t, i) => ({ id: `todo-${i}`, title: t.content, active: t.activeForm, status: t.status })),
      )
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, steps)
    if (e.props.hasSurvey || list.length === 0) return next(e)

    const { Text } = $.ui.resolve(e)
    const done = list.filter(s => s.status === 'completed').length
    const now = list.find(s => s.status === 'in_progress')
    const tail =
      done === list.length ? 'All done' : now ? `Now: ${now.active}` : `Next: ${list.find(s => s.status === 'pending')?.title ?? ''}`

    return (
      <Text dimColor>
        {bar(done, list.length)} {done}/{list.length} · {tail}
      </Text>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, steps)
    const done = list.filter(s => s.status === 'completed').length

    return (
      <Box flexDirection="column">
        {list.length === 0 ? (
          <Text dimColor>No tasks yet. They show up here when Claude plans multi-step work.</Text>
        ) : (
          <Text bold>
            {bar(done, list.length)} {done}/{list.length}
          </Text>
        )}
        {list.map(s => (
          <Text dimColor={s.status === 'completed'} bold={s.status === 'in_progress'}>
            {mark(s)} {s.status === 'in_progress' ? s.active : s.title}
          </Text>
        ))}
      </Box>
    )
  })
}
