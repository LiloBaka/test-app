const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createElement, useRef, useState } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { useFavorites } = require('../.expo/tests/hooks/useFavorites.js');
const { filterMatches } = require('../.expo/tests/utils/matches.js');
const fixture = require('../data/matches.json');

// React сам выполняет хук и обрабатывает очередь обновлений. DOM и моки useState не нужны.
function runScenario(actions = []) {
  const renders = [];
  function Probe() {
    const favorites = useFavorites();
    const [screen, setScreen] = useState({ matches: fixture.matches, filter: 'all' });
    const step = useRef(0);
    renders.push({ favorites, screen });
    if (step.current < actions.length) {
      actions[step.current++]({ ...favorites, screen, setScreen });
    }
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  assert.equal(renders.length, actions.length + 1);
  return renders;
}

test('изначально ни один матч не в избранном', () => {
  const [{ favorites }] = runScenario();
  assert.deepEqual(favorites.favorites, []);
  for (const match of fixture.matches) assert.equal(favorites.isFavorite(match.id), false);
});

test('добавление и удаление затрагивает только выбранные ID без мутации state', () => {
  const renders = runScenario([
    ({ toggle }) => toggle('m1'),
    ({ toggle }) => toggle('m2'),
    ({ toggle }) => toggle('m1'),
    ({ toggle }) => toggle('m2'),
  ]);
  const expected = [[], ['m1'], ['m1', 'm2'], ['m2'], []];
  renders.forEach(({ favorites }, index) => {
    assert.deepEqual(favorites.favorites, expected[index]);
    for (const match of fixture.matches) {
      assert.equal(favorites.isFavorite(match.id), expected[index].includes(match.id));
    }
    if (index > 0) assert.notEqual(favorites.favorites, renders[index - 1].favorites.favorites);
  });
});

test('быстрые нажатия в одной очереди не теряют обновления и не создают дубликаты', () => {
  const renders = runScenario([
    ({ toggle }) => {
      toggle('m1');
      toggle('m2');
      toggle('m1');
      toggle('m3');
    },
  ]);
  assert.deepEqual(renders[1].favorites.favorites, ['m2', 'm3']);
});

test('повторное нажатие одним обработчиком возвращает пустое избранное', () => {
  const renders = runScenario([
    ({ toggle }) => { toggle('m1'); toggle('m1'); },
  ]);
  assert.deepEqual(renders[1].favorites.favorites, []);
});

test('выбор сохраняется при фильтрации и замене списка новыми объектами', () => {
  const renders = runScenario([
    ({ toggle }) => toggle('m1'),
    ({ setScreen }) => setScreen(previous => ({ ...previous, filter: 'scheduled' })),
    ({ screen, isFavorite, setScreen }) => {
      assert.equal(filterMatches(screen.matches, screen.filter).some(m => m.id === 'm1'), false);
      assert.equal(isFavorite('m1'), true);
      setScreen(previous => ({ ...previous, matches: structuredClone(fixture.matches) }));
    },
    ({ setScreen }) => setScreen(previous => ({ ...previous, filter: 'all' })),
  ]);
  const final = renders.at(-1);
  assert.equal(final.favorites.isFavorite('m1'), true);
  assert.notEqual(final.screen.matches[0], fixture.matches[0]);
  assert.deepEqual(
    filterMatches(final.screen.matches, final.screen.filter)
      .filter(m => final.favorites.isFavorite(m.id)).map(m => m.id),
    ['m1'],
  );
});
