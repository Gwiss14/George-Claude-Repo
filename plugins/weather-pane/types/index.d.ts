export type Day = { date: string; code: number; max: number; min: number; rain: number }

export type Weather = {
  place: string
  temp: number
  feels: number
  code: number
  wind: number
  humidity: number
  days: Day[]
  fetchedAt: number
}

export type Report = { weather: Weather | null; error: string | null; isLoading: boolean }

declare module 'claude-code' {
  interface PluginState {
    'weather-pane': { report: Shaped<Report> }
  }
}
