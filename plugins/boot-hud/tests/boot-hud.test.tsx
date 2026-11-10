import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'boot-hud',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 3, bodyColumns: 80, scroll: { offset: 0, bodyRows: 3 }, view: {} },
} as const

const SURFACES = ['terminal', 'desktop', 'mobile'] as const

test('boots, scans, decodes a tool name, then shows the finish line and clears', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: '' }))
  // Stands for the engine's own drawing when the mod has nothing to show.
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })

  await $.prompt.submit({ text: 'build it' })

  // Frame 1: the boot line has lit two of its three words.
  await clock.advance(250)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text' }))?.text).toBe('BOOT ▸ LINK ▸ ·····')
    await ui.unmount()
  }

  // Frame 8: booted, no tool yet. The block sits eight cells in with its trail behind it.
  await clock.advance(1750)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const rows = (await ui.findAll({ type: 'Text' })).map(r => r.text)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatch(/^▐░{6}▒▒▓{5}░{7}▌ SCAN 0x[0-9A-F]{4}$/)
    expect(rows[1]).toBe('TOOL  STANDBY  T+00:02')
    expect(rows[2]).toBe('SYS   ○ ○ ○ ○ ○   0 calls')
    await ui.unmount()
  }

  // Half a second after Edit fires, half its name has resolved and its light is half-lit.
  await $.tool.call({ tool: 'Edit', file_path: '/a', old_string: 'a', new_string: 'b' })
  await clock.advance(500)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const rows = (await ui.findAll({ type: 'Text' })).map(r => r.text)
    expect(rows[1]).toMatch(/^TOOL  Ed\S\S → Edit  T\+00:02$/)
    expect(rows[2]).toBe('SYS   ◎ ○ ○ ○ ○   1 call')
    await ui.unmount()
  }

  // A second after it fired, the name stands and the light is full.
  await clock.advance(500)
  {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const rows = (await ui.findAll({ type: 'Text' })).map(r => r.text)
    expect(rows[1]).toBe('TOOL  Edit  T+00:03')
    expect(rows[2]).toBe('SYS   ◉ ○ ○ ○ ○   1 call')
    await ui.unmount()
  }

  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 3000, isAborted: false, turnId: 't1' })
  const done = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await done.find({ type: 'Text' }))?.text).toBe('■ COMPLETE · T+00:03 · 1 call')
  await done.unmount()

  // The finish line clears itself a few seconds later.
  await clock.advance(7000)
  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await after.find({ type: 'Text' }))?.text).toBe('engine')
  await after.unmount()
})

test('the same frame always draws the same scan row', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.prompt.submit({ text: 'go' })
  await clock.advance(5000)
  const first = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const a = (await first.find({ type: 'Text' }))?.text
  await first.unmount()
  const second = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await second.find({ type: 'Text' }))?.text).toBe(a)
  await second.unmount()
})

test('a narrow or short band still fits', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))

  await $.prompt.submit({ text: 'go' })
  await $.tool.call({ tool: 'mcp__github__create_pull_request_review_comment' })
  await clock.advance(2000)

  // A phone-width band: the bar shrinks so the scan row stays inside it.
  const narrow = await $.ui.mount({ ...BAND, surface: 'mobile', props: { ...BAND.props, bodyColumns: 30 } })
  const rows = (await narrow.findAll({ type: 'Text' })).map(r => r.text)
  expect(rows[0]).toMatch(/^▐.{16}▌ SCAN 0x[0-9A-F]{4}$/)
  expect([...rows[0]!].length).toBeLessThanOrEqual(30)
  // An MCP tool shows its own name, cut to fit.
  expect(rows[1]).toBe('TOOL  create_pull_reque…  T+00:02')
  await narrow.unmount()

  // Two rows of room: the tool row alone.
  const short = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 2 } })
  expect((await short.findAll({ type: 'Text' })).map(r => r.text)).toEqual(['TOOL  create_pull_reque…  T+00:02'])
  await short.unmount()
})

test('nothing shows before the first prompt', async ($, on) => {
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
