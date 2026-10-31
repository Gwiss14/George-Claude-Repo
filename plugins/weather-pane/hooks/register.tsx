import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Day, Report, Weather } from '../types'

const PANE = 'weather'
const EVERY_MS = 15 * 60 * 1000
// Change the tag when a report's fields change: it declines what an earlier
// version stored, which outlives a reload.
const report = atom(
  { plugin: 'weather-pane', key: 'report' } as const,
  { weather: null, error: null, isLoading: false } as Report,
  { shape: 'report-1' },
)

// WMO weather codes, as Open-Meteo reports them.
const CODES: [number[], string, string][] = [
  [[0], '☀️', 'Clear'],
  [[1, 2], '🌤️', 'Partly cloudy'],
  [[3], '☁️', 'Overcast'],
  [[45, 48], '🌫️', 'Fog'],
  [[51, 53, 55, 56, 57], '🌦️', 'Drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', 'Rain'],
  [[71, 73, 75, 77, 85, 86], '❄️', 'Snow'],
  [[95, 96, 99], '⛈️', 'Thunderstorm'],
]
const describe = (code: number) => CODES.find(([cs]) => cs.includes(code)) ?? [[], '🌡️', 'Unknown']

const f = (c: number) => `${Math.round((c * 9) / 5 + 32)}°F`
const both = (c: number) => `${f(c)} / ${Math.round(c)}°C`
const weekday = (date: string) =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${date}T12:00:00`).getDay()]

const getJson = async ($: EngineInterface, url: string) => {
  const res = await $.http.fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`)
  return JSON.parse(res.text)
}

const refresh = async ($: EngineInterface) => {
  const city = (await $.store.get('city')) as string | undefined
  if (!city) return

  await update($, report, r => ({ ...r, isLoading: true }))
  try {
    const geo = await getJson(
      $,
      `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`,
    )
    const hit = geo.results?.[0]
    if (!hit) throw new Error(`No place called "${city}"`)

    const fc = await getJson(
      $,
      'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${hit.latitude}&longitude=${hit.longitude}&timezone=auto&forecast_days=5` +
        '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    )
    const days: Day[] = fc.daily.time.map((date: string, i: number) => ({
      date,
      code: fc.daily.weather_code[i],
      max: fc.daily.temperature_2m_max[i],
      min: fc.daily.temperature_2m_min[i],
      rain: fc.daily.precipitation_probability_max[i] ?? 0,
    }))
    const weather: Weather = {
      place: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(', '),
      temp: fc.current.temperature_2m,
      feels: fc.current.apparent_temperature,
      code: fc.current.weather_code,
      wind: fc.current.wind_speed_10m,
      humidity: fc.current.relative_humidity_2m,
      days,
      fetchedAt: await $.clock.now(),
    }
    await update($, report, () => ({ weather, error: null, isLoading: false }))
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await update($, report, r => ({ ...r, error, isLoading: false }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'weather',
      description: 'Show the weather pane; give a city to change it, e.g. /weather Chicago',
      argumentHint: '[city]',
    })
    void refresh($)
    $.clock.every(EVERY_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'weather' }, async ($, e) => {
    const city = e.args.trim()
    if (city) await $.store.set('city', city)

    const saved = (await $.store.get('city')) as string | undefined
    await $.ui.open({ id: PANE, title: 'Weather' })
    if (!saved) return { text: 'Give a city first, e.g. /weather Chicago' }

    void refresh($)
    return { text: `Weather pane opened for ${saved}.` }
  })

  // One line above the prompt, for screens that draw no panes.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const city = await $.store.get('city')
    if (e.props.hasSurvey || !city) return next(e)

    const { Text } = $.ui.resolve(e)
    const { weather, error, isLoading } = await read($, report)
    if (!weather) {
      return <Text dimColor>{isLoading ? 'Weather: loading…' : `Weather: couldn't load (${error ?? 'not yet fetched'})`}</Text>
    }
    const [, icon, label] = describe(weather.code)
    const today = weather.days[0]

    return (
      <Text dimColor>
        {icon} {weather.place}: {f(weather.temp)} {label}
        {today ? ` · H ${f(today.max)} L ${f(today.min)} · ${today.rain}% rain` : ''}
      </Text>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const { weather, error, isLoading } = await read($, report)

    if (!weather) {
      return (
        <Box flexDirection="column">
          <Text dimColor>
            {isLoading ? 'Loading…' : error ? `Couldn't get the weather: ${error}` : 'Run /weather <city> to pick a place.'}
          </Text>
        </Box>
      )
    }

    const [, icon, label] = describe(weather.code)
    const time = new Date(weather.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    return (
      <Box flexDirection="column">
        <Text bold>{weather.place}</Text>
        <Text>
          {icon} {both(weather.temp)} · {label}
        </Text>
        <Text dimColor>
          Feels like {f(weather.feels)} · wind {Math.round(weather.wind * 0.621)} mph · humidity {weather.humidity}%
        </Text>
        <Text> </Text>
        {weather.days.map(d => (
          <Text>
            {weekday(d.date)} {describe(d.code)[1]} {f(d.max)} / {f(d.min)} · {d.rain}% rain
          </Text>
        ))}
        <Text> </Text>
        <Box>
          <Text dimColor>
            {error ? `Last update failed: ${error}. ` : ''}Updated {time}{' '}
          </Text>
          <Button key="refresh" label={isLoading ? 'Refreshing…' : 'Refresh'} onPress={() => void refresh($)} />
        </Box>
      </Box>
    )
  })
}
