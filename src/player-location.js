// 世界中的玩家位置使用固定键；用户名只参与显示和旧数据迁移。
const PLAYER_LOCATION_KEY = '玩家位置';

function getPlayerName() {
  const candidates = [];
  try {
    if (typeof SillyTavern !== 'undefined') {
      candidates.push(SillyTavern?.getContext?.()?.name1, SillyTavern?.name1);
    }
  } catch (_) {}
  try {
    candidates.push(window.parent?.SillyTavern?.getContext?.()?.name1);
  } catch (_) {}
  return candidates.map(value => String(value ?? '').trim())
    .find(name => name && !/^you$/i.test(name)) || '';
}

function normalizePlayerWorld(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const world = { ...value };
  const nameKey = getPlayerName() ? `${getPlayerName()}位置` : null;
  const literalKeys = Object.keys(world).filter(key => /^\{\{\s*user\s*\}\}位置$/i.test(key));
  const legacyKeys = Object.keys(world).filter(key => key !== PLAYER_LOCATION_KEY && key.endsWith('位置'));
  // 已有规范值优先；旧版双字段优先实际用户名，避免默认宏字段覆盖剧情位置。
  const candidates = [PLAYER_LOCATION_KEY, nameKey, ...literalKeys];
  if (legacyKeys.length === 1) candidates.push(legacyKeys[0]);
  const sourceKey = candidates.find(key => key && typeof world[key] === 'string' && world[key].trim());
  if (sourceKey) world[PLAYER_LOCATION_KEY] = world[sourceKey];
  for (const key of [nameKey, ...literalKeys, ...(legacyKeys.length === 1 ? legacyKeys : [])]) {
    if (key && key !== PLAYER_LOCATION_KEY) delete world[key];
  }
  return world;
}
