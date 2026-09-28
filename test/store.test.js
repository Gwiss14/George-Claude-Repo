'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { apply, emptyState, ActionError } = require('../store');

function started() {
  const s = apply(emptyState(), { type: 'startWorkout', name: 'Push' }, 1000);
  return { s, wid: s.activeWorkoutId };
}

test('starting a workout makes it active and bumps the version', () => {
  const { s, wid } = started();
  assert.equal(s.version, 1);
  assert.equal(s.workouts[0].id, wid);
  assert.equal(s.workouts[0].name, 'Push');
  assert.equal(s.workouts[0].startedAt, 1000);
});

test('only one workout can be in progress', () => {
  const { s } = started();
  assert.throws(() => apply(s, { type: 'startWorkout' }), ActionError);
});

test('exercises and sets can be added, updated, and removed', () => {
  let { s, wid } = started();
  s = apply(s, { type: 'addExercise', workoutId: wid, name: '  Bench press ' });
  const eid = s.workouts[0].exercises[0].id;
  assert.equal(s.workouts[0].exercises[0].name, 'Bench press');

  s = apply(s, { type: 'addSet', workoutId: wid, exerciseId: eid, reps: 8, weight: 60 });
  s = apply(s, { type: 'addSet', workoutId: wid, exerciseId: eid });
  const [first, second] = s.workouts[0].exercises[0].sets;
  assert.deepEqual([second.reps, second.weight], [8, 60], 'new set copies previous values');

  s = apply(s, { type: 'updateSet', workoutId: wid, exerciseId: eid, setId: first.id, done: true, weight: 62.5 }, 5000);
  const updated = s.workouts[0].exercises[0].sets[0];
  assert.equal(updated.done, true);
  assert.equal(updated.completedAt, 5000);
  assert.equal(updated.weight, 62.5);

  s = apply(s, { type: 'removeSet', workoutId: wid, exerciseId: eid, setId: second.id });
  assert.equal(s.workouts[0].exercises[0].sets.length, 1);

  s = apply(s, { type: 'removeExercise', workoutId: wid, exerciseId: eid });
  assert.equal(s.workouts[0].exercises.length, 0);
});

test('finishing a workout clears the active workout', () => {
  let { s, wid } = started();
  s = apply(s, { type: 'finishWorkout', workoutId: wid }, 9000);
  assert.equal(s.activeWorkoutId, null);
  assert.equal(s.workouts[0].endedAt, 9000);
  assert.throws(() => apply(s, { type: 'finishWorkout', workoutId: wid }), ActionError);
});

test('invalid actions throw and leave state untouched', () => {
  const { s, wid } = started();
  const snapshot = structuredClone(s);
  assert.throws(() => apply(s, { type: 'nope' }), ActionError);
  assert.throws(() => apply(s, { type: 'addExercise', workoutId: wid, name: '   ' }), ActionError);
  assert.throws(() => apply(s, { type: 'addExercise', workoutId: 'missing', name: 'Squat' }), ActionError);
  const s2 = apply(s, { type: 'addExercise', workoutId: wid, name: 'Squat' });
  const eid = s2.workouts[0].exercises[0].id;
  assert.throws(() => apply(s2, { type: 'addSet', workoutId: wid, exerciseId: eid, reps: -1 }), ActionError);
  assert.throws(() => apply(s2, { type: 'addSet', workoutId: wid, exerciseId: eid, weight: 'heavy' }), ActionError);
  assert.deepEqual(s, snapshot);
});
