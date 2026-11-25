const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dependencyRoot = process.env.TEST_NODE_MODULES;
const z = require(dependencyRoot ? path.join(dependencyRoot, 'zod') : 'zod');
const _ = require(dependencyRoot ? path.join(dependencyRoot, 'lodash') : 'lodash');
let saved;
const variables = { stat_data: { 世界: { '{{user}}位置': '养心殿', 萧景琰位置: '后山_废观' }, extra: 42 },
  display_data: { stale: true }, delta_data: { stale: true }, other: 'preserve' };
const sandbox = { z, _, console, eventOn() {}, $() {},
  waitGlobalInitialized: async () => {},
  window: { parent: { SillyTavern: { getContext: () => ({ name1: '萧景琰' }) } },
    Mvu: { getMvuData: () => variables, replaceMvuData: async (data, options) => { saved = { data, options }; } } },
};
vm.createContext(sandbox);
const source = fs.readFileSync(path.join(__dirname, '../src/schema.js'), 'utf8')
  .replace(/^import .*?;\r?\n/, '').replace('export const Schema', 'const Schema');
vm.runInContext(source + '\nthis.testSchema = Schema; this.normalize = normalizePlayerWorld;', sandbox);
const plain = value => JSON.parse(JSON.stringify(value));
const parseWorld = world => plain(sandbox.testSchema.shape.世界.parse(world));
assert.deepEqual(parseWorld({ '{{user}}位置': '湖心水榭' }), { 当前时段: '巳时_日上三竿', 玩家位置: '湖心水榭' });
for (const world of [
  { '{{user}}位置': '养心殿', 萧景琰位置: '后山_废观' },
  { 萧景琰位置: '后山_废观', '{{user}}位置': '养心殿' },
]) assert.equal(parseWorld(world).玩家位置, '后山_废观');
assert.deepEqual(parseWorld({ 玩家位置: '绮霞院', '{{user}}位置': '养心殿', 萧景琰位置: '湖心水榭', weather: '晴' }),
  { 当前时段: '巳时_日上三竿', 玩家位置: '绮霞院', weather: '晴' });
assert.equal(parseWorld({}).玩家位置, '养心殿_卧房');
assert.equal(parseWorld({ 旧名字位置: '潇湘馆' }).玩家位置, '潇湘馆');
assert.equal(parseWorld({ '{{USER}}位置': '藏书阁' }).玩家位置, '藏书阁');
const world = { 玩家位置: '演武场', 当前时段: '未时_午后慵懒' };
assert.deepEqual(plain(sandbox.normalize(sandbox.normalize(world))), world);
assert.deepEqual(variables.stat_data.世界, { '{{user}}位置': '养心殿', 萧景琰位置: '后山_废观' });
(async () => {
  await sandbox.migrateCurrentPlayerLocation();
  assert.equal(saved.data.stat_data.世界.玩家位置, '后山_废观');
  assert.equal(saved.data.stat_data.extra, 42);
  assert.equal(saved.data.other, 'preserve');
  assert.equal(saved.data.display_data, undefined);
  assert.deepEqual(plain(saved.options), { type: 'message', message_id: -1 });
  const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const shared = read(path.join(__dirname, '../src/player-location.js')).trim();
  for (const name of ['schema.js', 'panel.js']) {
    assert.equal(read(path.join(__dirname, '../src', name))
      .split('// BEGIN PLAYER LOCATION\n')[1].split('// END PLAYER LOCATION')[0].trim(), shared);
  }
  console.log('PASS schema defaults, duplicate migration, key order, aliases, idempotence, existing chat migration, shared source');
})();
