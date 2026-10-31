import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'work-bar',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 3, bodyColumns: 80, scroll: { offset: 0, bodyRows: 3 }, view: {} },
} as const

test('the bar fills by tasks done, ticks, then shows the finish line', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: '' }))
  // Stands for the engine's own drawing when the mod has nothing to show.
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })

  await $.prompt.submit({ text: 'build it' })
  await $.tool.call({ tool: 'TaskCreate', subject: 'One', description: 'a' })
  await $.tool.call({ tool: 'TaskCreate', subject: 'Two', description: 'b' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'in_progress', activeForm: 'Doing one' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
  await clock.advance(65_000)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const line = await ui.find({ type: 'Text' })
    expect(line?.text).toContain('50% · 1/2')
    expect(line?.text).toContain('Doing one')
    expect(line?.text).toContain('4 tools')
    expect(line?.text).toContain('1m 05s')
    await ui.unmount()
  }

  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 65_000, isAborted: false, turnId: 't1' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Done in 1m 05s · 4 tools')
  await ui.unmount()

  // The finished line clears itself a few seconds later.
  await clock.advance(7_000)
  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await after.find({ type: 'Text' }))?.text).toBe('engine')
  await after.unmount()
})

test('nothing shows before the first prompt', async ($, on) => {
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
