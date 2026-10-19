const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getElapsedSeconds, subscribeElapsedSeconds } = require('../.expo/tests/utils/elapsedTime.js');

test('прошедшее время округляется вниз и не бывает отрицательным', () => {
  assert.equal(getElapsedSeconds(10_000, 10_000), 0);
  assert.equal(getElapsedSeconds(10_000, 10_999), 0);
  assert.equal(getElapsedSeconds(10_000, 11_000), 1);
  assert.equal(getElapsedSeconds(10_000, 13_800), 3);
  assert.equal(getElapsedSeconds(10_000, 9_000), 0);
});

test('подписка начинает с 0 и обновляется каждую секунду', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 10_000 });
  const values = [];
  const stop = subscribeElapsedSeconds(Date.now(), seconds => values.push(seconds));
  t.after(stop);
  assert.deepEqual(values, [0]);
  t.mock.timers.tick(1000);
  assert.deepEqual(values, [0, 1]);
  t.mock.timers.tick(1000);
  assert.deepEqual(values, [0, 1, 2]);
});

test('первое значение учитывает переданный since, даже если загрузка была раньше', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 17_900 });
  const values = [];
  const stop = subscribeElapsedSeconds(10_000, seconds => values.push(seconds));
  t.after(stop);
  assert.deepEqual(values, [7]);
  t.mock.timers.tick(1000);
  assert.deepEqual(values, [7, 8]);
});

test('после задержки время вычисляется по часам, а не по числу тиков', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 10_000 });
  const values = [];
  const stop = subscribeElapsedSeconds(10_000, seconds => values.push(seconds));
  t.after(stop);
  t.mock.timers.setTime(40_000);
  t.mock.timers.tick(1000);
  assert.equal(values.at(-1), 31);
});

test('очистка прекращает вызовы обработчика', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 10_000 });
  const values = [];
  const stop = subscribeElapsedSeconds(10_000, seconds => values.push(seconds));
  t.mock.timers.tick(1000);
  stop();
  t.mock.timers.tick(5000);
  assert.deepEqual(values, [0, 1]);
});

test('новый since сбрасывает время, после очистки работает только новый таймер', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 10_000 });
  const oldValues = [];
  const stopOld = subscribeElapsedSeconds(10_000, seconds => oldValues.push(seconds));
  t.mock.timers.tick(1000);
  stopOld();

  const newValues = [];
  const stopNew = subscribeElapsedSeconds(Date.now(), seconds => newValues.push(seconds));
  t.after(stopNew);
  assert.deepEqual(newValues, [0]);
  t.mock.timers.tick(1000);
  assert.deepEqual(oldValues, [0, 1]);
  assert.deepEqual(newValues, [0, 1]);
});
