# George-Claude-Repo
For Claude Code on my phone 

## Workout Tracker

A real-time workout tracker. Open it on your phone and laptop (or share it with a
training partner) and every change — starting a workout, adding exercises,
logging sets, ticking them off — shows up instantly on every open device.

### Features

- **Live sync** across all connected devices using Server-Sent Events, with a
  live/reconnecting indicator and automatic reconnects
- **Active workout view** with a running clock, exercises, and sets (weight × reps)
  — new sets copy the previous set's numbers
- **Rest timer** that starts when you complete a set (±15s / skip, vibrates when done)
- **History and stats** — workouts this week, total workouts, total volume, and
  per-workout breakdowns
- Exercise-name autocomplete from your past workouts
- Mobile-first layout with light and dark mode
- Data saved to `data/workouts.json` — no database, **no dependencies**

### Run it

Requires Node.js 18.17+.

```bash
npm start            # http://localhost:3000
PORT=8080 npm start  # custom port
DATA_FILE=/path/to/workouts.json npm start
npm test
```

To use it from your phone, run it on a computer on the same Wi-Fi and open
`http://<computer-ip>:3000`.

> There is no login: anyone who can reach the server can view and edit the
> workouts. Keep it on a trusted network, or put it behind a reverse proxy with auth.

### How it works

| Endpoint            | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `GET /api/state`    | Current state as JSON                                |
| `GET /api/events`   | SSE stream; sends a full `state` event on every change |
| `POST /api/actions` | Apply an action, e.g. `{"type":"addSet","workoutId":"…","exerciseId":"…"}` |

All changes go through the reducer in `store.js` (`startWorkout`,
`finishWorkout`, `renameWorkout`, `deleteWorkout`, `addExercise`,
`removeExercise`, `addSet`, `updateSet`, `removeSet`). The server validates the
action, saves the new state, and broadcasts it to every client. Each state
carries a `version` so clients ignore out-of-order updates.
