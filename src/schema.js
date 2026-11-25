import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
// BEGIN PLAYER LOCATION
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
// END PLAYER LOCATION
const Relation = z.object({
  好感度: z.coerce.number().transform(v => _.clamp(v, -100, 100)).prefault(0),
  关系理解: z.string().prefault('无特殊交集'),
});
const person = (home, places, action) => z.object({
  位置: z.string().describe(places).prefault(home),
  当前行为: z.string().prefault(action),
  人际关系: z.record(z.string(), Relation).prefault({}),
});
export const Schema = z.object({
  世界: z.preprocess(normalizePlayerWorld, z.object({
    当前时段: z.enum(['卯时_晨光熹微','巳时_日上三竿','未时_午后慵懒','酉时_日落黄昏','戌时_华灯初上','子时_夜深人静','丑时_更深露重']).prefault('巳时_日上三竿'),
    [PLAYER_LOCATION_KEY]: z.string().prefault('养心殿_卧房'),
  }).passthrough()),
  NPC: z.object({
    绿绮: person('听涛阁','养心殿、听涛阁、小厨房、养心殿_绿绮房','整理书卷'),
    春桃: person('养心殿_外间','养心殿、养心殿_春桃房、小厨房、后花园_花圃','备好更衣用物').optional(),
    赵灵均: person('栖凤楼_内室','栖凤楼、后花园_花圃、暖阁_花房','梳妆'),
    宋玉轩: person('演武场','演武场、藏锋阁、后山_跑马道','练剑'),
    宋婉清: person('暖香坞','暖香坞、水上曲廊、碧波湖_画舫','调香'),
    燕红: person('碧波湖_大树杈','燕红居、倒座房_屋顶、墙头、后山_竹林','打盹'),
    柳如是: person('潇湘馆_琴台','潇湘馆、竹林_石桌、藏书阁','抚琴'),
    苏墨: person('湖心水榭_二层','湖心水榭、九曲桥','对镜梳妆'),
    白露: z.object({
      位置: z.string().describe('静室_地下二层、阴暗角落、后山_溶洞').prefault('静室_地下二层'),
      状态: z.string().prefault('蜷缩沉睡'),
      人际关系: z.record(z.string(),Relation).prefault({}),
    }),
    阿若: person('绮霞院','绮霞院、后花园_花圃、百花深处','闲坐').optional(),
    阮宜: person('后山_废观_偏房','后山_废观_偏房、后山_废观_庭院、后山_废观_钟楼、养心殿、水上曲廊','随处歇息').optional(),
    叶长宁: person('松风舍','松风舍、演武场、养心殿、碧波湖','随意歇坐').optional(),
  }).passthrough(),
}).passthrough();
// 已打开的旧聊天也迁移最新有效楼层，不必重新开局。
async function migrateCurrentPlayerLocation() {
  try {
    await waitGlobalInitialized('Mvu');
    const mvu = window.Mvu ?? window.parent?.Mvu;
    if (!mvu?.getMvuData || !mvu?.replaceMvuData) return;
    for (let id = -1; id >= -8; id--) {
      const options = { type: 'message', message_id: id };
      let variables;
      try { variables = mvu.getMvuData(options); } catch (_) { continue; }
      if (!variables?.stat_data?.世界) continue;
      const world = normalizePlayerWorld(variables.stat_data.世界);
      if (JSON.stringify(world) !== JSON.stringify(variables.stat_data.世界)) {
        const updated = { ...variables, stat_data: { ...variables.stat_data, 世界: world } };
        // MVU 会从 stat_data 重新生成展示数据，避免旧缓存继续显示双字段。
        delete updated.display_data;
        delete updated.delta_data;
        await mvu.replaceMvuData(updated, options);
      }
      break;
    }
  } catch (error) { console.warn('[锦瑟山庄] 玩家位置迁移失败', error); }
}

$(() => {
  registerMvuSchema(Schema);
  migrateCurrentPlayerLocation();
  if (typeof tavern_events !== 'undefined' && tavern_events.CHAT_CHANGED) {
    eventOn(tavern_events.CHAT_CHANGED, migrateCurrentPlayerLocation);
  }
});
