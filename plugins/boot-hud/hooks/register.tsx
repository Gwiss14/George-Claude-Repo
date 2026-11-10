import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Hud } from '../types'

const IDLE: Hud = { phase: 'idle', frame: 0, tools: 0, tool: null, toolFrame: -1 }
// Bump the shape tag whenever Hud's fields change, so an older stored value is ignored.
const hud = atom({ plugin: 'boot-hud', key: 'hud' } as const, IDLE, { shape: 'hud-1' })

const FRAME_MS = 250
const BOOT_FRAMES = 4 // the boot line holds for the first second
const DECODE_FRAMES = 4 // a tool name takes a second to decode
const HEAD = 5
const TRAIL = 2
const LIGHTS = 5
const GLYPHS = '#%&$@0123456789ABCDEFXZ<>/\\'
const BOOT_WORDS = ['BOOT', 'LINK', 'READY']

// Every frame is a pure function of the frame number, so the same frame always draws the same HUD.
function hash(n: number): number {
  let x = Math.imul(n + 1, 0x9e3779b1)
  x ^= x >>> 15
  x = Math.imul(x, 0x85ebca6b)
  x ^= x >>> 13
  return x >>> 0
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const clock = (frame: number) => {
  const s = Math.floor((frame * FRAME_MS) / 1000)
  return `T+${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}
const calls = (n: number) => `${n} call${n === 1 ? '' : 's'}`

// `mcp__github__create_issue` reads as `create_issue`; long names are cut to fit a phone.
function label(tool: string): string {
  const name = tool.split('__').pop() || tool
  return name.length > 18 ? `${name.slice(0, 17)}…` : name
}

function boot(frame: number): string {
  const lit = Math.min(BOOT_WORDS.length, frame + 1)
  return BOOT_WORDS.map((w, i) => (i < lit ? w : '·'.repeat(w.length))).join(' ▸ ')
}

// A lit block bounces between the ends of the bar, a fading trail behind it.
function scan(frame: number, width: number): string {
  const span = width - HEAD
  const t = frame % (span * 2)
  const forward = t < span
  const pos = forward ? t : span * 2 - t
  const cells = Array<string>(width).fill('░')
  for (let i = 1; i <= TRAIL; i++) {
    const at = forward ? pos - i : pos + HEAD - 1 + i
    if (at >= 0 && at < width) cells[at] = '▒'
  }
  for (let i = 0; i < HEAD; i++) cells[pos + i] = '▓'
  const hex = (hash(frame) & 0xffff).toString(16).toUpperCase().padStart(4, '0')
  return `▐${cells.join('')}▌ SCAN 0x${hex}`
}

// The name resolves left to right; the letters still to come flicker through glyphs.
function decode(s: Hud): string {
  if (s.tool === null) return 'STANDBY'
  const name = label(s.tool)
  const elapsed = s.frame - s.toolFrame
  if (elapsed >= DECODE_FRAMES) return name
  const shown = Math.floor((elapsed / DECODE_FRAMES) * name.length)
  const noise = Array.from(name, (c, i) => (i < shown ? c : GLYPHS[hash(s.frame * 31 + i) % GLYPHS.length]))
  return `${noise.join('')} → ${name}`
}

// One light per recent call: the newest is half-lit while its name decodes.
function lights(s: Hud): string {
  const on = Math.min(s.tools, LIGHTS)
  const decoding = s.tools > 0 && s.frame - s.toolFrame < DECODE_FRAMES
  return Array.from({ length: LIGHTS }, (_, i) => (i >= on ? '○' : decoding && i === on - 1 ? '◎' : '◉')).join(' ')
}

export const register: Register = on => {
  let startedAt = 0
  let tick: Timer | null = null
  let fade: Timer | null = null

  const stopTimers = () => {
    tick?.cancel(); tick = null
    fade?.cancel(); fade = null
  }

  on('prompt.submit', async ($, e, next) => {
    stopTimers()
    startedAt = await $.clock.now()
    await update($, hud, () => ({ ...IDLE, phase: 'running' }))
    tick = $.clock.every(FRAME_MS, async () => {
      const frame = Math.floor(((await $.clock.now()) - startedAt) / FRAME_MS)
      await update($, hud, s => (s.phase === 'running' ? { ...s, frame } : s))
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const frame = Math.floor(((await $.clock.now()) - startedAt) / FRAME_MS)
    await update($, hud, s =>
      s.phase === 'running' ? { ...s, frame, tools: s.tools + 1, tool: e.tool, toolFrame: frame } : s,
    )
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    stopTimers()
    const frame = Math.floor(((await $.clock.now()) - startedAt) / FRAME_MS)
    await update($, hud, (s): Hud => (s.phase === 'running' ? { ...s, phase: 'done', frame } : s))
    // The finish line stays up for a few seconds, then clears.
    fade = $.clock.after(6000, () => { fade = null; void update($, hud, s => (s.phase === 'done' ? IDLE : s)) })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, hud)
    if (e.props.hasSurvey || s.phase === 'idle') return next(e)

    const { Box, Text } = $.ui.resolve(e)

    if (s.phase === 'done') {
      return <Text color="green">■ COMPLETE · {clock(s.frame)} · {calls(s.tools)}</Text>
    }
    if (s.frame < BOOT_FRAMES) {
      return <Text color="green" bold>{boot(s.frame)}</Text>
    }

    const toolRow = `TOOL  ${decode(s)}  ${clock(s.frame)}`
    // With no room for three rows, the tool row alone carries the HUD.
    if (e.props.maxRows < 3) return <Text color="green">{toolRow}</Text>

    // The bar gives up cells on a narrow screen so its row never wraps.
    const width = Math.max(HEAD + 3, Math.min(20, e.props.bodyColumns - 14))
    return (
      <Box flexDirection="column">
        <Text color="green">{scan(s.frame, width)}</Text>
        <Text color="green" bold>{toolRow}</Text>
        <Text dimColor>SYS   {lights(s)}   {calls(s.tools)}</Text>
      </Box>
    )
  })
}
