'use strict';

// Pure state + reducer for the workout tracker. The server applies actions
// here, persists the result, and broadcasts it to every connected client.

const crypto = require('node:crypto');

const id = () => crypto.randomUUID();

function emptyState() {
  return { version: 0, activeWorkoutId: null, workouts: [] };
}

class ActionError extends Error {}

const str = (v, field, max = 80) => {
  if (typeof v !== 'string' || !v.trim()) throw new ActionError(`${field} is required`);
  return v.trim().slice(0, max);
};

const num = (v, field, { min = 0, max = 100000 } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ActionError(`${field} must be a number between ${min} and ${max}`);
  return Math.round(n * 100) / 100;
};

function findWorkout(state, workoutId) {
  const w = state.workouts.find((x) => x.id === workoutId);
  if (!w) throw new ActionError('workout not found');
  return w;
}

function findExercise(state, workoutId, exerciseId) {
  const w = findWorkout(state, workoutId);
  const e = w.exercises.find((x) => x.id === exerciseId);
  if (!e) throw new ActionError('exercise not found');
  return { w, e };
}

function findSet(state, workoutId, exerciseId, setId) {
  const { w, e } = findExercise(state, workoutId, exerciseId);
  const s = e.sets.find((x) => x.id === setId);
  if (!s) throw new ActionError('set not found');
  return { w, e, s };
}

// Applies `action` to a deep copy of `state` and returns the new state.
// Throws ActionError for invalid actions; the original state is untouched.
function apply(state, action, now = Date.now()) {
  if (!action || typeof action.type !== 'string') throw new ActionError('action.type is required');
  const next = structuredClone(state);
  const a = action;

  switch (a.type) {
    case 'startWorkout': {
      if (next.activeWorkoutId) throw new ActionError('a workout is already in progress');
      const w = { id: id(), name: a.name ? str(a.name, 'name') : 'Workout', startedAt: now, endedAt: null, exercises: [] };
      next.workouts.unshift(w);
      next.activeWorkoutId = w.id;
      break;
    }
    case 'finishWorkout': {
      const w = findWorkout(next, a.workoutId);
      if (w.endedAt) throw new ActionError('workout already finished');
      w.endedAt = now;
      if (next.activeWorkoutId === w.id) next.activeWorkoutId = null;
      break;
    }
    case 'renameWorkout':
      findWorkout(next, a.workoutId).name = str(a.name, 'name');
      break;
    case 'deleteWorkout': {
      findWorkout(next, a.workoutId);
      next.workouts = next.workouts.filter((w) => w.id !== a.workoutId);
      if (next.activeWorkoutId === a.workoutId) next.activeWorkoutId = null;
      break;
    }
    case 'addExercise': {
      const w = findWorkout(next, a.workoutId);
      w.exercises.push({ id: id(), name: str(a.name, 'name'), sets: [] });
      break;
    }
    case 'removeExercise': {
      const { w } = findExercise(next, a.workoutId, a.exerciseId);
      w.exercises = w.exercises.filter((e) => e.id !== a.exerciseId);
      break;
    }
    case 'addSet': {
      const { e } = findExercise(next, a.workoutId, a.exerciseId);
      const prev = e.sets[e.sets.length - 1];
      e.sets.push({
        id: id(),
        reps: a.reps !== undefined ? num(a.reps, 'reps', { max: 1000 }) : prev ? prev.reps : 10,
        weight: a.weight !== undefined ? num(a.weight, 'weight', { max: 5000 }) : prev ? prev.weight : 0,
        done: false,
        completedAt: null,
      });
      break;
    }
    case 'updateSet': {
      const { s } = findSet(next, a.workoutId, a.exerciseId, a.setId);
      if (a.reps !== undefined) s.reps = num(a.reps, 'reps', { max: 1000 });
      if (a.weight !== undefined) s.weight = num(a.weight, 'weight', { max: 5000 });
      if (a.done !== undefined) {
        s.done = Boolean(a.done);
        s.completedAt = s.done ? now : null;
      }
      break;
    }
    case 'removeSet': {
      const { e } = findSet(next, a.workoutId, a.exerciseId, a.setId);
      e.sets = e.sets.filter((s) => s.id !== a.setId);
      break;
    }
    default:
      throw new ActionError(`unknown action type: ${a.type}`);
  }

  next.version = state.version + 1;
  return next;
}

module.exports = { apply, emptyState, ActionError };
