const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');
const fixture = require('../data/matches.json');
const { parseMatchesResponse } = require('../.expo/tests/api/matches.js');
const {
  filterMatches, formatMatchDate, formatScore, getMatchStatus,
} = require('../.expo/tests/utils/matches.js');

test('исходные данные: фильтры возвращают 8/3/3 матчей', () => {
  const { matches } = parseMatchesResponse(fixture);
  assert.equal(filterMatches(matches, 'all').length, 8);
  assert.deepEqual(filterMatches(matches, 'scheduled').map(m => m.id), ['m5', 'm6', 'm8']);
  assert.deepEqual(filterMatches(matches, 'finished').map(m => m.id), ['m1', 'm2', 'm3']);
  assert.equal(matches.length, 8);
});

test('live, postponed и неизвестный статус сохраняются во «Все»', () => {
  const futureStatus = { ...fixture.matches[0], id: 'unknown', status: 'cancelled' };
  const { matches } = parseMatchesResponse({ ...fixture, matches: [...fixture.matches, futureStatus] });
  assert.deepEqual(filterMatches(matches, 'all').map(m => m.id), [...fixture.matches.map(m => m.id), 'unknown']);
  for (const filter of ['scheduled', 'finished']) {
    assert.equal(filterMatches(matches, filter).some(m => ['m4', 'm7', 'unknown'].includes(m.id)), false);
  }
});

test('фильтрация не зависит от даты, счёта и наличия даты', () => {
  const matches = [
    { ...fixture.matches[4], startsAt: '2000-01-01T00:00:00Z', score: null },
    { ...fixture.matches[0], startsAt: '2099-01-01T00:00:00Z', score: null },
    { ...fixture.matches[5], startsAt: null },
  ];
  const parsed = parseMatchesResponse({ round: 12, matches }).matches;
  assert.equal(filterMatches(parsed, 'all').length, 3);
  assert.deepEqual(filterMatches(parsed, 'scheduled').map(m => m.id), ['m5', 'm6']);
  assert.deepEqual(filterMatches(parsed, 'finished').map(m => m.id), ['m1']);
});

test('нулевой счёт отображается; отсутствие счёта обозначается тире', () => {
  assert.equal(formatScore(fixture.matches[1].score), '0:0');
  assert.equal(formatScore({ home: 3, away: 0 }), '3:0');
  assert.equal(formatScore({ home: 0, away: 2 }), '0:2');
  assert.equal(formatScore(null), '—');
});

test('статусы отображаются по-русски, неизвестный имеет безопасную подпись', () => {
  assert.equal(getMatchStatus('finished').label, 'Завершён');
  assert.equal(getMatchStatus('scheduled').label, 'Предстоящий');
  assert.equal(getMatchStatus('postponed').label, 'Перенесён');
  assert.equal(getMatchStatus('cancelled').label, 'Статус уточняется');
  assert.equal(getMatchStatus('toString').label, 'Статус уточняется');
});

test('минута live-матча учитывает 0 и отсутствие значения', () => {
  assert.equal(getMatchStatus('live', 67).label, 'Идёт матч · 67′');
  assert.equal(getMatchStatus('live', 0).label, 'Идёт матч · 0′');
  assert.equal(getMatchStatus('live').label, 'Идёт матч');
  assert.equal(getMatchStatus('live', null).label, 'Идёт матч');
  assert.equal(getMatchStatus('finished', 90).label, 'Завершён');
});

test('дата null и некорректная дата получают безопасную подпись', () => {
  assert.equal(formatMatchDate(null), 'Дата уточняется');
  assert.equal(formatMatchDate('invalid'), 'Дата уточняется');
});

test('UTC переводится в часовой пояс устройства, включая переход суток', () => {
  const modulePath = path.resolve(__dirname, '../.expo/tests/utils/matches.js');
  const script = `console.log(require(${JSON.stringify(modulePath)}).formatMatchDate('2026-10-11T23:30:00Z'))`;
  for (const [zone, expected] of [
    ['UTC', /11 октября 2026.*23:30/],
    ['Europe/Moscow', /12 октября 2026.*02:30/],
    ['America/New_York', /11 октября 2026.*19:30/],
  ]) {
    const actual = execFileSync(process.execPath, ['-e', script], {
      env: { ...process.env, TZ: zone }, encoding: 'utf8',
    });
    assert.match(actual, expected, zone);
  }
});

test('пустой список поддерживается всеми фильтрами', () => {
  const { matches } = parseMatchesResponse({ round: 12, matches: [] });
  for (const filter of ['all', 'scheduled', 'finished']) {
    assert.deepEqual(filterMatches(matches, filter), []);
  }
});

test('поиск находит домашний и гостевой клуб без учёта регистра', () => {
  assert.deepEqual(filterMatches(fixture.matches, 'all', 'лОкО').map(m => m.id), ['m2']);
  assert.deepEqual(filterMatches(fixture.matches, 'all', 'цСкА').map(m => m.id), ['m2']);
});

test('поиск по части названия учитывает обе команды и фильтр статуса', () => {
  assert.deepEqual(filterMatches(fixture.matches, 'all', 'ДИНАМО').map(m => m.id), ['m4', 'm8']);
  assert.deepEqual(filterMatches(fixture.matches, 'scheduled', 'Динамо').map(m => m.id), ['m8']);
  assert.deepEqual(filterMatches(fixture.matches, 'finished', 'Динамо'), []);
});

test('пробелы по краям запроса игнорируются, очистка возвращает результаты фильтра', () => {
  assert.deepEqual(filterMatches(fixture.matches, 'all', '  зенит  ').map(m => m.id), ['m1']);
  for (const filter of ['all', 'scheduled', 'finished']) {
    for (const query of ['', '   ']) {
      assert.deepEqual(filterMatches(fixture.matches, filter, query), filterMatches(fixture.matches, filter));
    }
  }
});

test('неизвестный клуб и пустой исходный список дают пустой результат', () => {
  assert.deepEqual(filterMatches(fixture.matches, 'all', 'Несуществующий клуб'), []);
  assert.deepEqual(filterMatches([], 'all', 'Зенит'), []);
});

test('поиск сохраняет live, postponed и неизвестный статус в результатах «Все»', () => {
  assert.deepEqual(filterMatches(fixture.matches, 'all', 'Рубин').map(m => m.id), ['m4']);
  const postponed = filterMatches(fixture.matches, 'all', 'Факел');
  assert.deepEqual(postponed.map(m => m.id), ['m7']);
  assert.equal(postponed[0].startsAt, null);
  assert.equal(postponed[0].score, null);
  const unknown = { ...fixture.matches[0], status: 'cancelled' };
  assert.deepEqual(filterMatches([unknown], 'all', 'Зенит'), [unknown]);
});
