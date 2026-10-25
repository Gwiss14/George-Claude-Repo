import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Agent } from '../types'

const PANE = 'agents-live'
const LIVE = ['pending', 'running', 'waiting']
// Change the tag when an agent's fields change: it declines what an earlier
// version stored, which outlives a reload.
const agents = atom({ plugin: 'agents-live', key: 'agents' } as const, [], {
  shape: 'agents-1',
})
const now = atom({ plugin: 'agents-live', key: 'now' } as const, 0)

const isLive = (a: Agent) => LIVE.includes(a.status)

const elapsed = (a: Agent, at: number) => {
  const s = Math.max(0, Math.round(((a.endedAt ?? at) - a.startedAt) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

const shortModel = (id: string) =>
  /(fable|opus|sonnet|haiku)/i.exec(id)?.[1]?.toLowerCase() ?? id

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agents-live',
      description: 'Open the pane of subagents running in this session',
    })
    await $.command.register({
      name: 'pane-check',
      description: 'Say whether this screen can show panes, and why not',
    })

    // Sync statuses from the engine every 2s while anything runs.
    $.clock.every(2000, async () => {
      const list = await read($, agents)
      if (!list.some(isLive)) return

      const at = await $.clock.now()
      const known = new Map((await $.agent.list()).map(a => [a.id, a.status]))
      await update($, agents, all =>
        all.map(a => {
          if (!isLive(a)) return a
          const status = known.get(a.id) ?? 'completed'
          return LIVE.includes(status) ? { ...a, status } : { ...a, status, endedAt: at }
        }),
      )
      await update($, now, () => at)
    })

    return next(e)
  })

  on('command.run', { command: 'agents-live' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agents' })

    return { text: 'Agents pane opened.' }
  })

  on('command.run', { command: 'pane-check' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Agents' })
    const panes = await $.ui.panes()

    return {
      text: opened.isPlaced
        ? `Pane placed: it is drawn on this screen. Open panes: ${panes.map(p => p.id).join(', ')}`
        : `Pane not placed: ${opened.reason}`,
    }
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (!result.agentId) return result

    const agent: Agent = {
      id: result.agentId,
      description: e.description || e.subagentType,
      type: e.subagentType,
      model: result.model,
      status: 'running',
      startedAt: await $.clock.now(),
      tools: 0,
    }
    await update($, agents, list => [...list, agent].slice(-50))
    void $.ui.open({ id: PANE, title: 'Agents' })

    return result
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) {
      await update($, agents, list =>
        list.map(a => (a.id === e.agentId ? { ...a, tools: a.tools + 1 } : a)),
      )
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, agents)
    const at = Math.max(await read($, now), ...list.map(a => a.endedAt ?? a.startedAt))
    const running = list.filter(isLive).length
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 4)

    return (
      <Box flexDirection="column">
        <Text bold>
          {running} running · {list.length - running} done
        </Text>
        {list.length === 0 && <Text dimColor>No agents yet in this session.</Text>}
        {list.slice(-room).reverse().map(a => (
          <Text dimColor={!isLive(a)} color={a.status === 'failed' || a.status === 'killed' ? 'red' : undefined}>
            {isLive(a) ? '●' : a.status === 'completed' ? '✓' : '✗'} {a.description} · {a.type} ·{' '}
            {shortModel(a.model)} · {a.tools} tools · {elapsed(a, at)}
          </Text>
        ))}
      </Box>
    )
  })
}
