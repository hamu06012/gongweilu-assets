/**
 * 锦瑟山庄 · MVU 状态悬浮面板（山庄地图版）
 * ============================================================
 * 功能：在酒馆页面右下角注入一枚「录」字悬浮按钮，点击展开
 *       古风面板，实时展示 MVU 变量数据：
 *       - 「地图」页：锦瑟山庄手绘地图（白日/夜间双图随时辰切换），
 *         NPC 头像按位置浮现在对应建筑点位上，{{user}} 以用户名首字印章标记
 *       - 「名帖」页：NPC 列表（位置/行为/好感度/关系理解）
 *       - 世界状态：当前时辰 + 时辰进度条 + 玩家位置
 *
 * 使用方法：
 *   1. 打开 酒馆助手 → 脚本库，新建脚本，粘贴本文件全部内容，保存并启用
 *      （地图默认从 jsDelivr CDN 加载，开箱即用，无需拷图）
 *   2. 需要 MVU（MagVarUpdate）插件与配套 Schema 脚本已启用
 *
 * 自定义：
 *   - MAP_IMAGES：白日/夜间地图图片地址（当前托管在 GitHub+jsDelivr）。
 *     图片加载失败会自动回退到内置手绘 SVG 地图
 *   - NPC_PORTRAITS：每个 NPC 的立绘链接（名帖头像 + 立绘页签；留空用红色印章字头像）
 *   - NPC_ICONS：地图标记用的像素小人图标（留空回退立绘 → 印章字）
 *   - MAP_ANCHORS_DAY / MAP_ANCHORS_NIGHT：地点名 → 地图坐标
 *     （图片宽高的百分比），Schema 新增地点时两张图各加一行
 * ============================================================
 */

// ============================ 配置区 ============================

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

const PANEL_TITLE = '锦瑟山庄';
const MAP_LABELS = [{"name":"养心殿","text":"养心殿","x":50,"y":43},{"name":"西厢侍女房","text":"西厢侍女房","x":41,"y":35.5},{"name":"听涛阁","text":"听涛阁","x":65,"y":45.5},{"name":"藏书阁","text":"藏书阁","x":68,"y":31},{"name":"小厨房","text":"小厨房","x":61,"y":56},{"name":"绮霞院","text":"绮霞院","x":15,"y":25},{"name":"栖凤楼","text":"栖凤楼","x":35,"y":25},{"name":"藏锋阁","text":"藏锋阁","x":14,"y":43},{"name":"演武场","text":"演武场","x":16,"y":59},{"name":"松风舍","text":"松风舍","x":29,"y":45},{"name":"后花园_花圃","text":"后花园·花圃","x":44,"y":25},{"name":"百花深处","text":"百花深处","x":51,"y":29},{"name":"暖阁_花房","text":"暖阁花房","x":61,"y":23},{"name":"洗华池","text":"洗华池","x":53,"y":13},{"name":"潇湘馆","text":"潇湘馆","x":80,"y":25},{"name":"竹林_石桌","text":"竹林石桌","x":90,"y":31},{"name":"照水轩","text":"照水轩","x":87,"y":45},{"name":"暖香坞","text":"暖香坞","x":84,"y":65},{"name":"水上曲廊","text":"水上曲廊","x":77,"y":65},{"name":"静室","text":"静室","x":88,"y":81},{"name":"碧波湖","text":"碧波湖","x":66,"y":59},{"name":"湖心水榭","text":"湖心水榭","x":55,"y":69},{"name":"九曲桥","text":"九曲桥","x":43,"y":65},{"name":"游船码头","text":"游船码头","x":56,"y":80},{"name":"前厅","text":"前厅","x":54,"y":87},{"name":"大门","text":"大门","x":53,"y":95},{"name":"门房","text":"门房","x":61,"y":93},{"name":"倒座房","text":"倒座房","x":28,"y":91},{"name":"燕红居","text":"燕红居","x":8,"y":85},{"name":"库房","text":"库房","x":38.5,"y":76.5},{"name":"后山","text":"后山","x":49,"y":5},{"name":"后山_跑马道","text":"后山·跑马道","x":24,"y":8},{"name":"后山_溶洞","text":"后山·溶洞","x":73,"y":6},{"name":"后山_竹林","text":"后山·竹林","x":85,"y":11},{"name":"后山_废观","text":"后山·废观","x":39,"y":12}];
const MAP_ALIASES = {"后花园":"后花园_花圃","花房":"暖阁_花房","绿绮房":"养心殿_绿绮房","春桃房":"养心殿_春桃房","西厢侍女房":"西厢侍女房","倒座房_西院独栋":"燕红居","东院":"倒座房_东院","西院":"倒座房_西院","中院":"倒座房_中院","绿绮住处":"养心殿_绿绮房","春桃住处":"养心殿_春桃房","废观":"后山_废观","山观":"后山_废观","后山废观":"后山_废观","废置山观":"后山_废观","废观_偏房":"后山_废观_偏房","废观_正殿":"后山_废观_正殿","废观_钟楼":"后山_废观_钟楼"}; // 面板标题
const FAB_CHAR = '录'; // 悬浮按钮上的字
const USER_TITLE = '少主'; // 拿不到用户名时对 {{user}} 的称谓（地图印章用其首字）

// 地图图片地址（http(s):// 、 / 开头的酒馆同源路径、相对路径、data:image 均可；留空用内置 SVG）
// 当前用 GitHub+jsDelivr 托管；想改回本地加载就换成 '/jinse/gongweilu-day.jpg' / '/jinse/gongweilu-night.jpg'
// （图片放 SillyTavern 安装目录 public\jinse\ 下即可）
const MAP_IMAGES = {"day":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/gongweilu-day.png","night":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/gongweilu-night.png"};

// NPC 立绘图片链接（名帖头像 + 「立绘」页签大图用；留空用红色印章字头像）
// 与地图图同仓托管（GitHub+jsDelivr）；改本地加载就换成 '/jinse/portrait-xxx.webp'
const NPC_PORTRAITS = {"绿绮": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-lvqi.webp", "赵灵均": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-zhaolingjun.webp", "白露": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-bailu.webp", "宋玉轩": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-songyuxuan.webp", "宋婉清": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-songwanqing.webp", "燕红": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-yanhong.webp", "柳如是": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-liurushi.webp", "苏墨": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-sumo.webp", "叶长宁": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-yechangning.webp", "阮宜": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-ruanyi.webp", "阿若": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-aruo.webp", "春桃": "https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@4a35beca57b2519846d448915f20c4e43603f8bd/releases/2026-11-25/portrait-chuntao.webp"};

// 名帖显示的身份标签（静态，按名字映射；名字下方一行小字）。
const NPC_ROLES = {"宋玉轩":"元帅府嫡女 · 胞妹","宋婉清":"侧室庶女 · 庶妹","柳如是":"红颜知己 · 别院女眷","燕红":"江湖高手 · 陪嫁侍女","白露":"私宠女奴","绿绮":"贴身大丫鬟","春桃":"贴身丫鬟","苏墨":"罪臣之女 · 私宠","赵灵均":"当朝郡主 · 正妻","阿若":"元帅名义妾室","阮宜":"寄居女客","叶长宁":"旧交女客"};

// 地图标记用的像素图标（从 Q 版汇总图切出，透明底）。
// 默认全身像素小人 icon-body-*；想换成带框名牌头像就把下面的 body 全改成 card。
// 留空则地图标记回退用 NPC_PORTRAITS 立绘，再空用印章字。
const NPC_ICONS = {"绿绮":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-body-lvqi.png","赵灵均":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-body-zhaolingjun.png","宋玉轩":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-songyuxuan.png","宋婉清":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-body-songwanqing.png","燕红":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-yanhong.png","柳如是":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-body-liurushi.png","苏墨":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-body-sumo.png","白露":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-body-bailu.png","阿若":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-aruo.png","阮宜":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-ruanyi.png","叶长宁":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-yechangning.png","春桃":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-chuntao.png"};

// 地图标记「名牌」档用的带框头像图标（与 icon-body 同源，白底已转透明）。
// 地图标记三档循环：像素小人(icon-body) → 立牌(立绘) → 名牌(icon-card)，右上角按钮切换。
const NPC_CARD_ICONS = {"绿绮":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-card-lvqi.png","赵灵均":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-card-zhaolingjun.png","白露":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-card-bailu.png","宋玉轩":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-songyuxuan.png","宋婉清":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-card-songwanqing.png","燕红":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-yanhong.png","柳如是":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-card-liurushi.png","苏墨":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/icon-card-sumo.png","叶长宁":"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@f83fab8aecb78b5ded2eb73b58b731d89b822315/releases/2026-11-24/icon-body-yechangning.png"};

// 地点 → 地图锚点坐标（白日图，图片宽高的百分比，北上南下）
const MAP_ANCHORS_DAY = {"养心殿":[50,43],"养心殿_卧房":[50,40],"养心殿_外间":[49,47],"养心殿_暖阁":[54,41],"养心殿_露台":[50,51],"养心殿_西廊":[39,46],"养心殿_东廊":[61,46],"养心殿_绿绮房":[42,40],"养心殿_春桃房":[42,44],"养心殿_西厢值房":[43,47],"西厢侍女房":[42,42],"听涛阁":[64,41],"藏书阁":[68,31],"小厨房":[59,51],"冷库_冰窖":[65,52],"绮霞院":[15,25],"绮霞院_卧房":[15,23],"绮霞院_庭院":[16,28],"栖凤楼":[35,25],"栖凤楼_内室":[35,23],"栖凤楼_小佛堂":[38,24],"藏锋阁":[14,43],"演武场":[16,59],"松风舍":[29,45],"松风舍_客房":[29,43],"松风舍_庭院":[30,48],"后花园_花圃":[44,26],"百花深处":[51,27],"暖阁_花房":[61,25],"后花园_凉亭":[51,29],"洗华池":[53,13],"洗华池_外池":[51,13],"洗华池_汤室":[56,13],"潇湘馆":[80,25],"潇湘馆_琴台":[80,28],"竹林_石桌":[88,29],"照水轩":[87,45],"照水轩_卧房":[87,43],"照水轩_临水廊":[83,49],"照水轩_庭院":[88,48],"暖香坞":[84,65],"暖香坞_内室":[85,63],"水上曲廊":[77,65],"静室":[88,81],"静室_地下二层":[88,81],"静室_茶室":[88,79],"阴暗角落":[90,88],"碧波湖":[56,67],"湖心水榭":[55,66],"湖心水榭_二层":[55,65],"湖心水榭_露台":[56,68],"九曲桥":[47,65],"九曲桥_尽头":[51,66],"碧波湖_大树杈":[35,61],"碧波湖_喂鱼台":[42,72],"碧波湖_画舫":[63,73],"碧波湖_残荷区":[65,79],"游船码头":[55,79],"前厅":[54,87],"大门":[53,95],"门房":[61,93],"倒座房":[29,85],"倒座房_西院":[19,85],"倒座房_中院":[29,85],"倒座房_东院":[39,85],"燕红居":[8,85],"倒座房_屋顶":[29,83],"库房":[38.5,76.5],"墙头":[97,58],"后山":[49,5],"后山_跑马道":[24,8],"后山_溶洞":[73,6],"后山_竹林":[85,11],"西环廊":[33,69],"东环廊":[94,57],"后园游廊":[51,32],"临湖步道":[50,54],"北山门":[51,19],"后山_废观":[39,7],"后山_废观_正殿":[39,5.5],"后山_废观_偏房":[35.8,6.8],"后山_废观_钟楼":[43,4.6],"后山_废观_庭院":[39.5,9],"后山_废观_旧井":[41,8.5],"后花园":[44,26],"花房":[61,25],"绿绮房":[42,40],"春桃房":[42,44],"倒座房_西院独栋":[8,85],"东院":[39,85],"西院":[19,85],"中院":[29,85],"绿绮住处":[42,40],"春桃住处":[42,44],"废观":[39,7],"山观":[39,7],"后山废观":[39,7],"废置山观":[39,7],"废观_偏房":[35.8,6.8],"废观_正殿":[39,5.5],"废观_钟楼":[43,4.6]};

// 地点 → 地图锚点坐标（夜间图；两图布局略有出入，分开校准）
const MAP_ANCHORS_NIGHT = {"养心殿":[50,43],"养心殿_卧房":[50,40],"养心殿_外间":[49,47],"养心殿_暖阁":[54,41],"养心殿_露台":[50,51],"养心殿_西廊":[39,46],"养心殿_东廊":[61,46],"养心殿_绿绮房":[42,40],"养心殿_春桃房":[42,44],"养心殿_西厢值房":[43,47],"西厢侍女房":[42,42],"听涛阁":[64,41],"藏书阁":[68,31],"小厨房":[59,51],"冷库_冰窖":[65,52],"绮霞院":[15,25],"绮霞院_卧房":[15,23],"绮霞院_庭院":[16,28],"栖凤楼":[35,25],"栖凤楼_内室":[35,23],"栖凤楼_小佛堂":[38,24],"藏锋阁":[14,43],"演武场":[16,59],"松风舍":[29,45],"松风舍_客房":[29,43],"松风舍_庭院":[30,48],"后花园_花圃":[44,26],"百花深处":[51,27],"暖阁_花房":[61,25],"后花园_凉亭":[51,29],"洗华池":[53,13],"洗华池_外池":[51,13],"洗华池_汤室":[56,13],"潇湘馆":[80,25],"潇湘馆_琴台":[80,28],"竹林_石桌":[88,29],"照水轩":[87,45],"照水轩_卧房":[87,43],"照水轩_临水廊":[83,49],"照水轩_庭院":[88,48],"暖香坞":[84,65],"暖香坞_内室":[85,63],"水上曲廊":[77,65],"静室":[88,81],"静室_地下二层":[88,81],"静室_茶室":[88,79],"阴暗角落":[90,88],"碧波湖":[56,67],"湖心水榭":[55,66],"湖心水榭_二层":[55,65],"湖心水榭_露台":[56,68],"九曲桥":[47,65],"九曲桥_尽头":[51,66],"碧波湖_大树杈":[35,61],"碧波湖_喂鱼台":[42,72],"碧波湖_画舫":[63,73],"碧波湖_残荷区":[65,79],"游船码头":[55,79],"前厅":[54,87],"大门":[53,95],"门房":[61,93],"倒座房":[29,85],"倒座房_西院":[19,85],"倒座房_中院":[29,85],"倒座房_东院":[39,85],"燕红居":[8,85],"倒座房_屋顶":[29,83],"库房":[38.5,76.5],"墙头":[97,58],"后山":[49,5],"后山_跑马道":[24,8],"后山_溶洞":[73,6],"后山_竹林":[85,11],"西环廊":[33,69],"东环廊":[94,57],"后园游廊":[51,32],"临湖步道":[50,54],"北山门":[51,19],"后山_废观":[39,7],"后山_废观_正殿":[39,5.5],"后山_废观_偏房":[35.8,6.8],"后山_废观_钟楼":[43,4.6],"后山_废观_庭院":[39.5,9],"后山_废观_旧井":[41,8.5],"后花园":[44,26],"花房":[61,25],"绿绮房":[42,40],"春桃房":[42,44],"倒座房_西院独栋":[8,85],"东院":[39,85],"西院":[19,85],"中院":[29,85],"绿绮住处":[42,40],"春桃住处":[42,44],"废观":[39,7],"山观":[39,7],"后山废观":[39,7],"废置山观":[39,7],"废观_偏房":[35.8,6.8],"废观_正殿":[39,5.5],"废观_钟楼":[43,4.6]};

// 内置手绘 SVG 地图（兜底用）的锚点（viewBox: 800 x 600）
const SVG_ANCHORS = {"养心殿":[400,258],"养心殿_卧房":[400,240],"养心殿_外间":[392,282],"养心殿_暖阁":[432,246],"养心殿_露台":[400,306],"养心殿_西廊":[312,276],"养心殿_东廊":[488,276],"养心殿_绿绮房":[336,240],"养心殿_春桃房":[336,264],"养心殿_西厢值房":[344,282],"西厢侍女房":[336,252],"听涛阁":[512,246],"藏书阁":[544,186],"小厨房":[472,306],"冷库_冰窖":[520,312],"绮霞院":[120,150],"绮霞院_卧房":[120,138],"绮霞院_庭院":[128,168],"栖凤楼":[280,150],"栖凤楼_内室":[280,138],"栖凤楼_小佛堂":[304,144],"藏锋阁":[112,258],"演武场":[128,354],"松风舍":[232,270],"松风舍_客房":[232,258],"松风舍_庭院":[240,288],"后花园_花圃":[352,156],"百花深处":[408,162],"暖阁_花房":[488,150],"后花园_凉亭":[408,174],"洗华池":[424,78],"洗华池_外池":[408,78],"洗华池_汤室":[448,78],"潇湘馆":[640,150],"潇湘馆_琴台":[640,168],"竹林_石桌":[704,174],"照水轩":[696,270],"照水轩_卧房":[696,258],"照水轩_临水廊":[664,294],"照水轩_庭院":[704,288],"暖香坞":[672,390],"暖香坞_内室":[680,378],"水上曲廊":[616,390],"静室":[704,486],"静室_地下二层":[704,486],"静室_茶室":[704,474],"阴暗角落":[720,528],"碧波湖":[448,402],"湖心水榭":[440,396],"湖心水榭_二层":[440,390],"湖心水榭_露台":[448,408],"九曲桥":[376,390],"九曲桥_尽头":[408,396],"碧波湖_大树杈":[280,366],"碧波湖_喂鱼台":[336,432],"碧波湖_画舫":[504,438],"碧波湖_残荷区":[520,474],"游船码头":[440,474],"前厅":[432,522],"大门":[424,570],"门房":[488,558],"倒座房":[232,510],"倒座房_西院":[152,510],"倒座房_中院":[232,510],"倒座房_东院":[312,510],"燕红居":[64,510],"倒座房_屋顶":[232,498],"库房":[308.0,459.0],"墙头":[776,348],"后山":[392,30],"后山_跑马道":[192,48],"后山_溶洞":[584,36],"后山_竹林":[680,66],"西环廊":[264,414],"东环廊":[752,342],"后园游廊":[408,192],"临湖步道":[400,324],"北山门":[408,114],"后山_废观":[312,42],"后山_废观_正殿":[312,33.0],"后山_废观_偏房":[286.4,40.8],"后山_废观_钟楼":[344,27.599999999999998],"后山_废观_庭院":[316.0,54],"后山_废观_旧井":[328,51.0],"后花园":[352,156],"花房":[488,150],"绿绮房":[336,240],"春桃房":[336,264],"倒座房_西院独栋":[64,510],"东院":[312,510],"西院":[152,510],"中院":[232,510],"绿绮住处":[336,240],"春桃住处":[336,264],"废观":[312,42],"山观":[312,42],"后山废观":[312,42],"废置山观":[312,42],"废观_偏房":[286.4,40.8],"废观_正殿":[312,33.0],"废观_钟楼":[344,27.599999999999998]};

// 匹配失败时的收容点：SVG 地图上是右下角「行踪不明」虚线框中心（800x600 坐标）；
// 图片地图上是右下角角落（百分比坐标）
const UNKNOWN_XY = [760, 570];
const UNKNOWN_PCT_IMG = [95, 95];

// 统一换算成百分比坐标的锚点表（渲染与匹配都在百分比空间进行）
function toPctTable(table, w, h) {
  return Object.fromEntries(Object.entries(table).map(([k, [x, y]]) => [k, [x / w, y / h]]));
}
const SVG_ANCHORS_PCT = toPctTable(SVG_ANCHORS, 8, 6);
const UNKNOWN_PCT_SVG = [UNKNOWN_XY[0] / 8, UNKNOWN_XY[1] / 6];

// =========================== 样式区 ===========================

const GWP_CSS = `
/* BEGIN JINSE_ENCOUNTER_CSS */
#gwp-panel .gwp-page-encounter { flex:1 1 auto; min-height:0; max-height:52vh; overflow:auto; padding:14px; color:#493d2e; }
#gwp-panel.gwp-resized .gwp-page-encounter { max-height:none; }
#gwp-panel .gwp-encounter-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
#gwp-panel .gwp-encounter-heading h3 { font-size:17px; font-weight:normal; letter-spacing:2px; }
#gwp-panel .gwp-page-encounter button { font:inherit; font-size:12px; border:1px solid #a18c67; border-radius:5px; padding:5px 9px; color:#493d2e; background:#f4ead6; cursor:pointer; white-space:nowrap; }
#gwp-panel .gwp-page-encounter button:disabled { opacity:.5; cursor:default; }
#gwp-panel .gwp-encounter-toggle[aria-checked="true"] { color:#fff4df; border-color:#6a7f5a; background:#526549; }
#gwp-panel .gwp-encounter-toggle[aria-checked="false"] { background:#dfd8ca; color:#6c6254; }
#gwp-panel .gwp-encounter-note { font-size:12px; line-height:1.65; color:#796b59; margin-bottom:10px; }
#gwp-panel .gwp-encounter-uniform, #gwp-panel .gwp-encounter-person { display:grid; grid-template-columns:minmax(64px,1fr) 96px 78px; align-items:center; gap:8px; }
#gwp-panel .gwp-encounter-uniform { padding:10px 0; }
#gwp-panel .gwp-encounter-people { border-top:1px solid #bca98b; }
#gwp-panel .gwp-encounter-person { padding:8px 0; border-bottom:1px dashed #c9bba4; }
#gwp-panel .gwp-encounter-person label { font-size:14px; }
#gwp-panel .gwp-encounter-person.gwp-individual label { color:#8f2b23; }
#gwp-panel .gwp-encounter-value { display:flex; align-items:center; gap:4px; }
#gwp-panel .gwp-encounter-value input { width:76px; min-width:0; font:inherit; font-size:14px; padding:5px; border:1px solid #bca98b; border-radius:4px; background:#fffaf0; color:#493d2e; }
#gwp-panel .gwp-encounter-value input:focus { outline:2px solid #a18c67; outline-offset:1px; }
#gwp-panel .gwp-encounter-status { font-size:12px; line-height:1.65; color:#71614e; min-height:24px; padding-top:12px; }
@media (max-width:420px) { #gwp-panel .gwp-page-encounter { padding:10px; } #gwp-panel .gwp-encounter-uniform, #gwp-panel .gwp-encounter-person { grid-template-columns:minmax(54px,1fr) 86px 74px; gap:5px; } }
/* END JINSE_ENCOUNTER_CSS */

#gwp-panel .gwp-page-map { overflow: auto; }
#gwp-panel .gwp-frame { overflow: auto; max-height: 62vh; }
#gwp-panel .gwp-map-canvas { width: 100%; position: relative; }
#gwp-panel .gwp-map-tools { display:flex; gap:5px; padding:0 0 6px; align-items:center; }
#gwp-panel .gwp-map-tools button { font:inherit; font-size:11px; padding:2px 8px; color:#493d2e; background:#f4ead6; border:1px solid #a18c67; border-radius:3px; cursor:pointer; }
#gwp-panel .gwp-map-tools .gwp-marker-mode { position:static; margin-left:auto; }
#gwp-panel .gwp-map-labels { position:absolute; inset:0; pointer-events:none; z-index:1; }
#gwp-panel .gwp-place-label { position:absolute; transform:translate(-50%,-50%); white-space:nowrap; padding:1px 5px; border:1px solid #bea476; background:rgba(34,47,40,.88); border-radius:3px; color:#f7e8c9; font-size:10px; line-height:1.4; }

#gwp-root, #gwp-root * { box-sizing: border-box; margin: 0; padding: 0; }

#gwp-root {
  font-family: "Kaiti SC", "STKaiti", "KaiTi", "Noto Serif SC", "Source Han Serif SC", serif;
}

/* ---------- 悬浮按钮 ---------- */
#gwp-fab {
  position: fixed; right: 18px; bottom: 18px; z-index: 9990;
  width: 56px; height: 56px; border-radius: 50%;
  border: 2px solid #c9a35f;
  background: radial-gradient(circle at 35% 30%, #3d362f, #241f1b 72%);
  color: #e8cf9a; font-size: 25px; font-family: inherit;
  cursor: grab; user-select: none;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 12px rgba(0,0,0,.45), 0 0 10px rgba(201,163,95,.25);
  animation: gwp-breathe 3.2s ease-in-out infinite;
  transition: transform .2s ease;
}
#gwp-fab:hover { transform: scale(1.08); }
@keyframes gwp-breathe {
  0%, 100% { box-shadow: 0 3px 12px rgba(0,0,0,.45), 0 0 6px  rgba(201,163,95,.20); }
  50%      { box-shadow: 0 3px 12px rgba(0,0,0,.45), 0 0 18px rgba(201,163,95,.55); }
}
#gwp-fab .gwp-fab-time {
  position: absolute; right: -3px; bottom: -3px;
  min-width: 20px; height: 20px; padding: 0 4px; border-radius: 10px;
  background: #8f2b23; color: #f6e8cd; border: 1px solid #c9a35f;
  font-size: 12px; line-height: 18px; text-align: center; display: none;
}

/* ---------- 面板 ---------- */
#gwp-panel {
  position: fixed; right: 18px; bottom: 86px; z-index: 9990;
  width: 640px; min-width: 300px; min-height: 260px; max-width: calc(100vw - 36px); max-height: 86vh;
  display: flex; flex-direction: column;
  background: linear-gradient(160deg, #f8f2e4 0%, #f3ead6 55%, #eee2c8 100%);
  border: 1px solid #7a6248; outline: 3px double rgba(122,98,72,.30);
  border-radius: 6px; overflow: hidden;
  box-shadow: 0 12px 42px rgba(20,15,10,.5);
  color: #33291f;
  transform: translateX(calc(100% + 30px));
  opacity: 0; visibility: hidden;
  transition: transform .35s cubic-bezier(.22,1,.30,1), opacity .3s ease, visibility .3s;
}
#gwp-panel.gwp-open { transform: translateX(0); opacity: 1; visibility: visible; }

/* ---------- 头部 ---------- */
#gwp-panel .gwp-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(180deg, #2e2823, #241f1a);
  border-bottom: 2px solid #c9a35f;
  color: #e8cf9a;
  user-select: none; touch-action: none;
}
#gwp-panel .gwp-title { flex: 1; font-size: 19px; letter-spacing: 6px; }
#gwp-panel .gwp-title::before { content: '❖'; margin-right: 8px; color: #b03a30; letter-spacing: 0; }
#gwp-panel .gwp-icon-btn {
  background: none; border: none; cursor: pointer;
  color: #c9a35f; font-size: 17px; font-family: inherit;
  padding: 2px 6px; border-radius: 3px; transition: all .2s;
}
#gwp-panel .gwp-icon-btn:hover { color: #f0d9a8; background: rgba(201,163,95,.15); }
#gwp-panel .gwp-refresh:hover { transform: rotate(90deg); }

/* ---------- 世界状态 ---------- */
#gwp-panel .gwp-world { padding: 10px 14px 9px; border-bottom: 1px dashed rgba(90,70,50,.4); }
#gwp-panel .gwp-time-row { display: flex; align-items: baseline; gap: 10px; }
#gwp-panel .gwp-daynight { font-size: 20px; color: #b99655; }
#gwp-panel .gwp-time-name { font-size: 28px; letter-spacing: 3px; color: #8f2b23; }
#gwp-panel .gwp-time-desc { font-size: 13px; color: #6b5a44; }
#gwp-panel .gwp-time-strip { display: flex; gap: 3px; margin-top: 8px; }
#gwp-panel .gwp-time-seg {
  flex: 1; text-align: center; font-size: 11px; padding: 3px 0;
  background: rgba(90,70,50,.12); border-radius: 2px; color: #7a6a52;
}
#gwp-panel .gwp-time-seg.gwp-night { background: rgba(46,58,74,.16); color: #46586b; }
#gwp-panel .gwp-time-seg.gwp-now {
  background: #8f2b23; color: #f6e8cd;
  box-shadow: 0 0 7px rgba(143,43,35,.55); font-weight: bold;
}
#gwp-panel .gwp-userloc { margin-top: 8px; font-size: 13px; color: #4a3e2e; }
#gwp-panel .gwp-userloc b { color: #8f2b23; font-weight: normal; }

/* ---------- 页签 ---------- */
#gwp-panel .gwp-tabs { display: flex; gap: 6px; padding: 7px 12px 0; }
#gwp-panel .gwp-tab {
  flex: 1; padding: 5px 0;
  background: rgba(90,70,50,.10);
  border: 1px solid rgba(122,98,72,.35); border-bottom: none;
  border-radius: 6px 6px 0 0;
  font-family: inherit; font-size: 14px; letter-spacing: 5px;
  color: #6b5a44; cursor: pointer; transition: all .2s;
}
#gwp-panel .gwp-tab:hover { color: #8f2b23; }
#gwp-panel .gwp-tab.gwp-active {
  background: rgba(143,43,35,.10); color: #8f2b23; font-weight: bold;
}
#gwp-panel .gwp-pages { border-top: 1px solid rgba(122,98,72,.35); flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
#gwp-panel .gwp-page-map, #gwp-panel .gwp-page-list { flex: 1 1 auto; min-height: 0; }

/* ---------- 地图页 ---------- */
#gwp-panel .gwp-map { padding: 8px 10px 10px; }
#gwp-panel .gwp-frame {
  touch-action: none; cursor: grab; overscroll-behavior: contain;
  position: relative;
  border: 1px solid #7a6248; border-radius: 4px; overflow: auto;
  background: #f2e8d0;
}
#gwp-panel .gwp-frame.gwp-panning { cursor: grabbing; user-select: none; }
#gwp-panel .gwp-mapimg { -webkit-user-drag: none; user-select: none; }
#gwp-panel .gwp-frame svg { display: block; width: 100%; height: auto; }
#gwp-panel .gwp-frame text { font-family: inherit; text-anchor: middle; font-size: 12px; }
#gwp-panel .gwp-lbl-res { fill: #8f2b23; }
#gwp-panel .gwp-lbl-scn { fill: #55483a; }
#gwp-panel .gwp-lbl-water { fill: #2f5d74; font-size: 13px; letter-spacing: 3px; }
#gwp-panel .gwp-lbl-sm { font-size: 9px; }
/* 扩建地图：昼夜共用几何位置，文字牌签由界面叠加 */
#gwp-panel .gwp-mapimg { display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; }
/* 图片模式下的「行踪不明」角落标签 */
#gwp-panel .gwp-unknowntag {
  position: absolute; z-index: 2; transform: translate(-50%, -100%);
  padding: 1px 7px; font-size: 10px; letter-spacing: 2px; color: #f0e2c4;
  background: rgba(30,24,18,.72); border: 1px dashed rgba(201,163,95,.65); border-radius: 3px;
  pointer-events: none;
}

/* 昼夜罩层（压在地图之上、头像之下） */
#gwp-panel .gwp-map-veil { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
#gwp-panel .gwp-veil-moon {
  position: absolute; right: 10px; top: 6px;
  font-size: 22px; color: #e8cf9a; text-shadow: 0 0 8px rgba(232,207,154,.8);
}

/* 头像标记 */
#gwp-panel .gwp-marker {
  position: absolute; z-index: 3; transform: translate(-50%, -50%);
  cursor: pointer; text-align: center; user-select: none;
}
#gwp-panel .gwp-marker-avatar {
  width: 34px; height: 34px; margin: 0 auto; border-radius: 50%;
  border: 2px solid #c9a35f;
  background-color: #8f2b23; background-size: cover; background-position: center top;
  color: #f6e8cd; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 2px rgba(20,14,8,.55), 0 2px 7px rgba(0,0,0,.55);
  transition: transform .15s ease;
}
#gwp-panel .gwp-marker-icon {
  width: 40px; height: 40px;
  background-color: transparent;
  background-size: contain; background-position: center; background-repeat: no-repeat;
}
#gwp-panel .gwp-marker-body {
  width:56px;height:64px;border:0;border-radius:0;background-color:transparent;
  background-size:contain;box-shadow:none;image-rendering:pixelated;
  filter:drop-shadow(0 2px 1px rgba(20,14,8,.35));
}
#gwp-panel .gwp-marker[data-name="绿绮"] .gwp-marker-body {height:58px;}
#gwp-panel .gwp-marker[data-name="春桃"] .gwp-marker-body {height:70px;}
#gwp-panel .gwp-marker-stand {
  width: 34px; height: 51px; margin: 0 auto;
  border-radius: 3px; border: 2px solid #c9a35f;
  background-color: transparent; background-size: cover; background-position: center top;
  box-shadow: 0 0 0 2px rgba(20,14,8,.55), 0 2px 7px rgba(0,0,0,.55);
}
#gwp-panel .gwp-marker-mode {
  position: absolute; top: 6px; right: 6px; z-index: 5;
  padding: 2px 8px; font-family: inherit; font-size: 11px; letter-spacing: 2px;
  color: #f0e2c4; background: rgba(30,24,18,.78);
  border: 1px solid #c9a35f; border-radius: 10px; cursor: pointer;
}
#gwp-panel .gwp-marker-mode:hover { color: #f0d9a8; background: rgba(30,24,18,.92); }
#gwp-panel .gwp-marker:hover .gwp-marker-avatar { transform: scale(1.15); }
#gwp-panel .gwp-marker-name {
  display: inline-block; margin-top: 2px; padding: 0 5px;
  font-size: 10px; color: #f0e2c4; white-space: nowrap;
  background: rgba(30,24,18,.82);
  border: 1px solid rgba(201,163,95,.55); border-radius: 7px;
}
/* {{user}} 印章标记 */
#gwp-panel .gwp-marker-seal {
  width: 30px; height: 30px; margin: 0 auto;
  background: #8f2b23; color: #f6e8cd;
  border: 2px solid #c9a35f; border-radius: 4px;
  font-size: 16px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 2px rgba(20,14,8,.55), 0 2px 7px rgba(0,0,0,.55);
}

/* 悬浮提示 */
#gwp-panel .gwp-map-tip {
  position: absolute; z-index: 6; pointer-events: none; display: none;
  max-width: 220px; padding: 6px 9px;
  background: rgba(36,31,26,.93); color: #f0e2c4;
  border: 1px solid #c9a35f; border-radius: 4px;
  font-size: 11px; line-height: 1.7;
}
#gwp-panel .gwp-map-tip b { color: #e8cf9a; font-weight: normal; }

/* 地图空态 */
#gwp-panel .gwp-map-empty {
  position: absolute; inset: 0; z-index: 4;
  display: flex; align-items: center; justify-content: center;
  color: #7a6a52; font-size: 13px; text-align: center; line-height: 2;
  background: rgba(242,232,208,.75);
}

/* ---------- 名帖页（NPC 列表） ---------- */
#gwp-panel .gwp-page-list { max-height: 52vh; overflow-y: auto; }
#gwp-panel .gwp-page-list::-webkit-scrollbar { width: 5px; }
#gwp-panel .gwp-page-list::-webkit-scrollbar-thumb { background: rgba(122,98,72,.5); border-radius: 2px; }
#gwp-panel .gwp-page-list::-webkit-scrollbar-track { background: transparent; }

/* 面板被手动缩放后：地图垂直居中、名帖页撑满不限高 */
#gwp-panel.gwp-resized .gwp-page-map { display: flex; align-items: center; justify-content: center; }
#gwp-panel.gwp-resized .gwp-page-map .gwp-map { width: 100%; }
#gwp-panel.gwp-resized .gwp-page-list { max-height: none; }

#gwp-panel .gwp-npcs { padding: 4px 10px 12px; }
#gwp-panel .gwp-npc {
  margin-top: 9px;
  background: rgba(255,252,244,.55);
  border: 1px solid rgba(122,98,72,.35);
  border-left: 3px solid #b03a30;
  border-radius: 4px;
  transition: box-shadow .2s;
}
#gwp-panel .gwp-npc:hover { box-shadow: 0 2px 8px rgba(60,45,25,.18); }
#gwp-panel .gwp-npc-head {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; cursor: pointer; user-select: none;
}
#gwp-panel .gwp-avatar {
  width: 44px; height: 44px; flex: none; border-radius: 50%;
  border: 2px solid #b99655;
  background-color: #8f2b23; background-size: cover; background-position: center top;
  display: flex; align-items: center; justify-content: center;
  color: #f6e8cd; font-size: 21px;
  box-shadow: 0 1px 4px rgba(60,40,20,.35);
}

/* ---------- 立绘页（画廊） ---------- */
/* NEW_PORTRAIT_ALIGNMENT */
#gwp-panel .gwp-gallery-item[data-name="阿若"] .gwp-gallery-img,
#gwp-panel .gwp-gallery-item[data-name="阮宜"] .gwp-gallery-img,
#gwp-panel .gwp-gallery-item[data-name="叶长宁"] .gwp-gallery-img,
#gwp-panel .gwp-gallery-item[data-name="春桃"] .gwp-gallery-img { object-position: center top; }

#gwp-panel .gwp-page-gallery { position: relative; max-height: 52vh; overflow-y: auto; padding: 8px 10px 12px; }
#gwp-panel .gwp-page-gallery::-webkit-scrollbar { width: 5px; }
#gwp-panel .gwp-page-gallery::-webkit-scrollbar-thumb { background: rgba(122,98,72,.5); border-radius: 2px; }
#gwp-panel .gwp-page-gallery::-webkit-scrollbar-track { background: transparent; }
#gwp-panel .gwp-gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
#gwp-panel .gwp-gallery-item {
  position: relative; cursor: pointer; overflow: hidden;
  border: 1px solid rgba(122,98,72,.35); border-radius: 4px;
  background: rgba(255,252,244,.55);
}
#gwp-panel .gwp-gallery-img {
  width: 100%; aspect-ratio: 2 / 3; object-fit: cover; display: block;
  background-color: #8f2b23;
}
#gwp-panel .gwp-gallery-seal {
  display: flex; align-items: center; justify-content: center;
  color: #f6e8cd; font-size: 40px;
}
#gwp-panel .gwp-gallery-name {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 6px;
  font-size: 12px; letter-spacing: 1px; color: #f6e8cd; text-align: center;
  background: linear-gradient(transparent, rgba(20,14,8,.85));
}
#gwp-panel .gwp-gallery-view {
  position: absolute; inset: 0; z-index: 10; display: none;
  align-items: center; justify-content: center; cursor: zoom-out;
  background: rgba(20,14,8,.86);
}
#gwp-panel .gwp-gallery-view img {
  max-width: 92%; max-height: 92%;
  border: 2px solid #c9a35f; border-radius: 4px;
  box-shadow: 0 6px 24px rgba(0,0,0,.6);
}
#gwp-panel .gwp-npc-info { flex: 1; min-width: 0; }
#gwp-panel .gwp-npc-name { font-size: 16px; color: #33291f; letter-spacing: 1px; }
#gwp-panel .gwp-npc-role { font-size: 11px; color: #a05a2c; letter-spacing: 1px; margin-top: 2px; }
#gwp-panel .gwp-npc-meta {
  font-size: 12px; color: #6b5a44; margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#gwp-panel .gwp-npc-meta .gwp-dot { color: #b03a30; margin: 0 5px; }
#gwp-panel .gwp-caret { color: #8a7554; font-size: 11px; transition: transform .25s; }
#gwp-panel .gwp-npc.gwp-expanded .gwp-caret { transform: rotate(90deg); }

/* ---------- 人际关系 ---------- */
#gwp-panel .gwp-relations {
  display: none; padding: 4px 12px 11px;
  border-top: 1px dashed rgba(90,70,50,.35);
  background: rgba(90,70,50,.06);
}
#gwp-panel .gwp-npc.gwp-expanded .gwp-relations { display: block; }
#gwp-panel .gwp-rel { margin-top: 9px; }
#gwp-panel .gwp-rel-top { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
#gwp-panel .gwp-rel-name { color: #33291f; }
#gwp-panel .gwp-rel-fav { font-size: 12px; font-variant-numeric: tabular-nums; }
#gwp-panel .gwp-rel-fav.gwp-pos { color: #8f2b23; }
#gwp-panel .gwp-rel-fav.gwp-neg { color: #2e4a5e; }
#gwp-panel .gwp-favbar {
  position: relative; height: 7px; margin-top: 4px;
  background: rgba(90,70,50,.15); border-radius: 3px; overflow: hidden;
}
#gwp-panel .gwp-favbar::before {
  content: ''; position: absolute; left: 50%; top: 0; bottom: 0;
  width: 1px; background: rgba(60,45,30,.5);
}
#gwp-panel .gwp-fav-fill { position: absolute; top: 0; bottom: 0; }
#gwp-panel .gwp-fav-fill.gwp-pos { left: 50%; background: linear-gradient(90deg, #c06a5e, #8f2b23); }
#gwp-panel .gwp-fav-fill.gwp-neg { right: 50%; background: linear-gradient(270deg, #5a7a96, #2e4a5e); }
#gwp-panel .gwp-rel-note { font-size: 12px; color: #6b5a44; margin-top: 4px; line-height: 1.6; }
#gwp-panel .gwp-rel-note::before { content: '「'; color: #b03a30; }
#gwp-panel .gwp-rel-note::after  { content: '」'; color: #b03a30; }
#gwp-panel .gwp-rel-none { margin-top: 8px; font-size: 12px; color: #9a8a70; text-align: center; }

/* ---------- 空态 ---------- */
#gwp-panel .gwp-empty { padding: 26px 18px; text-align: center; color: #7a6a52; font-size: 13px; line-height: 2; }
/* 在原版布局上做轻微调整 */
#gwp-panel { background: linear-gradient(160deg,#f8f0e2 0%,#f3e7d1 55%,#eee0c4 100%); border-color:#876747; box-shadow:0 10px 32px rgba(35,21,12,.38); }
#gwp-panel .gwp-header { background:linear-gradient(180deg,#492b24,#34231d); border-bottom-color:#ba965d; }
#gwp-panel .gwp-title { color:#ead1a1; }
#gwp-panel .gwp-icon-btn { color:#d5b77f; }
#gwp-panel .gwp-world { border-bottom-color:rgba(110,78,47,.30); }
#gwp-panel .gwp-time-seg.gwp-now { background:#873e31; box-shadow:0 0 5px rgba(135,62,49,.25); }
#gwp-panel .gwp-tab.gwp-active { background:rgba(143,43,35,.09); }
#gwp-panel .gwp-npc { border-color:rgba(139,105,65,.3); border-left-color:#a04a38; background:rgba(255,252,244,.62); }
#gwp-panel .gwp-npc-head { padding:10px 12px; }
#gwp-panel .gwp-npc-role { color:#89532e; }
#gwp-panel .gwp-npc-meta { line-height:1.65; }
#gwp-panel .gwp-gallery-item { border-color:rgba(139,105,65,.42); }
#gwp-panel .gwp-marker-name { background:rgba(37,27,20,.86); border-color:rgba(204,170,106,.75); }

#gwp-panel .gwp-header, #gwp-panel .gwp-world, #gwp-panel .gwp-tabs { flex-shrink: 0; }
#gwp-panel .gwp-pages { overflow: hidden; }
#gwp-panel .gwp-page-map { overflow: auto; overscroll-behavior: contain; }
#gwp-panel.gwp-resized .gwp-page-map { align-items: flex-start; }
#gwp-fab { touch-action: none; }
#gwp-fab:hover { transform: none; }
@media (pointer: coarse) { #gwp-fab:hover { transform: none; } }

`;

// =========================== 工具函数 ===========================

const TIME_ORDER = ['卯', '巳', '未', '酉', '戌', '子', '丑'];
const NIGHT_TIMES = new Set(['戌', '子', '丑']);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  // 白名单：http(s)://、/ 开头的同源路径、data:image
  if (/^(https?:\/\/|\/|data:image\/)/i.test(s)) {
    return s.replace(/["'\\<>]/g, '');
  }
  // 不带协议名的相对路径（如 jinse/day.jpg、./day.jpg）；javascript:、file: 等协议一律拒绝
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    return s.replace(/["'\\<>]/g, '');
  }
  return '';
}

/** '巳时_日上三竿' -> { name: '巳时', char: '巳', desc: '日上三竿' } */
function parseShichen(raw) {
  const s = String(raw ?? '');
  const [name, ...rest] = s.split('_');
  const finalName = name || '—';
  return { name: finalName, char: finalName.charAt(0), desc: rest.join('_') };
}

/** 新卡读取固定字段，旧聊天按明确优先级兼容，避免依赖对象键的排列顺序。 */
function findUserLocation(world) {
  return normalizePlayerWorld(world)?.[PLAYER_LOCATION_KEY] ?? null;
}

function getUserName() {
  return getPlayerName() || USER_TITLE;
}

function clampFav(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-100, Math.min(100, Math.round(n)));
}

/**
 * 位置字符串 → 地图锚点（anchors 为百分比坐标表，默认 SVG 兜底表）。
 * 返回 { key, xy, sub }；无法匹配返回 null（调用方放「行踪不明」角落）
 * 匹配顺序：精确键 → 位置串包含的最长锚点键 → 「_」首段 → 双向包含模糊匹配
 * （「后山_洗华池」这类拼凑地点会落到更具体的「洗华池」而非首段「后山」）
 */
function resolveAnchor(location, anchors = SVG_ANCHORS_PCT) {
  const raw = String(location ?? '').trim();
  const s = MAP_ALIASES[raw] || raw;
  if (!s) return null;
  if (anchors[s]) return { key: s, xy: anchors[s], sub: '' };
  // 位置串包含的最长锚点键（如「后山_洗华池」包含「洗华池」，比首段「后山」更具体）
  let best = null;
  for (const k of Object.keys(anchors)) {
    if (k.length >= 2 && s.includes(k) && (!best || k.length > best.length)) best = k;
  }
  if (best) return { key: best, xy: anchors[best], sub: s };
  const head = s.split('_')[0];
  if (anchors[head]) return { key: head, xy: anchors[head], sub: s.slice(head.length + 1) };
  for (const k of Object.keys(anchors)) {
    const kh = k.split('_')[0];
    if (kh.length >= 2 && (s.includes(kh) || (head.length >= 2 && kh.includes(head)))) {
      return { key: k, xy: anchors[k], sub: s };
    }
  }
  return null;
}

/** 子地点（如「内室」「小佛堂」）的确定性微偏移，避免与主锚点精确重叠 */
function subOffset(sub) {
  if (!sub) return [0, 0];
  let h = 0;
  for (const ch of String(sub)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const ang = ((h % 360) * Math.PI) / 180;
  const r = 9 + (h % 3) * 4;
  return [Math.cos(ang) * r, Math.sin(ang) * r];
}

// ========================= 地图 SVG 绘制 =========================

function buildMapSvg() { return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1800 1200\" role=\"img\" aria-label=\"锦瑟山庄扩建结构图\"><rect width=\"1800\" height=\"1200\" fill=\"#e7e3c9\"/><path d=\"M0 110Q130 0 280 72Q410-20 580 65Q770-40 950 60Q1200-30 1380 50Q1600-15 1800 80V0H0Z\" fill=\"#aac3a0\"/><path d=\"M1740 100Q1780 200 1750 400T1740 1100L1800 1200V0Z\" fill=\"#82bac5\"/><path d=\"M35 132H1760V1164H35Z\" fill=\"none\" stroke=\"#b4b5a0\" stroke-width=\"10\"/><polygon points=\"738,672 882,648 1116,648 1296,684 1386,756 1386,864 1242,960 954,960 756,900 648,792 684,720\" fill=\"#82bac5\" stroke=\"#62969d\" stroke-width=\"4\"/><ellipse cx=\"1505\" cy=\"608\" rx=\"55\" ry=\"34\" fill=\"#82bac5\"/><polyline points=\"954,1164 954,1092 972,1044 972,996\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"882,1044 828,972 612,924 594,828 558,708 630,648 684,600 702,552 702,408 648,396\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"1062,1044 1314,1020 1440,936 1656,888 1692,684 1692,420 1584,396 1278,408 1098,408\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"630,648 900,648 1350,648 1422,660 1458,684\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"900,612 900,648\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"702,552 630,552 612,552\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"630,648 450,636 414,636 360,588 360,516\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"180,384 414,396 504,396 648,396 774,384 792,348\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"702,408 792,384 918,384 1098,372 1278,408\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"918,384 918,240 954,216\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"954,216 1116,156 1242,120 1314,72 1530,132 1584,216\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"180,384 144,228 252,144 432,96 702,108 810,156\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"1278,408 1332,396 1440,396 1584,396 1584,348 1584,216\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"1692,540 1674,540\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"1350,648 1386,720 1386,780 1404,852 1440,936\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"1386,780 1404,780\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"1440,936 1494,972 1494,1032 1584,1044\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"828,972 990,972 1206,996 1314,1020\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"828,972 810,1056 774,1104 540,1104 288,1104 144,1080\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"648,780 720,768 756,792 810,768 846,792 900,780 918,792\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"648,780 720,768 756,792 810,768 846,792 900,780 918,792\" fill=\"none\" stroke=\"#526b79\" stroke-width=\"2\"/><polyline points=\"792,156 756,132 720,120 702,108\" fill=\"none\" stroke=\"#d2be96\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"107.7\" cy=\"907.8\" r=\"12.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"134.8\" cy=\"294.4\" r=\"17.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"48.7\" cy=\"829.9\" r=\"11.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"107.1\" cy=\"798.2\" r=\"18.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"81.9\" cy=\"932.5\" r=\"20.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"51.0\" cy=\"601.0\" r=\"20.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"110.2\" cy=\"532.0\" r=\"13.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"130.5\" cy=\"190.9\" r=\"18.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"120.1\" cy=\"259.8\" r=\"13.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"69.0\" cy=\"625.0\" r=\"14.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"124.9\" cy=\"988.4\" r=\"13.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"125.0\" cy=\"176.1\" r=\"11.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"103.2\" cy=\"869.1\" r=\"19.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"134.2\" cy=\"926.7\" r=\"12.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"110.6\" cy=\"988.4\" r=\"11.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"87.0\" cy=\"256.6\" r=\"11.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"85.6\" cy=\"746.9\" r=\"20.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"52.5\" cy=\"590.2\" r=\"21.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"112.7\" cy=\"615.5\" r=\"12.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"99.9\" cy=\"357.9\" r=\"17.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"101.6\" cy=\"481.7\" r=\"18.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"78.3\" cy=\"555.4\" r=\"19.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"63.8\" cy=\"286.2\" r=\"16.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"81.3\" cy=\"940.5\" r=\"12.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"75.3\" cy=\"164.9\" r=\"15.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"69.7\" cy=\"536.3\" r=\"18.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"43.6\" cy=\"1049.8\" r=\"17.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"117.1\" cy=\"621.9\" r=\"16.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"78.9\" cy=\"486.4\" r=\"12.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"68.8\" cy=\"389.1\" r=\"13.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"126.2\" cy=\"868.5\" r=\"17.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"41.6\" cy=\"359.2\" r=\"16.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"105.7\" cy=\"508.3\" r=\"17.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"126.0\" cy=\"364.1\" r=\"14.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"112.2\" cy=\"412.6\" r=\"17.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"77.7\" cy=\"128.4\" r=\"15.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"46.5\" cy=\"855.5\" r=\"19.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"90.3\" cy=\"964.3\" r=\"12.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"82.3\" cy=\"276.9\" r=\"10.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"118.3\" cy=\"159.6\" r=\"20.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"92.9\" cy=\"775.6\" r=\"10.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"126.2\" cy=\"864.1\" r=\"11.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"57.4\" cy=\"243.8\" r=\"15.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"47.5\" cy=\"868.6\" r=\"15.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"106.9\" cy=\"351.9\" r=\"17.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1690.8\" cy=\"683.5\" r=\"14.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1739.1\" cy=\"861.6\" r=\"19.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1680.7\" cy=\"272.0\" r=\"11.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1661.8\" cy=\"970.7\" r=\"13.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1728.4\" cy=\"309.0\" r=\"16.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1672.4\" cy=\"376.4\" r=\"18.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1704.8\" cy=\"951.3\" r=\"12.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1674.3\" cy=\"156.5\" r=\"12.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1738.3\" cy=\"607.4\" r=\"15.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1680.7\" cy=\"783.7\" r=\"17.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1664.0\" cy=\"141.7\" r=\"11.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1723.5\" cy=\"759.6\" r=\"12.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1671.1\" cy=\"376.5\" r=\"17.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1717.4\" cy=\"314.5\" r=\"13.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1671.3\" cy=\"951.1\" r=\"16.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1734.6\" cy=\"318.0\" r=\"17.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1701.2\" cy=\"938.8\" r=\"14.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1670.6\" cy=\"835.9\" r=\"20.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1695.8\" cy=\"399.4\" r=\"10.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1690.0\" cy=\"932.6\" r=\"13.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1690.4\" cy=\"607.9\" r=\"12.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1659.8\" cy=\"567.1\" r=\"20.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1728.5\" cy=\"371.8\" r=\"18.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1724.9\" cy=\"624.9\" r=\"14.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1667.6\" cy=\"733.3\" r=\"17.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1669.2\" cy=\"227.2\" r=\"11.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1724.5\" cy=\"896.9\" r=\"15.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1705.0\" cy=\"736.6\" r=\"11.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1696.8\" cy=\"503.3\" r=\"19.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1664.8\" cy=\"862.2\" r=\"11.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1705.0\" cy=\"902.4\" r=\"10.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1693.5\" cy=\"104.0\" r=\"15.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1693.7\" cy=\"963.8\" r=\"15.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1731.9\" cy=\"756.3\" r=\"19.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1681.5\" cy=\"186.2\" r=\"17.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1660.1\" cy=\"663.6\" r=\"12.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1704.4\" cy=\"789.6\" r=\"20.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1668.1\" cy=\"257.3\" r=\"14.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1737.7\" cy=\"329.1\" r=\"15.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1684.3\" cy=\"155.8\" r=\"15.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"258.0\" cy=\"188.8\" r=\"18.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"467.0\" cy=\"179.8\" r=\"17.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"391.2\" cy=\"200.6\" r=\"10.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"243.0\" cy=\"196.9\" r=\"16.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"372.5\" cy=\"191.2\" r=\"16.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"506.8\" cy=\"203.4\" r=\"18.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"605.8\" cy=\"193.0\" r=\"11.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"294.4\" cy=\"204.5\" r=\"18.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"439.4\" cy=\"175.1\" r=\"11.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"460.5\" cy=\"186.9\" r=\"12.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"642.9\" cy=\"179.3\" r=\"20.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1081.8\" cy=\"324.4\" r=\"18.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"850.6\" cy=\"233.5\" r=\"19.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"978.8\" cy=\"267.9\" r=\"18.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1071.6\" cy=\"294.9\" r=\"15.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"891.5\" cy=\"295.2\" r=\"11.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1138.2\" cy=\"304.5\" r=\"11.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"741.3\" cy=\"319.3\" r=\"12.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1033.2\" cy=\"241.2\" r=\"11.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"882.0\" cy=\"214.2\" r=\"19.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1163.3\" cy=\"302.9\" r=\"11.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"918.0\" cy=\"217.2\" r=\"19.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1276.4\" cy=\"323.6\" r=\"19.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1077.2\" cy=\"267.2\" r=\"11.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"757.9\" cy=\"282.4\" r=\"20.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1279.6\" cy=\"257.2\" r=\"15.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1224.7\" cy=\"240.3\" r=\"18.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1070.0\" cy=\"259.2\" r=\"14.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"827.3\" cy=\"223.3\" r=\"13.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1283.7\" cy=\"307.4\" r=\"10.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1156.0\" cy=\"222.7\" r=\"16.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1246.2\" cy=\"318.2\" r=\"19.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1286.0\" cy=\"283.9\" r=\"10.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"879.7\" cy=\"288.6\" r=\"16.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1241.7\" cy=\"226.3\" r=\"19.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1057.7\" cy=\"279.1\" r=\"11.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"935.6\" cy=\"269.3\" r=\"18.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1114.0\" cy=\"285.1\" r=\"17.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"934.1\" cy=\"246.9\" r=\"20.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1108.8\" cy=\"275.0\" r=\"20.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1215.9\" cy=\"295.1\" r=\"20.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"951.2\" cy=\"320.7\" r=\"16.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"974.3\" cy=\"255.3\" r=\"10.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1227.8\" cy=\"326.7\" r=\"14.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1260.9\" cy=\"221.3\" r=\"15.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1636.8\" cy=\"174.3\" r=\"11.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1479.3\" cy=\"131.8\" r=\"17.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1458.5\" cy=\"175.1\" r=\"17.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1242.6\" cy=\"191.8\" r=\"18.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1593.0\" cy=\"146.2\" r=\"12.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1517.9\" cy=\"194.6\" r=\"16.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1307.0\" cy=\"160.9\" r=\"12.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1412.6\" cy=\"197.1\" r=\"17.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1289.3\" cy=\"194.1\" r=\"19.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1377.5\" cy=\"130.1\" r=\"17.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1342.7\" cy=\"138.9\" r=\"20.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1376.1\" cy=\"141.5\" r=\"13.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1638.0\" cy=\"154.6\" r=\"15.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1310.7\" cy=\"135.7\" r=\"11.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1226.0\" cy=\"161.9\" r=\"14.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1562.6\" cy=\"438.3\" r=\"19.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1472.4\" cy=\"427.3\" r=\"11.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1497.4\" cy=\"420.5\" r=\"14.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"581.2\" cy=\"762.7\" r=\"11.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"552.0\" cy=\"724.8\" r=\"20.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"493.0\" cy=\"700.7\" r=\"10.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"515.6\" cy=\"845.0\" r=\"10.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"553.0\" cy=\"871.3\" r=\"12.5\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"569.3\" cy=\"831.4\" r=\"20.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"582.3\" cy=\"809.6\" r=\"14.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"524.2\" cy=\"693.1\" r=\"10.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"557.3\" cy=\"730.2\" r=\"11.7\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"537.4\" cy=\"698.4\" r=\"17.0\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"594.2\" cy=\"750.7\" r=\"10.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"500.1\" cy=\"736.9\" r=\"19.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"593.4\" cy=\"804.4\" r=\"14.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1436.2\" cy=\"1046.8\" r=\"10.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1464.2\" cy=\"1028.3\" r=\"17.6\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1451.6\" cy=\"1073.2\" r=\"17.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1537.1\" cy=\"940.8\" r=\"18.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1424.4\" cy=\"1005.3\" r=\"10.2\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1553.8\" cy=\"1003.3\" r=\"16.3\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1483.2\" cy=\"1036.9\" r=\"10.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1446.0\" cy=\"902.1\" r=\"16.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1431.0\" cy=\"901.2\" r=\"19.4\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1473.5\" cy=\"963.7\" r=\"19.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1482.9\" cy=\"1047.2\" r=\"20.9\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1438.2\" cy=\"941.4\" r=\"10.1\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1464.8\" cy=\"1003.8\" r=\"20.8\" fill=\"#aac3a0\" opacity=\".85\"/><circle cx=\"1555.2\" cy=\"1026.0\" r=\"11.6\" fill=\"#aac3a0\" opacity=\".85\"/><rect x=\"720.0\" y=\"420.0\" width=\"360\" height=\"192\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"759.6\" y=\"438.0\" width=\"280.8\" height=\"46\" fill=\"#d2be96\"/><path d=\"M737.136 438.0L793.296 418.0H1006.704L1062.864 438.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"726.0\" y=\"455.0\" width=\"18\" height=\"149\" fill=\"#526b79\"/><rect x=\"1056.0\" y=\"455.0\" width=\"18\" height=\"149\" fill=\"#526b79\"/><rect x=\"1080.0\" y=\"438.0\" width=\"144\" height=\"108\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1095.84\" y=\"456.0\" width=\"112.32000000000001\" height=\"41.04\" fill=\"#d2be96\"/><path d=\"M1086.8544 456.0L1109.3184 436.0H1194.6816L1217.1456 456.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1152.0\" y=\"330.0\" width=\"144\" height=\"84\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1167.84\" y=\"348.0\" width=\"112.32000000000001\" height=\"31.92\" fill=\"#d2be96\"/><path d=\"M1158.8544 348.0L1181.3184 328.0H1266.6816L1289.1456 348.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1008.0\" y=\"582.0\" width=\"108\" height=\"60\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1019.88\" y=\"600.0\" width=\"84.24000000000001\" height=\"22.8\" fill=\"#d2be96\"/><path d=\"M1013.1408 600.0L1029.9888 580.0H1094.0112L1110.8592 600.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1134.0\" y=\"600.0\" width=\"72\" height=\"48\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1141.92\" y=\"618.0\" width=\"56.160000000000004\" height=\"18.240000000000002\" fill=\"#d2be96\"/><path d=\"M1137.4272 618.0L1148.6592 598.0H1191.3408L1202.5728 618.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"153.0\" y=\"222.0\" width=\"234\" height=\"156\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"178.74\" y=\"240.0\" width=\"182.52\" height=\"46\" fill=\"#d2be96\"/><path d=\"M164.1384 240.0L200.6424 220.0H339.3576L375.8616 240.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"159.0\" y=\"257.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"363.0\" y=\"257.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"513.0\" y=\"222.0\" width=\"234\" height=\"156\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"538.74\" y=\"240.0\" width=\"182.52\" height=\"46\" fill=\"#d2be96\"/><path d=\"M524.1384 240.0L560.6424 220.0H699.3576L735.8616 240.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"519.0\" y=\"257.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"723.0\" y=\"257.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"144.0\" y=\"444.0\" width=\"216\" height=\"144\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"167.76\" y=\"462.0\" width=\"168.48000000000002\" height=\"46\" fill=\"#d2be96\"/><path d=\"M154.2816 462.0L187.9776 442.0H316.0224L349.7184 462.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"150.0\" y=\"479.0\" width=\"18\" height=\"101\" fill=\"#526b79\"/><rect x=\"336.0\" y=\"479.0\" width=\"18\" height=\"101\" fill=\"#526b79\"/><rect x=\"126.0\" y=\"618.0\" width=\"324\" height=\"180\" rx=\"3\" fill=\"#d2be96\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><circle cx=\"156.0\" cy=\"653.0\" r=\"8\" fill=\"#526b79\"/><circle cx=\"201.0\" cy=\"653.0\" r=\"8\" fill=\"#526b79\"/><circle cx=\"246.0\" cy=\"653.0\" r=\"8\" fill=\"#526b79\"/><circle cx=\"291.0\" cy=\"653.0\" r=\"8\" fill=\"#526b79\"/><circle cx=\"336.0\" cy=\"653.0\" r=\"8\" fill=\"#526b79\"/><rect x=\"432.0\" y=\"480.0\" width=\"180\" height=\"120\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"451.8\" y=\"498.0\" width=\"140.4\" height=\"45.6\" fill=\"#d2be96\"/><path d=\"M440.568 498.0L468.648 478.0H575.352L603.432 498.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"438.0\" y=\"515.0\" width=\"18\" height=\"77\" fill=\"#526b79\"/><rect x=\"588.0\" y=\"515.0\" width=\"18\" height=\"77\" fill=\"#526b79\"/><rect x=\"1044.0\" y=\"270.0\" width=\"108\" height=\"60\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1055.88\" y=\"288.0\" width=\"84.24000000000001\" height=\"22.8\" fill=\"#d2be96\"/><path d=\"M1049.1408 288.0L1065.9888 268.0H1130.0112L1146.8592 288.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"837.0\" y=\"102.0\" width=\"234\" height=\"108\" rx=\"40\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><ellipse cx=\"954.0\" cy=\"161.4\" rx=\"81.89999999999999\" ry=\"34.56\" fill=\"#82bac5\"/><rect x=\"1332.0\" y=\"222.0\" width=\"216\" height=\"156\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1355.76\" y=\"240.0\" width=\"168.48000000000002\" height=\"46\" fill=\"#d2be96\"/><path d=\"M1342.2816 240.0L1375.9776 220.0H1504.0224L1537.7184 240.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1338.0\" y=\"257.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"1524.0\" y=\"257.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"1458.0\" y=\"468.0\" width=\"216\" height=\"144\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1481.76\" y=\"486.0\" width=\"168.48000000000002\" height=\"46\" fill=\"#d2be96\"/><path d=\"M1468.2816 486.0L1501.9776 466.0H1630.0224L1663.7184 486.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1464.0\" y=\"503.0\" width=\"18\" height=\"101\" fill=\"#526b79\"/><rect x=\"1650.0\" y=\"503.0\" width=\"18\" height=\"101\" fill=\"#526b79\"/><rect x=\"1404.0\" y=\"702.0\" width=\"216\" height=\"156\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1427.76\" y=\"720.0\" width=\"168.48000000000002\" height=\"46\" fill=\"#d2be96\"/><path d=\"M1414.2816 720.0L1447.9776 700.0H1576.0224L1609.7184 720.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1410.0\" y=\"737.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"1596.0\" y=\"737.0\" width=\"18\" height=\"113\" fill=\"#526b79\"/><rect x=\"1494.0\" y=\"912.0\" width=\"180\" height=\"120\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1513.8\" y=\"930.0\" width=\"140.4\" height=\"45.6\" fill=\"#d2be96\"/><path d=\"M1502.568 930.0L1530.648 910.0H1637.352L1665.432 930.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1500.0\" y=\"947.0\" width=\"18\" height=\"77\" fill=\"#526b79\"/><rect x=\"1650.0\" y=\"947.0\" width=\"18\" height=\"77\" fill=\"#526b79\"/><rect x=\"918.0\" y=\"744.0\" width=\"144\" height=\"96\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"933.84\" y=\"762.0\" width=\"112.32000000000001\" height=\"36.480000000000004\" fill=\"#d2be96\"/><path d=\"M924.8543999999999 762.0L947.3184 742.0H1032.6816L1055.1456 762.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"924.0\" y=\"779.0\" width=\"18\" height=\"53\" fill=\"#526b79\"/><rect x=\"1038.0\" y=\"779.0\" width=\"18\" height=\"53\" fill=\"#526b79\"/><rect x=\"891.0\" y=\"1002.0\" width=\"162\" height=\"84\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"908.82\" y=\"1020.0\" width=\"126.36\" height=\"31.92\" fill=\"#d2be96\"/><path d=\"M898.7112 1020.0L923.9832 1000.0H1020.0168L1045.2888 1020.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"873.0\" y=\"1110.0\" width=\"162\" height=\"60\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"890.82\" y=\"1128.0\" width=\"126.36\" height=\"22.8\" fill=\"#d2be96\"/><path d=\"M880.7112 1128.0L905.9832 1108.0H1002.0168L1027.2888 1128.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"1053.0\" y=\"1092.0\" width=\"90\" height=\"48\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"1062.9\" y=\"1110.0\" width=\"70.2\" height=\"18.240000000000002\" fill=\"#d2be96\"/><path d=\"M1057.284 1110.0L1071.324 1090.0H1124.676L1138.716 1110.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"234.0\" y=\"948.0\" width=\"576\" height=\"144\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"255.12\" y=\"966.0\" width=\"149.76\" height=\"46\" fill=\"#d2be96\"/><path d=\"M243.13920000000002 966.0L273.0912 946.0H386.9088L416.8608 966.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"447.12\" y=\"966.0\" width=\"149.76\" height=\"46\" fill=\"#d2be96\"/><path d=\"M435.1392 966.0L465.0912 946.0H578.9088L608.8607999999999 966.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"639.12\" y=\"966.0\" width=\"149.76\" height=\"46\" fill=\"#d2be96\"/><path d=\"M627.1392000000001 966.0L657.0912 946.0H770.9088L800.8607999999999 966.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"99.0\" y=\"972.0\" width=\"90\" height=\"96\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"108.9\" y=\"990.0\" width=\"70.2\" height=\"36.480000000000004\" fill=\"#d2be96\"/><path d=\"M103.28399999999999 990.0L117.324 970.0H170.676L184.716 990.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"105.0\" y=\"1007.0\" width=\"18\" height=\"53\" fill=\"#526b79\"/><rect x=\"165.0\" y=\"1007.0\" width=\"18\" height=\"53\" fill=\"#526b79\"/><rect x=\"639.0\" y=\"888.0\" width=\"108\" height=\"60\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"650.88\" y=\"906.0\" width=\"84.24000000000001\" height=\"22.8\" fill=\"#d2be96\"/><path d=\"M644.1408 906.0L660.9888 886.0H725.0112L741.8592 906.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"621.0\" y=\"42.0\" width=\"162\" height=\"84\" fill=\"#d7cfad\" stroke=\"#b4b5a0\" stroke-width=\"5\"/><rect x=\"638.82\" y=\"60.0\" width=\"126.36\" height=\"31.92\" fill=\"#d2be96\"/><path d=\"M628.7112 60.0L653.9832 40.0H750.0168L775.2888 60.0Z\" fill=\"#526b79\" stroke=\"#b4b5a0\" stroke-width=\"2\"/><rect x=\"627.0\" y=\"77.0\" width=\"18\" height=\"41\" fill=\"#526b79\"/><rect x=\"759.0\" y=\"77.0\" width=\"18\" height=\"41\" fill=\"#526b79\"/><rect x=\"714\" y=\"447\" width=\"54\" height=\"46\" fill=\"#526b79\"/><rect x=\"714\" y=\"499\" width=\"54\" height=\"46\" fill=\"#526b79\"/></svg>"; }

// =========================== 主流程 ===========================

// ---------------- 面板拖拽 / 缩放（模块级，可独立测试） ----------------

const GWP_PANEL_KEY = 'gongweilu-panel-layout';
const GWP_FAB_KEY = 'gongweilu-fab-layout-v2';

let gwpHostDocument = null;
function gwpParentWindow() {
  if (gwpHostDocument && gwpHostDocument.defaultView) return gwpHostDocument.defaultView;
  try { return (window.parent.document || document).defaultView || window; }
  catch (error) { return window; }
}

function readLayout(key) {
  try {
    const raw = gwpParentWindow().localStorage.getItem(key);
    if (!raw) return null;
    const l = JSON.parse(raw);
    return (l && typeof l === 'object') ? l : null;
  } catch (e) { return null; }
}

function saveLayout(key, l) {
  try { gwpParentWindow().localStorage.setItem(key, JSON.stringify(l)); } catch (e) { /* 忽略 */ }
}

/** 圆球悬浮按钮：拖 = 移动，单击 = onToggle() */
function initFabDrag(fab, onToggle) {
  let activePointer = null, moved = false, ignoreClickUntil = 0;
  let startX = 0, startY = 0, origLeft = 0, origTop = 0;
  fab.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || activePointer !== null) return;
    activePointer = event.pointerId;
    moved = false;
    const rect = fab.getBoundingClientRect();
    startX = event.clientX; startY = event.clientY;
    origLeft = rect.left; origTop = rect.top;
    try { fab.setPointerCapture(event.pointerId); } catch (error) {}
  });
  fab.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    moved = true;
    event.preventDefault();
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
    fab.style.left = origLeft + dx + 'px';
    fab.style.top = origTop + dy + 'px';
    keepFabOnScreen(fab);
  });
  function finish(event, cancelled) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    if (moved || cancelled) ignoreClickUntil = Date.now() + 400;
    if (moved) {
      keepFabOnScreen(fab);
      const rect = fab.getBoundingClientRect();
      saveLayout(GWP_FAB_KEY, { left: rect.left, top: rect.top });
    }
    try { fab.releasePointerCapture(event.pointerId); } catch (error) {}
  }
  fab.addEventListener('pointerup', event => finish(event, false));
  fab.addEventListener('pointercancel', event => finish(event, true));
  fab.addEventListener('click', event => {
    if (Date.now() < ignoreClickUntil) { event.preventDefault(); return; }
    onToggle();
  });
}


/** 面板：标题栏拖拽移动 + 四边四角缩放（光标悬停提示，像系统窗口） */
/** 拖动地图视口，不移动悬浮面板；人物短按仍打开名帖。 */
function initMapPan(frame, tip) {
  const doc = frame.ownerDocument;
  let gesture = null;
  let suppressClick = false;
  frame.addEventListener('dragstart', event => event.preventDefault());
  frame.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
    if (!gesture.moved) {
      gesture.moved = true;
      frame.classList.add('gwp-panning');
      tip.style.display = 'none';
      try { frame.setPointerCapture(event.pointerId); } catch (_) {}
    }
    event.preventDefault();
    frame.scrollLeft = gesture.left - dx;
    frame.scrollTop = gesture.top - dy;
  };
  const finish = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    suppressClick = gesture.moved && event.type !== 'pointercancel';
    gesture = null;
    frame.classList.remove('gwp-panning');
    doc.removeEventListener('pointermove', move, true);
    doc.removeEventListener('pointerup', finish, true);
    doc.removeEventListener('pointercancel', finish, true);
    try { frame.releasePointerCapture(event.pointerId); } catch (_) {}
  };
  frame.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || gesture) return;
    suppressClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: frame.scrollLeft, top: frame.scrollTop, moved: false };
    event.stopPropagation();
    doc.addEventListener('pointermove', move, { capture: true, passive: false });
    doc.addEventListener('pointerup', finish, true);
    doc.addEventListener('pointercancel', finish, true);
  });
}

function initPanelMoveResize(panel, header) {
  const EDGE = 8, MIN_W = 300, MIN_H = 260;
  const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', w: 'ew-resize', e: 'ew-resize', s: 'ns-resize' };
  // 这些控件上按下不拖动面板（其余区域整块都可拖动）
  const DRAG_EXCLUDE = 'button, input, select, textarea, a, img, svg, .gwp-npc, .gwp-marker, .gwp-gallery-item, .gwp-gallery-view, .gwp-frame';

  function zoneOf(e) {
    const r = panel.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const L = x <= EDGE, R = x >= r.width - EDGE;
    const T = y <= EDGE, B = y >= r.height - EDGE;
    if (T && L) return 'nw';
    if (T && R) return 'ne';
    if (B && L) return 'sw';
    if (B && R) return 'se';
    if (L) return 'w';
    if (R) return 'e';
    if (B) return 's';
    return null; // 顶边归标题栏（移动）
  }

  panel.addEventListener('pointermove', e => {
    if (e.buttons !== 0) return;
    if (e.target.closest('.gwp-icon-btn')) { panel.style.cursor = ''; return; }
    const z = zoneOf(e);
    panel.style.cursor = z ? CURSORS[z] : (e.target.closest('.gwp-header') ? 'move' : '');
  });
  panel.addEventListener('pointerleave', () => { panel.style.cursor = ''; });

  panel.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest(DRAG_EXCLUDE)) return;
    const z = zoneOf(e);
    if (z) { startResize(e, z); return; }
    if (e.target.closest('.gwp-header')) startMove(e);
  });

  function startMove(e) {
    e.preventDefault(); // 拖动时避免选中文字 / 拖动原生图片
    const r = panel.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const origLeft = r.left, origTop = r.top, w = r.width, h = r.height;
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    panel.style.left = origLeft + 'px'; panel.style.top = origTop + 'px';
    const onMove = ev => {
      const vw = gwpParentWindow().innerWidth, vh = gwpParentWindow().innerHeight;
      const nx = Math.max(60 - w, Math.min(origLeft + (ev.clientX - startX), vw - 60));
      const ny = Math.max(0, Math.min(origTop + (ev.clientY - startY), vh - 40));
      panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
      keepPanelOnScreen(panel);
    };
    const onUp = () => {
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', onUp);
      panel.removeEventListener('pointercancel', onUp);
      keepPanelOnScreen(panel);
      const rr = panel.getBoundingClientRect();
      saveLayout(GWP_PANEL_KEY, { left: rr.left, top: rr.top, width: rr.width, height: rr.height });
    };
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onUp);
    panel.addEventListener('pointercancel', onUp);
    try { panel.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function startResize(e, z) {
    e.preventDefault(); e.stopPropagation();
    const r = panel.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const sL = r.left, sT = r.top, sW = r.width, sH = r.height;
    const onMove = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let L = sL, T = sT, W = sW, H = sH;
      if (z.includes('e')) W = sW + dx;
      if (z.includes('s')) H = sH + dy;
      if (z.includes('w')) { W = sW - dx; L = sL + dx; }
      if (z.includes('n')) { H = sH - dy; T = sT + dy; }
      if (W < MIN_W) { if (z.includes('w')) L -= (MIN_W - W); W = MIN_W; }
      if (H < MIN_H) { if (z.includes('n')) T -= (MIN_H - H); H = MIN_H; }
      const vw = gwpParentWindow().innerWidth, vh = gwpParentWindow().innerHeight;
      W = Math.min(W, vw - L - 8);
      H = Math.min(H, vh - T - 8);
      panel.style.left = L + 'px'; panel.style.top = T + 'px';
      panel.style.width = W + 'px'; panel.style.height = H + 'px';
      panel.classList.add('gwp-resized');
    };
    const onUp = () => {
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', onUp);
      panel.removeEventListener('pointercancel', onUp);
      keepPanelOnScreen(panel);
      const rr = panel.getBoundingClientRect();
      saveLayout(GWP_PANEL_KEY, { left: rr.left, top: rr.top, width: rr.width, height: rr.height });
      panel.style.cursor = '';
    };
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onUp);
    panel.addEventListener('pointercancel', onUp);
    try { panel.setPointerCapture(e.pointerId); } catch (err) {}
  }
}

/** 把面板拉回可视区：标题栏顶部 ≥0、左右至少露出 60px（防止出屏后够不到）。 */
function keepPanelOnScreen(panel) {
  const win = gwpParentWindow();
  const viewport = win.visualViewport;
  const doc = panel.ownerDocument.documentElement;
  const vw = viewport?.width || doc.clientWidth || win.innerWidth;
  const vh = viewport?.height || doc.clientHeight || win.innerHeight;
  const x = viewport?.offsetLeft || 0, y = viewport?.offsetTop || 0;
  const gap = 8;
  panel.style.maxWidth = Math.max(0, vw - gap * 2) + 'px';
  panel.style.minWidth = Math.min(300, Math.max(0, vw - gap * 2)) + 'px';
  panel.style.maxHeight = Math.max(0, vh - gap * 2) + 'px';
  const w = panel.offsetWidth, h = panel.offsetHeight;
  let left = panel.style.left && panel.style.left !== 'auto' ? parseFloat(panel.style.left) : x + vw - 18 - w;
  let top = panel.style.top && panel.style.top !== 'auto' ? parseFloat(panel.style.top) : y + vh - 86 - h;
  if (!Number.isFinite(left)) left = x + gap;
  if (!Number.isFinite(top)) top = y + gap;
  left = Math.max(x + gap, Math.min(left, x + vw - w - gap));
  top = Math.max(y + gap, Math.min(top, y + vh - h - gap));
  panel.style.right = 'auto'; panel.style.bottom = 'auto';
  panel.style.left = left + 'px'; panel.style.top = top + 'px';
}


/** 恢复面板位置/大小 */
function applyPanelLayout(panel, l) {
  if (!l || typeof l !== 'object') return;
  if (typeof l.left === 'number' && typeof l.top === 'number') {
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = l.left + 'px';
    panel.style.top = l.top + 'px';
    keepPanelOnScreen(panel);
  }
  if (typeof l.width === 'number' && l.width > 0) {
    panel.style.width = l.width + 'px';
    panel.classList.add('gwp-resized');
  }
  if (typeof l.height === 'number' && l.height > 0) {
    panel.style.height = l.height + 'px';
    panel.classList.add('gwp-resized');
  }
}

/** 恢复圆球位置 */
/** 将悬浮按钮限制在当前可见区域；兼容旋转、缩放及软键盘改变视口。 */
function keepFabOnScreen(fab) {
  const win = gwpParentWindow();
  const viewport = win.visualViewport;
  const leftEdge = viewport?.offsetLeft ?? 0;
  const topEdge = viewport?.offsetTop ?? 0;
  const width = viewport?.width || fab.ownerDocument.documentElement.clientWidth || win.innerWidth;
  const height = viewport?.height || fab.ownerDocument.documentElement.clientHeight || win.innerHeight;
  const rect = fab.getBoundingClientRect();
  const marginX = Math.min(8, Math.max(0, (width - rect.width) / 2));
  const marginY = Math.min(8, Math.max(0, (height - rect.height) / 2));
  const minLeft = leftEdge + marginX;
  const minTop = topEdge + marginY;
  const maxLeft = Math.max(minLeft, leftEdge + width - rect.width - marginX);
  let maxTop = Math.max(minTop, topEdge + height - rect.height - marginY);
  // 输入区位于可见区域底部时，按钮停在输入区上方。
  const inputArea = fab.ownerDocument.getElementById('nonQRFormItems') || fab.ownerDocument.getElementById('send_form');
  if (inputArea) {
    const inputRect = inputArea.getBoundingClientRect();
    const style = win.getComputedStyle(inputArea);
    if (style.display !== 'none' && style.visibility !== 'hidden' &&
        inputRect.width > 0 && inputRect.height > 0 &&
        inputRect.top > topEdge + height * 0.35 &&
        inputRect.top < topEdge + height &&
        inputRect.bottom >= topEdge + height - 2) {
      maxTop = Math.max(minTop, Math.min(maxTop, inputRect.top - rect.height - marginY));
    }
  }
  const left = Math.max(minLeft, Math.min(rect.left, maxLeft));
  const top = Math.max(minTop, Math.min(rect.top, maxTop));
  if (Math.abs(left - rect.left) > 0.5 || Math.abs(top - rect.top) > 0.5) {
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    fab.style.left = left + 'px';
    fab.style.top = top + 'px';
  }
}

/** 恢复后校正越界位置；不写回临时视口修正，避免软键盘覆盖用户记忆。 */
function applyFabLayout(fab, layout) {
  if (layout && Number.isFinite(layout.left) && Number.isFinite(layout.top)) {
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    fab.style.left = layout.left + 'px';
    fab.style.top = layout.top + 'px';
  }
  keepFabOnScreen(fab);
}

// BEGIN JINSE_SETTINGS_SHARED
// 面板与消息监听共用的聊天设置；概率使用0～1的小数。
const JINSE_SETTINGS_KEY = 'jinse_encounter_settings_v1';
const JINSE_SETTINGS_EVENT = 'jinse:encounter-settings-changed';

function jinseEncounterOwner(ctx) {
  if (ctx?.groupId) return `group:${ctx.groupId}`;
  const avatar = ctx?.characters?.[ctx.characterId]?.avatar;
  return avatar ? `character:${avatar}` : null;
}

function normalizeJinseSettings(raw, names, fallback = 0.01) {
  const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
  const baseProbability = valid(raw?.baseProbability) ? raw.baseProbability : fallback;
  const probabilities = {};
  for (const name of names) {
    if (valid(raw?.probabilities?.[name])) probabilities[name] = raw.probabilities[name];
  }
  return { enabled: raw?.enabled !== false, baseProbability, probabilities };
}

function jinseCharacterProbability(settings, name) {
  return Object.hasOwn(settings.probabilities, name)
    ? settings.probabilities[name] : settings.baseProbability;
}
// END JINSE_SETTINGS_SHARED

// BEGIN JINSE_ENCOUNTER_UI
function initJinseEncounterControls(root, hostWindow) {
  const page = root.querySelector('.gwp-page-encounter');
  const names = Object.keys(NPC_ROLES);
  const context = () => hostWindow.SillyTavern?.getContext?.();
  const percent = probability => String(Number((probability * 100).toFixed(4)));
  page.innerHTML = `
    <div class="gwp-encounter-heading">
      <h3>角色偶遇</h3>
      <button type="button" class="gwp-encounter-toggle" role="switch" aria-label="角色偶遇总开关" aria-checked="true">已开启</button>
    </div>
    <p class="gwp-encounter-note">每次发送时独立抽取，最多四人。设置保存在当前聊天。</p>
    <div class="gwp-encounter-uniform">
      <label for="gwp-encounter-uniform">统一概率</label>
      <div class="gwp-encounter-value"><input id="gwp-encounter-uniform" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="1"><span>%</span></div>
      <button type="button" class="gwp-encounter-apply">应用全部</button>
    </div>
    <p class="gwp-encounter-note">应用全部会覆盖单独设置；填0可暂停某人的随机出场。</p>
    <div class="gwp-encounter-people">${names.map((name, i) => `
      <div class="gwp-encounter-person" data-person="${escapeHtml(name)}">
        <label for="gwp-encounter-person-${i}">${escapeHtml(name)}</label>
        <div class="gwp-encounter-value"><input id="gwp-encounter-person-${i}" type="number" min="0" max="100" step="0.01" inputmode="decimal" data-chance="${escapeHtml(name)}" aria-label="${escapeHtml(name)}出现概率" value="1"><span>%</span></div>
        <button type="button" class="gwp-encounter-follow" data-follow="${escapeHtml(name)}">跟随统一</button>
      </div>`).join('')}
    </div>
    <p class="gwp-encounter-status" role="status" aria-live="polite"></p>
  `;
  const toggle = page.querySelector('.gwp-encounter-toggle');
  const uniform = page.querySelector('#gwp-encounter-uniform');
  const status = page.querySelector('.gwp-encounter-status');
  const controls = [...page.querySelectorAll('button,input')];

  function refresh() {
    const ctx = context();
    const available = !!(jinseEncounterOwner(ctx) && ctx?.chatMetadata && ctx.saveMetadata);
    controls.forEach(control => { control.disabled = !available; });
    const settings = normalizeJinseSettings(ctx?.chatMetadata?.[JINSE_SETTINGS_KEY], names);
    toggle.setAttribute('aria-checked', String(settings.enabled));
    toggle.textContent = settings.enabled ? '已开启' : '已关闭';
    if (hostWindow.document.activeElement !== uniform) uniform.value = percent(settings.baseProbability);
    for (const input of page.querySelectorAll('[data-chance]')) {
      if (hostWindow.document.activeElement !== input) {
        input.value = percent(jinseCharacterProbability(settings, input.dataset.chance));
      }
    }
    for (const button of page.querySelectorAll('[data-follow]')) {
      const individual = Object.hasOwn(settings.probabilities, button.dataset.follow);
      button.disabled = !available || !individual;
      button.textContent = individual ? '跟随统一' : '统一';
      button.closest('.gwp-encounter-person').classList.toggle('gwp-individual', individual);
    }
    if (!available) status.textContent = '打开山庄聊天后即可调整。';
    else if (!settings.enabled) status.textContent = '偶遇已关闭；不会触发新的随机出场。';
    else {
      const runtime = hostWindow.__jinseEncounterListener?.status?.();
      const ready = runtime?.started && runtime.owner === jinseEncounterOwner(ctx);
      status.textContent = ready ? '偶遇已开启 · 监听已就绪' : '设置已就绪；请确认偶遇任务已启用并重新载入聊天。';
    }
  }

  function readPercent(input) {
    const value = input.valueAsNumber;
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      status.textContent = '请输入0到100之间的概率。';
      return null;
    }
    return value / 100;
  }

  async function save(change) {
    const ctx = context();
    if (!jinseEncounterOwner(ctx) || !ctx?.chatMetadata || !ctx.saveMetadata) return;
    const settings = normalizeJinseSettings(ctx.chatMetadata[JINSE_SETTINGS_KEY], names);
    change(settings);
    ctx.chatMetadata[JINSE_SETTINGS_KEY] = settings;
    hostWindow.dispatchEvent(new hostWindow.CustomEvent(JINSE_SETTINGS_EVENT));
    refresh();
    try {
      await ctx.saveMetadata();
      if (context()?.chatMetadata === ctx.chatMetadata) {
        status.textContent = settings.enabled
          ? '已保存 · 概率从下一条新输入生效'
          : '已保存 · 偶遇已关闭';
      }
    } catch (error) {
      console.error('[锦瑟偶遇设置]', error);
      if (context()?.chatMetadata === ctx.chatMetadata) status.textContent = '保存失败，请重试。';
    }
  }

  toggle.addEventListener('click', () => save(settings => { settings.enabled = !settings.enabled; }));
  page.querySelector('.gwp-encounter-apply').addEventListener('click', () => {
    const probability = readPercent(uniform);
    if (probability === null) return;
    save(settings => { settings.baseProbability = probability; settings.probabilities = {}; });
  });
  function savePersonalProbability(event) {
    const input = event.target.closest('input[data-chance]');
    if (!input) return;
    if (event.type === 'input' &&
        (!Number.isFinite(input.valueAsNumber) || input.valueAsNumber < 0 || input.valueAsNumber > 100)) return;
    const probability = readPercent(input);
    if (probability === null) return;
    const settings = normalizeJinseSettings(context()?.chatMetadata?.[JINSE_SETTINGS_KEY], names);
    if (Object.hasOwn(settings.probabilities, input.dataset.chance) &&
        settings.probabilities[input.dataset.chance] === probability) return;
    save(settings => { settings.probabilities[input.dataset.chance] = probability; });
  }
  page.addEventListener('input', savePersonalProbability);
  page.addEventListener('change', savePersonalProbability);
  page.addEventListener('click', event => {
    const button = event.target.closest('button[data-follow]');
    if (button) save(settings => { delete settings.probabilities[button.dataset.follow]; });
  });
  hostWindow.addEventListener(JINSE_SETTINGS_EVENT, refresh);
  refresh();
  return { refresh, destroy() { hostWindow.removeEventListener(JINSE_SETTINGS_EVENT, refresh); } };
}
// END JINSE_ENCOUNTER_UI

$(async () => {
  const parentDoc = (window.parent && window.parent.document) || document;
  gwpHostDocument = parentDoc;

  // 防重复注入
  if (parentDoc.getElementById('gwp-root')) return;

  // 注入样式
  const styleEl = parentDoc.createElement('style');
  styleEl.id = 'gwp-style';
  styleEl.textContent = GWP_CSS;
  parentDoc.head.appendChild(styleEl);

  // 注入骨架
  const root = parentDoc.createElement('div');
  root.id = 'gwp-root';
  root.innerHTML = `
    <button id="gwp-fab" title="${escapeHtml(PANEL_TITLE)}">
      ${escapeHtml(FAB_CHAR)}
      <span class="gwp-fab-time"></span>
    </button>
    <div id="gwp-panel">
      <div class="gwp-header">
        <span class="gwp-title">${escapeHtml(PANEL_TITLE)}</span>
        <button class="gwp-icon-btn gwp-refresh" title="刷新">⟳</button>
        <button class="gwp-icon-btn gwp-close" title="关闭">✕</button>
      </div>
      <div class="gwp-world"></div>
      <div class="gwp-tabs">
        <button class="gwp-tab gwp-active" data-tab="map">地 图</button>
        <button class="gwp-tab" data-tab="list">名 帖</button>
        <button class="gwp-tab" data-tab="gallery">立 绘</button>
        <button class="gwp-tab" data-tab="encounter">偶 遇</button>
      </div>
      <div class="gwp-pages">
        <div class="gwp-page gwp-page-map">
          <div class="gwp-map">
            <div class="gwp-map-tools"><button data-map-zoom="out">缩小</button><button data-map-zoom="fit">全图</button><button data-map-zoom="in">放大</button><button data-map-labels>地名</button><button class="gwp-marker-mode" title="切换地图标记样式">像素</button></div>
            <div class="gwp-frame"><div class="gwp-map-canvas">
              <img class="gwp-mapimg" draggable="false" alt="锦瑟山庄地图" style="display:none">
              <div class="gwp-mapsvg" style="display:none">${buildMapSvg()}</div>
              <div class="gwp-map-veil" style="display:none"></div>
              <div class="gwp-map-labels"></div>
              <div class="gwp-markers"></div>
              </div><div class="gwp-map-tip"></div>
              
            </div>
          </div>
        </div>
        <div class="gwp-page gwp-page-list" style="display:none">
          <div class="gwp-npcs"></div>
        </div>
        <div class="gwp-page gwp-page-encounter" style="display:none"></div>
        <div class="gwp-page gwp-page-gallery" style="display:none">
          <div class="gwp-gallery"></div>
          <div class="gwp-gallery-view"><img alt="立绘大图"></div>
        </div>
      </div>
    </div>
  `;
  parentDoc.body.appendChild(root);
  const encounterControls = initJinseEncounterControls(root, gwpParentWindow());

  const fab = root.querySelector('#gwp-fab');
  const fabTime = root.querySelector('.gwp-fab-time');
  const panel = root.querySelector('#gwp-panel');
  const worldEl = root.querySelector('.gwp-world');
  const npcsEl = root.querySelector('.gwp-npcs');
  const mapFrame = root.querySelector('.gwp-frame');
  const mapVeil = root.querySelector('.gwp-map-veil');
  const markersEl = root.querySelector('.gwp-markers');
  const mapTip = root.querySelector('.gwp-map-tip');
  const markerModeBtn = root.querySelector('.gwp-marker-mode');

  const mapCanvas = root.querySelector('.gwp-map-canvas');
  initMapPan(mapFrame, mapTip);
  const labelsBox = root.querySelector('.gwp-map-labels');
  labelsBox.innerHTML = MAP_LABELS.map(p => `<span class="gwp-place-label" style="left:${p.x}%;top:${p.y}%">${escapeHtml(p.text)}</span>`).join('');
  let mapZoom = 1;
  root.querySelectorAll('[data-map-zoom]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.mapZoom;
    mapZoom = a === 'fit' ? 1 : Math.max(1, Math.min(3, mapZoom + (a === 'in' ? .25 : -.25)));
    mapCanvas.style.width = `${mapZoom * 100}%`;
    if (a === 'fit') mapFrame.scrollTo(0,0);
  }));
  root.querySelector('[data-map-labels]').addEventListener('click', () => {
    labelsBox.hidden = !labelsBox.hidden;
  });

  const pageMap = root.querySelector('.gwp-page-map');
  const pageList = root.querySelector('.gwp-page-list');
  const pageEncounter = root.querySelector('.gwp-page-encounter');
  const pageGallery = root.querySelector('.gwp-page-gallery');
  const galleryEl = root.querySelector('.gwp-gallery');
  const galleryView = root.querySelector('.gwp-gallery-view');
  const galleryViewImg = galleryView?.querySelector('img');
  const tabs = [...root.querySelectorAll('.gwp-tab')];

  /** 记录展开状态的 NPC 名字，刷新后保持 */
  const expanded = new Set();
  /** 最近一次读到的变量，供页签跳转时重渲染 */
  let lastStat = null;

  // ---------------- 地图底图（生图 / SVG 兜底） ----------------

  const mapImg = mapFrame.querySelector('.gwp-mapimg');
  const mapSvgBox = mapFrame.querySelector('.gwp-mapsvg');
  const dayImgUrl = safeUrl(MAP_IMAGES.day);
  const nightImgUrl = safeUrl(MAP_IMAGES.night) || dayImgUrl;
  /** 'img' = 生图地图；'svg' = 内置手绘兜底 */
  let mapMode = 'svg';
  /** 当前是否处于夜间图（锚点表随之切换） */
  let imgNight = false;

  /** 回退到内置 SVG 地图（图片缺失/加载失败时自动调用） */
  function useSvgMap(reason) {
    const wasImg = mapMode === 'img';
    mapMode = 'svg';
    mapImg.style.display = 'none';
    mapSvgBox.style.display = '';
    if (wasImg && reason) {
      console.warn(`[锦瑟山庄] ${reason}，已回退到内置手绘地图`);
      try { toastr.warning('地图图片加载失败，已回退到内置手绘地图', '锦瑟山庄'); } catch (e) { /* 无 toastr 环境 */ }
    }
    if (lastStat) {
      renderVeil(lastStat.世界);
      renderMap(lastStat);
    }
  }

  if (dayImgUrl) {
    mapMode = 'img';
    mapImg.addEventListener('error', () => {
      useSvgMap('扩建地图图片加载失败');
    });
    mapImg.style.display = '';
    mapImg.src = dayImgUrl;
  } else {
    mapSvgBox.style.display = '';
    console.info('[锦瑟山庄] MAP_IMAGES 未配置图片地址，使用内置手绘地图');
  }

  /** 当前生效的锚点表与行踪不明收容点（百分比坐标） */
  function activeAnchors() {
    return mapMode === 'img' ? (imgNight ? MAP_ANCHORS_NIGHT : MAP_ANCHORS_DAY) : SVG_ANCHORS_PCT;
  }
  function activeUnknown() {
    return mapMode === 'img' ? UNKNOWN_PCT_IMG : UNKNOWN_PCT_SVG;
  }

  // ---------------- 页签 ----------------

  function switchTab(name) {
    tabs.forEach(t => t.classList.toggle('gwp-active', t.dataset.tab === name));
    pageMap.style.display = name === 'map' ? '' : 'none';
    pageList.style.display = name === 'list' ? '' : 'none';
    pageEncounter.style.display = name === 'encounter' ? '' : 'none';
    pageGallery.style.display = name === 'gallery' ? '' : 'none';
    // Keep taller encounter settings inside viewport.
    if (panel.classList.contains('gwp-open')) keepPanelOnScreen(panel);
    if (name === 'gallery') renderGallery();
  }
  tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  /** 点击地图头像 → 跳到名帖并展开对应 NPC */
  function jumpToNpc(name) {
    expanded.add(name);
    renderNpcs(lastStat?.NPC);
    switchTab('list');
    const card = npcsEl.querySelector(`.gwp-npc[data-name="${String(name).replaceAll('"', '\\"')}"]`);
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ---------------- 数据读取 ----------------

  // 等待 Mvu 接口（加 10 秒超时，避免 MVU 未启用时永远卡住）
  let mvu = null;
  try {
    mvu = await Promise.race([
      waitGlobalInitialized('Mvu'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('等待 Mvu 超时')), 10000)),
    ]);
  } catch (e) {
    console.warn('[锦瑟山庄] waitGlobalInitialized(\'Mvu\') 失败：', e);
  }
  // 兜底：MVU 脚本会直接往主页面 window 上挂 Mvu
  if (!mvu && window.parent && window.parent.Mvu) {
    mvu = window.parent.Mvu;
    console.info('[锦瑟山庄] 已从 window.parent.Mvu 获取接口');
  }

  /** 从指定楼层的变量表中取出状态数据（优先 stat_data 真实状态，display_data 仅作兜底——展示层可能与真实状态不同步） */
  function pickStat(floorVariables) {
    const stat = floorVariables?.stat_data ?? floorVariables?.display_data;
    return stat && typeof stat === 'object' && Object.keys(stat).length > 0 ? stat : null;
  }

  /**
   * 读取状态数据：从最新楼层（-1）开始往前回退最多 8 层，
   * 找到第一个带变量的楼层（用户消息楼层可能没有 stat_data）
   */
  async function readStatData() {
    for (let id = -1; id >= -8; id--) {
      if (mvu && typeof mvu.getMvuData === 'function') {
        try {
          const stat = pickStat(mvu.getMvuData({ type: 'message', message_id: id }));
          if (stat) {
            console.debug(`[锦瑟山庄] 已从第 ${id} 层读取变量，键：`, Object.keys(stat));
            return stat;
          }
        } catch (e) {
          console.warn(`[锦瑟山庄] Mvu.getMvuData(${id}) 读取失败：`, e);
        }
      }
      // 兜底：直接读楼层消息变量
      if (typeof getChatMessages === 'function') {
        try {
          const msgs = await getChatMessages(id);
          const stat = pickStat(msgs?.[0]?.data);
          if (stat) {
            console.debug(`[锦瑟山庄] 已从第 ${id} 层消息读取变量，键：`, Object.keys(stat));
            return stat;
          }
        } catch (e) {
          console.warn(`[锦瑟山庄] getChatMessages(${id}) 读取失败：`, e);
        }
      }
      if (!mvu && typeof getChatMessages !== 'function') break;
    }
    return null;
  }

  // ---------------- 渲染：世界状态 ----------------

  function renderWorld(world) {
    const t = parseShichen(world?.当前时段);
    const isNight = NIGHT_TIMES.has(t.char);
    const userLoc = findUserLocation(world);
    const userName = getUserName();

    const strip = TIME_ORDER.map(c => {
      const cls = ['gwp-time-seg'];
      if (NIGHT_TIMES.has(c)) cls.push('gwp-night');
      if (c === t.char) cls.push('gwp-now');
      return `<span class="${cls.join(' ')}">${c}</span>`;
    }).join('');

    worldEl.innerHTML = `
      <div class="gwp-time-row">
        <span class="gwp-daynight">${isNight ? '☾' : '☀'}</span>
        <span class="gwp-time-name">${escapeHtml(t.name)}</span>
        <span class="gwp-time-desc">${escapeHtml(t.desc)}</span>
      </div>
      <div class="gwp-time-strip">${strip}</div>
      <div class="gwp-userloc">${escapeHtml(userName)}所在 · <b>${escapeHtml(userLoc ?? '未知')}</b></div>
    `;

    fabTime.textContent = t.char;
    fabTime.style.display = t.char && t.char !== '—' ? 'block' : 'none';
  }

  // ---------------- 渲染：地图 ----------------

  /**
   * 昼夜氛围。生图模式：戌子丑切夜间图（图本身是夜景，不叠罩层）、
   * 酉时白天图叠暖橙；SVG 兜底模式：酉时暖橙、戌子丑靛蓝罩层 + 月亮
   */
  function renderVeil(world) {
    const t = parseShichen(world?.当前时段);
    if (mapMode === 'img') {
      imgNight = NIGHT_TIMES.has(t.char);
      const src = imgNight ? nightImgUrl : dayImgUrl;
      if (mapImg.getAttribute('src') !== src) mapImg.setAttribute('src', src);
      if (t.char === '酉') {
        mapVeil.style.display = 'block';
        mapVeil.style.background = 'rgba(206,120,50,.16)';
        mapVeil.innerHTML = '';
      } else {
        mapVeil.style.display = 'none';
        mapVeil.innerHTML = '';
      }
      return;
    }
    if (NIGHT_TIMES.has(t.char)) {
      mapVeil.style.display = 'block';
      mapVeil.style.background = 'rgba(16,24,48,.34)';
      mapVeil.innerHTML = '<span class="gwp-veil-moon">☾</span>';
    } else if (t.char === '酉') {
      mapVeil.style.display = 'block';
      mapVeil.style.background = 'rgba(206,120,50,.16)';
      mapVeil.innerHTML = '';
    } else {
      mapVeil.style.display = 'none';
      mapVeil.innerHTML = '';
    }
  }

  /** 地图标记三档样式：像素小人 → 立牌(立绘) → 带框名牌，循环切换 */
  const MARKER_MODES = [
    { label: '像素', src: n => NPC_ICONS[n],     cls: 'gwp-marker-avatar gwp-marker-icon gwp-marker-body' },
    { label: '立牌', src: n => NPC_PORTRAITS[n], cls: 'gwp-marker-stand' },
    { label: '名牌', src: n => NPC_CARD_ICONS[n], cls: 'gwp-marker-avatar gwp-marker-icon' },
  ];
  let markerMode = 0;

  function setMarkerMode(i) {
    markerMode = ((i % MARKER_MODES.length) + MARKER_MODES.length) % MARKER_MODES.length;
    markerModeBtn.textContent = MARKER_MODES[markerMode].label;
    if (lastStat) renderMap(lastStat);
  }
  markerModeBtn.addEventListener('click', () => setMarkerMode(markerMode + 1));

  /** x/y 均为相对地图帧的百分比 */
  function markerHtml(name, npc, x, y) {
    const m = MARKER_MODES[markerMode];
    const url = safeUrl(m.src(name));
    const avatar = url
      ? `<div class="${m.cls}" style="background-image:url(&quot;${url}&quot;)"></div>`
      : `<div class="gwp-marker-avatar">${escapeHtml(String(name).charAt(0))}</div>`;
    const loc = npc?.位置 ?? '—';
    const act = npc?.当前行为 ?? npc?.状态 ?? '—';
    return `
      <div class="gwp-marker" data-name="${escapeHtml(name)}" data-loc="${escapeHtml(loc)}" data-act="${escapeHtml(act)}"
           style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
        ${avatar}
        <div class="gwp-marker-name">${escapeHtml(name)}</div>
      </div>`;
  }

  function renderMap(stat) {
    const npcObj = stat?.NPC ?? {};
    const names = Object.keys(npcObj);
    const anchors = activeAnchors();
    const unknownXy = activeUnknown();

    // 按锚点分组（同点聚簇用）
    const groups = new Map();
    for (const name of names) {
      const r = resolveAnchor(npcObj[name]?.位置, anchors);
      const key = r ? r.key : '__unknown__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ name, r });
    }

    let html = '';
    for (const list of groups.values()) {
      list.forEach(({ name, r }, i) => {
        const base = r ? r.xy : unknownXy;
        const [sx, sy] = r ? subOffset(r.sub) : [0, 0];
        // 黄金角螺旋，同锚点多人散开（偏移量按 800x600 比例换算成百分比）
        const ang = i * 2.39996;
        const rad = i === 0 ? 0 : 13 + (i % 3) * 5;
        const x = base[0] + sx / 8 + (Math.cos(ang) * rad) / 8;
        const y = base[1] + sy / 6 + (Math.sin(ang) * rad) / 6;
        html += markerHtml(name, npcObj[name], x, y);
      });
    }

    // 图片模式下，有人落入收容点时给出「行踪不明」角落标签（SVG 底图自带虚线框）
    if (mapMode === 'img' && groups.has('__unknown__')) {
      html += `<div class="gwp-unknowntag" style="left:${unknownXy[0]}%;top:${unknownXy[1] - 5}%">行踪不明</div>`;
    }

    // {{user}} 印章标记（默认养心殿；偏向右下避免遮挡建筑）
    const userLoc = findUserLocation(stat?.世界);
    const userName = getUserName();
    const sealChar = userName.charAt(0) || '主';
    const ur = resolveAnchor(userLoc, anchors) ?? { key: '养心殿', xy: anchors['养心殿'], sub: '' };
    const ux = ur.xy[0] + 34 / 8;
    const uy = ur.xy[1] + 26 / 6;
    html += `
      <div class="gwp-marker gwp-marker-user" data-loc="${escapeHtml(userLoc ?? '养心殿')}" data-act="${escapeHtml(userName)}所在"
           style="left:${ux.toFixed(2)}%;top:${uy.toFixed(2)}%">
        <div class="gwp-marker-seal">${escapeHtml(sealChar)}</div>
        <div class="gwp-marker-name">${escapeHtml(userName)}</div>
      </div>`;

    markersEl.innerHTML = html;
  }

  // 地图悬浮提示
  mapFrame.addEventListener('mouseover', event => {
    const m = event.target.closest('.gwp-marker');
    if (!m) return;
    const name = m.dataset.name;
    mapTip.innerHTML = name
      ? `<b>${escapeHtml(name)}</b><br>${escapeHtml(m.dataset.loc)} · ${escapeHtml(m.dataset.act)}`
      : `<b>${escapeHtml(getUserName())}</b><br>${escapeHtml(m.dataset.loc)}`;
    mapTip.style.display = 'block';
    const frameRect = mapFrame.getBoundingClientRect();
    const mRect = m.getBoundingClientRect();
    let left = mRect.left - frameRect.left + mRect.width / 2 + 10;
    let top = mRect.top - frameRect.top - 6;
    mapTip.style.left = '0px';
    mapTip.style.top = '0px';
    const tipRect = mapTip.getBoundingClientRect();
    if (left + tipRect.width > frameRect.width - 6) left = mRect.left - frameRect.left - tipRect.width - 10;
    if (mRect.top - frameRect.top < tipRect.height + 10) top = mRect.top - frameRect.top + mRect.height + 16;
    mapTip.style.left = `${Math.max(4, left) + mapFrame.scrollLeft}px`;
    mapTip.style.top = `${Math.max(4, top) + mapFrame.scrollTop}px`;
  });
  mapFrame.addEventListener('mouseout', event => {
    if (event.target.closest('.gwp-marker')) mapTip.style.display = 'none';
  });
  mapFrame.addEventListener('click', event => {
    const m = event.target.closest('.gwp-marker[data-name]');
    if (m) jumpToNpc(m.dataset.name);
  });

  // ---------------- 渲染：名帖（NPC 列表） ----------------

  function renderRelations(relations) {
    const entries = Object.entries(relations ?? {});
    if (!entries.length) {
      return '<div class="gwp-rel-none">暂无深交之人</div>';
    }
    return entries
      .sort((a, b) => Math.abs(clampFav(b[1]?.好感度)) - Math.abs(clampFav(a[1]?.好感度)))
      .map(([target, rel]) => {
        const fav = clampFav(rel?.好感度);
        const dir = fav >= 0 ? 'pos' : 'neg';
        const width = Math.abs(fav) / 2; // 半轴 50% = 100 点
        const sign = fav > 0 ? `+${fav}` : `${fav}`;
        return `
          <div class="gwp-rel">
            <div class="gwp-rel-top">
              <span class="gwp-rel-name">${escapeHtml(target)}</span>
              <span class="gwp-rel-fav gwp-${dir}">${sign}</span>
            </div>
            <div class="gwp-favbar">
              <div class="gwp-fav-fill gwp-${dir}" style="width:${width}%"></div>
            </div>
            <div class="gwp-rel-note">${escapeHtml(rel?.关系理解 ?? '')}</div>
          </div>
        `;
      })
      .join('');
  }

  function renderNpcs(npcObj) {
    const names = Object.keys(npcObj ?? {});
    if (!names.length) {
      npcsEl.innerHTML = '<div class="gwp-empty">尚无人物行迹</div>';
      return;
    }
    npcsEl.innerHTML = names
      .map(name => {
        const npc = npcObj[name] ?? {};
        const loc = npc.位置 ?? '—';
        const act = npc.当前行为 ?? npc.状态 ?? '—'; // 白露用「状态」字段
        const role = NPC_ROLES[name] || '';
        const url = safeUrl(NPC_PORTRAITS[name]);
        const avatar = url
          ? `<div class="gwp-avatar" style="background-image:url(&quot;${url}&quot;)"></div>`
          : `<div class="gwp-avatar">${escapeHtml(String(name).charAt(0))}</div>`;
        const isOpen = expanded.has(name);
        return `
          <div class="gwp-npc ${isOpen ? 'gwp-expanded' : ''}" data-name="${escapeHtml(name)}">
            <div class="gwp-npc-head">
              ${avatar}
              <div class="gwp-npc-info">
                <div class="gwp-npc-name">${escapeHtml(name)}</div>
                ${role ? `<div class="gwp-npc-role">${escapeHtml(role)}</div>` : ''}
                <div class="gwp-npc-meta">${escapeHtml(loc)}<span class="gwp-dot">◆</span>${escapeHtml(act)}</div>
              </div>
              <span class="gwp-caret">▶</span>
            </div>
            <div class="gwp-relations">${renderRelations(npc.人际关系)}</div>
          </div>
        `;
      })
      .join('');
  }

  // ---------------- 渲染：立绘页（画廊，静态，init 渲染一次） ----------------

  const GALLERY_ORDER = ['宋玉轩', '宋婉清', '柳如是', '燕红', '白露', '绿绮', '春桃', '苏墨', '赵灵均', '阿若', '阮宜', '叶长宁'];

  function renderGallery() {
    galleryEl.innerHTML = GALLERY_ORDER.map(name => {
      const url = safeUrl(NPC_PORTRAITS[name]);
      const img = url
        ? `<img class="gwp-gallery-img" src="${url}" alt="${escapeHtml(name)}">`
        : `<div class="gwp-gallery-img gwp-gallery-seal">${escapeHtml(String(name).charAt(0))}</div>`;
      return `
        <div class="gwp-gallery-item" data-name="${escapeHtml(name)}" data-url="${url || ''}">
          ${img}
          <div class="gwp-gallery-name">${escapeHtml(name)}</div>
        </div>
      `;
    }).join('');
  }

  galleryEl.addEventListener('click', event => {
    const item = event.target.closest('.gwp-gallery-item');
    if (!item) return;
    const url = item.dataset.url;
    if (!url) return;
    galleryViewImg.src = url;
    galleryView.style.display = 'flex';
    galleryEl.parentElement.scrollTop = 0;
  });
  galleryView.addEventListener('click', () => {
    galleryView.style.display = 'none';
    galleryViewImg.removeAttribute('src');
  });

  // ---------------- 刷新 ----------------

  function renderEmpty(message) {
    worldEl.innerHTML = '';
    npcsEl.innerHTML = `<div class="gwp-empty">${escapeHtml(message)}</div>`;
    markersEl.innerHTML = `<div class="gwp-map-empty">${escapeHtml(message)}</div>`;
    fabTime.style.display = 'none';
    mapVeil.style.display = 'none';
  }

  async function refresh() {
    encounterControls.refresh();
    const stat = await readStatData();
    if (!stat) {
      renderEmpty('尚未读取到变量数据（未开局、未到底层，或 MVU 插件未启用）\n可按 F12 在控制台查看 [锦瑟山庄] 日志');
      console.warn('[锦瑟山庄] 最近 8 层均未找到 stat_data/display_data');
      return;
    }
    if (!stat.NPC && !stat.世界) {
      renderEmpty('变量数据已读取，但结构与「锦瑟山庄」Schema 不符');
      return;
    }
    lastStat = stat;
    renderWorld(stat.世界);
    renderVeil(stat.世界);
    renderMap(stat);
    renderNpcs(stat.NPC);
  }

  let refreshTimer = null;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 250);
  }

  // ---------------- 交互 ----------------

  // 圆球：拖 = 移动，单击 = 开关面板
  initFabDrag(fab, () => {
    panel.classList.toggle('gwp-open');
    if (panel.classList.contains('gwp-open')) refresh().then(() => keepPanelOnScreen(panel));
  });
  panel.querySelector('.gwp-close').addEventListener('click', () => {
    panel.classList.remove('gwp-open');
  });
  panel.querySelector('.gwp-refresh').addEventListener('click', () => refresh());

  // 面板：标题栏拖拽 + 四边四角缩放
  initPanelMoveResize(panel, panel.querySelector('.gwp-header'));
  applyPanelLayout(panel, readLayout(GWP_PANEL_KEY));
  applyFabLayout(fab, readLayout(GWP_FAB_KEY));

  const keepFabVisible = () => keepFabOnScreen(fab);
  const fabWindow = gwpParentWindow();
  const fabViewport = fabWindow.visualViewport;
  fabWindow.addEventListener('resize', keepFabVisible);
  fabWindow.addEventListener('orientationchange', keepFabVisible);
  fabViewport?.addEventListener('resize', keepFabVisible);
  fabViewport?.addEventListener('scroll', keepFabVisible);


  // 窗口缩放时把面板拉回可视区
  try {
    gwpParentWindow().addEventListener('resize', () => {
      if (panel.classList.contains('gwp-open')) keepPanelOnScreen(panel);
    });
  } catch (e) { /* 忽略 */ }

  // 事件委托：展开/收起 NPC 人际关系
  npcsEl.addEventListener('click', event => {
    const head = event.target.closest('.gwp-npc-head');
    if (!head) return;
    const card = head.closest('.gwp-npc');
    const name = card?.dataset?.name;
    if (!name) return;
    if (expanded.has(name)) {
      expanded.delete(name);
      card.classList.remove('gwp-expanded');
    } else {
      expanded.add(name);
      card.classList.add('gwp-expanded');
    }
  });

  // ---------------- 事件监听 ----------------

  // MVU 变量更新 / 初始化
  for (const evt of ['mag_variable_update_ended', 'mag_variable_initialized']) {
    try {
      eventOn(evt, scheduleRefresh);
    } catch (e) { /* 忽略不支持的事件 */ }
  }
  // 楼层事件：重 Roll、收到新楼层、切换聊天
  const te = typeof tavern_events !== 'undefined' ? tavern_events : {};
  for (const evt of [te.MESSAGE_SWIPED, te.MESSAGE_RECEIVED, te.CHAT_CHANGED, te.GENERATION_ENDED]) {
    if (!evt) continue;
    try {
      eventOn(evt, scheduleRefresh);
    } catch (e) { /* 忽略不支持的事件 */ }
  }

  // 初始渲染
  renderGallery();
  setMarkerMode(0);
  refresh();

  // 脚本关闭时清理注入的元素
  $(window).on('pagehide', () => {
    encounterControls.destroy();
    fabWindow.removeEventListener('resize', keepFabVisible);
    fabWindow.removeEventListener('orientationchange', keepFabVisible);
    fabViewport?.removeEventListener('resize', keepFabVisible);
    fabViewport?.removeEventListener('scroll', keepFabVisible);

    clearTimeout(refreshTimer);
    parentDoc.getElementById('gwp-root')?.remove();
    parentDoc.getElementById('gwp-style')?.remove();
  });

  console.info(`[锦瑟山庄] 悬浮面板已注入（地图底图：${mapMode === 'img' ? '扩建昼夜底图' : '内置 SVG'}）`);
});
