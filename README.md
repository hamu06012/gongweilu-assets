# 锦瑟山庄卡面及 MVU 面板

2026-11-25：接入 12 张人物海报，修复重复玩家位置字段和地图无法拖动。

| 修改前 | 修改后 | 原因 |
| --- | --- | --- |
| 12 人使用旧版卡面 | `releases/2026-11-25/portrait-*.webp` 保留完整新海报 | 对齐本次提供的角色卡面 |
| Schema 固定声明宏字面量位置字段，实际用户名位置可同时存在 | 初始化、更新规则和 Schema 使用 `世界.玩家位置`；界面继续显示当前用户名 | 变量键不再依赖脚本是否展开酒馆宏 |
| 面板读取第一个以“位置”结尾的字段 | 优先规范字段，旧版优先当前用户名字段，其次宏字面量字段 | 防止字段插入顺序改变地图位置 |
| 旧聊天保留重复字段 | 载入时迁移最新有效楼层，保留其他状态 | 无需重新开局 |
| 地图仅有缩放按钮，后声明的 CSS 隐藏滚动区域 | 地图视口支持鼠标、触屏拖动和滚动 | 放大后可查看地图各处 |

新增：`src/player-location.js` 的迁移逻辑、地图拖动处理、角色卡构建工具和回归测试。
删除：迁移后多余的玩家位置别名、过期的 MVU 展示缓存。没有删除角色设定。

`src/panel.js` 和 `src/schema.js` 是可直接放进酒馆助手脚本库的独立脚本。
`src/player-location.js` 在两份脚本的标记区中内嵌，测试会检查内容一致。

构建导入用 PNG（V2/V3 元数据同步更新，保留原 PNG 图像字节）：

```powershell
python tools/build_card.py 原角色卡.png deliverables/修正版.png
```

新版海报已上传，远程版固定使用发布提交 4a35bec。也可使用内嵌卡面版本：

```powershell
python tools/build_card.py 原角色卡.png deliverables/离线卡面修正版.png --embed-portraits
```

离线卡面版的地图及原像素小人仍沿用原卡已有地址；本次新增的 12 张海报内嵌在卡中。

检查：

```powershell
python -m unittest discover -s tests -p test_*.py -v
node tests/schema.test.cjs
node --check src/panel.js
```

Python UI 检查需要 Playwright 和 Chromium；Node 检查需要 Zod 4 和 Lodash 4。
如依赖装在单独目录，将 `TEST_NODE_MODULES` 设为对应的 `node_modules` 路径。
角色卡打包检查使用仓库上一级的本地原始 PNG，不将完整角色卡发布到图片仓库。
