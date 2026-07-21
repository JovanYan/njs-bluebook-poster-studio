# NJS Bluebook Poster Studio — 设计规则与运行基准

> **本文档是本项目的唯一事实来源（source of truth）。**
> 以后对本品的一切修改、素材增补、运行与发布，都必须以本文档为准；任何实现变更落地后，必须同步更新本文档对应条目，保持文档与代码一致。

- 项目根目录：`/Users/zhuofan/Documents/Kimi/Workspaces/NJS Bluebook/app`
- 素材目录：`app/public/assets/`（贴纸 `stickers/` + 示例人像 `sample/`）
- 预览地址：`http://localhost:7100/`（`npm run dev -- --port 7100`）
- 技术栈：React + TypeScript + Vite + Tailwind，纯前端 Canvas 本地处理，**无后端、无运行时 AI 接口**

---

## 1. 产品定义

NewJeans 2022 出道专辑 Bluebook 版风格的半调网屏拼贴海报生成器（粉丝向单页应用）。
用户上传/拍摄人像 → 实时变成蓝白丝网印刷风 3:4 竖版海报 → 拖拽贴纸与文字装饰 → 导出 1500×2000 PNG。

交互流程基准（一屏装完，参考复古拍照工具的单屏结构）：
**空状态拖放提示 → 上传/拍照/示例 → 拖动缩放取景 → 滑杆实时调节 → 贴纸装饰 → SAVE PNG / RETAKE**

---

## 2. 视觉设计规则（UI 本身也是 Bluebook 风）

### 2.1 色彩（严格限定，禁止引入新色系）

| 用途 | 色值 |
|---|---|
| 墨色 · Bluebook 蓝（默认） | `#2B52D6` |
| 墨色 · 粉 | `#F2509E` |
| 墨色 · 绿 | `#1F9E5A` |
| 墨色 · 黑 | `#141414` |
| 荧光笔撞色 · 黄 | `#FFE600` |
| 荧光笔撞色 · 粉 | `#FF5CA8` |
| 页面/海报底色 | 白 / 微暖白 `#FDFDF8` |
| UI 文字与描边 | 纯黑 `#141414` 系 |

**禁令**：禁止玻璃拟态、禁止紫蓝渐变背景、禁止圆角卡片套卡片、禁止弥散软阴影。扁平填充 + 硬边是唯一的视觉语言。

### 2.2 字体

| 场景 | 字体 | 规格 |
|---|---|---|
| UI 标签 / 按钮 / 状态栏 | Press Start 2P（Google Fonts） | 8–10px，全大写，宽字距 |
| 数值读数 | VT323 | 整数实时读数 |
| 标题花体 | Caveat 700（或 Homemade Apple） | 大号、钴蓝、整体 -2° 旋转，配 SVG 手绘下划线 |
| 文字贴纸 · 粗体 | Bungee | 镀铬渐变 / 泡泡字 / 色条白字 |

UI 文案全部为英文全大写（匹配 Bluebook  aesthetic）。禁止用纯拉丁展示字体渲染中文。

### 2.3 页面元素

- **背景**：白底 + CSS `radial-gradient` 蓝色半调点阵（向边缘渐稀），外加 2–3 个荧光笔涂抹斑点（黄/粉模糊椭圆，奇数角度旋转）
- **按钮**：白底、2px 黑边、0 圆角、硬阴影 `3px 3px 0 #141414`；按下位移 +3/+3 消影；主按钮（SAVE PNG）反色为蓝底白字
- **滑杆（PixelSlider）**：2px 黑色轨道、16px 方块像素拇指（黑壳白芯）、左侧像素字体标签、右侧 VT323 实时数值
- **墨色切换**：4 个 28px 色块，2px 黑边，选中态 3px 外描边
- **海报框**：2px 黑边 + `6px 6px 0` 硬阴影；周围手工摆放旋转装饰（纸胶带条、SVG 涂鸦星/波浪线）
- **状态栏**（顶部，录像机 OSD 风）：左侧 `● REC`/`STANDBY`（CSS steps 闪烁）、中央实时时钟 `HH:MM:SS`、右侧日期 `YYYY.MM.DD`
- **空状态**：海报框内 2px 黑色虚线投放区 + 像素字体指引 + SVG 大箭头涂鸦
- **贴纸缩略图**：44px 方块、2px 黑边、白底、hover 反蓝；分组标题为 8px 像素字体 + 2px 黑色下划线
- **TV 动效背景层**（`TvBackground.tsx`）：扁平矢量复古 CRT 电视机（`#141414` 机身、钴蓝点缀、双天线、旋钮、-2° 倾斜、左侧出血、6px 硬阴影），屏幕为 3:4 内嵌圆角矩形。层序：点阵底 → 荧光斑点 → TV（`z-index:-1`、`pointer-events:none`）→ 内容
  - 屏幕循环播放 `assets/tv/poster-1~3.png`（蓝调网点人像，4s/张），切台特效 = RGB 分离 + 扫描线撕裂带 + 静噪 burst（纯 CSS `steps()`，0.4s）
  - 每 10–14s（随机）切入白色兔子 logo 台标（钴蓝点阵底）0.8–1.2s 硬故障进出
  - 常驻扫描线 + CRT 内阴影曲面；海报加载失败自动退化为钴蓝点阵 + 兔子（绝不出现破图）
  - 响应式：<1024px 缩至 55% 透明度 0.35  tucked 右下；<768px 隐藏；`prefers-reduced-motion` 停掉全部动效显示静态海报

---

## 3. 海报引擎规则（核心，不得降级）

### 3.1 画幅与输出

- 画幅：**竖版 3:4**；预览约 600×800（CSS 缩放），**导出固定 1500×2000 PNG**，文件名 `njs-bluebook-poster.png`
- 导出与预览必须逐像素一致：同一条渲染管线，仅 `scaleMul` 不同

### 3.2 真实半调网点算法（禁止用滤镜贴图冒充）

1. 照片按 cover-fit 裁入 3:4 框，支持用户拖动平移 + 滚轮/双指缩放；**载入默认缩放 1.08×**（人脸更撑满画幅）
2. 在**旋转 45° 的网屏网格**上逐单元格采样平均亮度（从降采样 ImageData 读取，保证滑杆拖动实时流畅）
3. 亮度先过 CONTRAST 对比度曲线（默认 1.25），再过闪光调制度（见 3.3）
4. 网点半径：`r = cell/2 × √(1 − l') × inkGain`——**暗部点大、亮部点小**，INK 滑杆控制 inkGain 墨量
5. 白/暖白底上以当前墨色填充圆点；DOT 滑杆控制单元格尺寸（预览 3–14px，导出等比放大）
6. 重渲染经 requestAnimationFrame 防抖

### 3.3 闪光灯系统（位置 × 强度 × 范围，三调）

| 控制 | 范围 | 默认 | 作用 |
|---|---|---|---|
| 手柄（画布上黄色十字星 + 虚线圆，命中半径 28px） | 归一化 0–1 | 居中 0.5, 0.5 | 拖动改变光源位置，双击复位；FLASH=0 时隐藏，位置记忆 |
| FLASH（强度） | 0–100 | 35 | 光的深度：中心提亮 `0.55·f`、暗角 `0.35·f`、星芒亮度 |
| RANGE（范围） | 0–100 | 55 | 光的几何：光池半径 `0.25+0.7·range`（半对角线比），光晕半径 `0.32+0.7·range`；暗角起点 `min(0.95, radius×1.15)`；FLASH=0 时该滑杆置灰 |

两层实现，缺一不可：
1. **亮度场调制**（网点前）：以闪光位置为圆心 smoothstep 衰减，中心提亮、四角压暗——让人像"透"出来
2. **叠加层**（网点后、贴纸前）：径向白光晕 + 横竖十字星芒（ray 长度 1.6×半对角线，高 RANGE 时星芒细至 75%），`screen` 混合

### 3.4 贴纸层

- 贴纸是独立可变换对象（位置/缩放/旋转），渲染在闪光层之上，全部带入导出
- 手势：单指/鼠标拖动；双指缩放+旋转；角柄缩放、旋转柄、✕ 删除；选中态虚线像素包围盒；pointer capture
- 点击贴纸栏添加：落于画布中心，随机 ±12° 旋转；文字贴纸按 `baseSize` 落地更大
- 命中优先级：**闪光手柄 > 贴纸手柄 > 贴纸 > 照片平移**

### 3.5 贴纸分组与清单（25 图片贴纸 + 9 文字贴纸）

- **DOODLES**（15）：bunny, heart, daisy, eye, sparkle, smiley, cherry, butterfly, lightning, rainbow, flower-smile, tape-blue, tape-pink, njs-graffiti, nameplate-blank
- **Y2K DEVICES**（5）：flip-phone, crt-monitor, digicam, pixel-globe, pixel-cursor
- **PIXEL BITS**（4）：pixel-sparkle4, pixel-heart-outline, pixel-planet, pixel-moon
- **WORDS**（1 图片 + 9 程序化文字）：hype-boy（图片）；`A T T E N T I O N`（镀铬 Bungee 黑描边）、`you got me / looking for attention`（热粉手写两行）、`NOT GONNA BE THE ONE TO GET HURT`（像素小字纸胶带条）、`DON'T BE BLUE`（蓝条白字斜体）、`NEWJEANS ARE NOT BLUE`（黑条白字）、`like you a little`（粉泡泡字深粉投影）、`chemical hype boy`（镀铬手写）、`SAY IT DITTO`（绿像素字白条）、`OMG!!`（黄粗体黑描边）

**文字贴纸规则**：一律本地 Canvas + Google Fonts 程序化渲染（`document.fonts.load` 后栅格化、模块级缓存），**禁止用 AI 生成带文字的贴纸**（乱码风险）；模切白边 = 填充前以白色粗 `strokeText`（`lineJoin: round`）打底。

### 3.6 名牌生成器

输入英文名 → 以 `nameplate-blank.png`（AI 生成的镀铬椭圆底座）为底，中央绘制白色粗体描边名字 → 生成 chrome 名牌贴纸，走普通贴纸流程。底座缺失时程序化绘制镀铬椭圆（金属横向渐变 + 高光带 + 深色边缘）。

---

## 4. 素材规则

### 4.1 现有素材

- 25 张贴纸 PNG：1024×1024、RGBA、四角全透明（模切白边、透明底），位于 `app/public/assets/stickers/`
- 示例人像：`app/public/assets/sample/sample-portrait.png`（2:3，90s 胶片感棚拍）
- TV 背景海报：`app/public/assets/tv/poster-1~3.png`（2:3 蓝调粗网点人像，供 TV 屏幕轮播）

### 4.2 素材再生成

- 批量脚本：工作区根目录 `gen_all_v2.sh`（内含全部 26 条提示词与参考图 URL），输出直接落 `app/public/assets/`
- 生成工具：`image_generation` 插件脚本 `scripts/image_generation_tool.py`；透明底仅支持 1:1 / 3:2 / 2:3 @1K PNG
- 高还原贴纸（flip-phone、hype-boy）使用 `--reference-image` 引导；参考图需先 `image-to-url --image-path` 转公网 URL
- **验收标准**：每张必须有 alpha 通道且四角 alpha=0；带文字的贴纸不许 AI 生成（见 3.5）
- 任何贴纸加载失败时，应用必须有程序化占位图形兜底，**不许报错崩溃**；示例人像同理（`sample.ts` 有程序化人像兜底）

---

## 5. 交互与适配规则

- 桌面一屏装完：状态栏 → 3:4 画布 → 控制台（按钮 + 滑杆 + 贴纸栏）
- 移动端（<768px）：单列堆叠，无横向滚动；触摸拖动取景、双指缩放；贴纸全手势
- CAMERA：优先 `getUserMedia({video:{facingMode:'user'}})` 弹窗（快门 + RETAKE/USE）；失败回退 `<input type="file" accept="image/*" capture="user">`
- 支持整画布拖放图片文件；图片经 FileReader/createImageBitmap 本地加载
- 按钮状态机：无照片 = UPLOAD / CAMERA / SAMPLE；有照片 = SAVE PNG / RETAKE

## 6. 代码结构

```
app/src/
├── App.tsx                  # 状态中枢：settings（含 flash/flashRange/flashX/flashY）、贴纸组合
├── index.css                # 设计 token：点阵背景、按钮、滑杆、贴纸栏分组样式
├── lib/
│   ├── halftone.ts          # 网点引擎：亮度网格、对比度、flashModulation、drawFlashOverlay
│   ├── poster.ts            # 渲染管线编排 + 闪光手柄绘制/命中（FLASH_HANDLE_HIT_RADIUS=28）
│   ├── stickers.ts          # 贴纸模型、STICKER_FILES、分组、位图加载与兜底
│   ├── textstickers.ts      # WORDS 程序化文字贴纸
│   ├── sample.ts            # 示例人像加载 + 程序化兜底
│   └── constants.ts         # INK_SWATCHES 四色
└── components/
    ├── PosterCanvas.tsx     # 画布与全部手势（闪光手柄 > 贴纸 > 照片）
    ├── Controls.tsx         # 按钮状态机 + DOT/INK/CONTRAST/FLASH/RANGE 滑杆 + 墨色色块
    ├── StickerTray.tsx      # 分组贴纸栏
    ├── CameraModal.tsx      # 摄像头弹窗
    ├── TvBackground.tsx     # TV 动效背景层（海报轮播 + 兔子台标闪现）
    └── StatusBar.tsx        # OSD 状态栏
```

## 7. 运行与协作规则

1. **运行**：`cd app && npm run dev -- --port 7100`；构建验证 `npm run build` 必须零 TS 错误
2. **不留孤儿进程**：测试用临时服务器（非 7100 端口）用后必须 kill；为用户服务时启动的 7100 服务器需明确告知其在运行
3. **修改流程**：先查本文档 → 改代码 → `npm run build` 验证 → 同步更新本文档对应章节
4. **设计红线**：第 2 章色彩/字体禁令、第 3 章真实网点算法与闪光三层结构、文字贴纸本地渲染，均为不可降级项
5. 工作区曾被意外清空过一次（2026-07-18）：素材可用 `gen_all_v2.sh` 整体重建，代码即文档所述结构
6. **Git 备份**：私仓 `github.com/JovanYan/njs-bluebook-poster-studio`。本机 github.com:443（git 协议）不可达但 api.github.com 正常，推送用工作区根目录 `push_to_github.py`（Git Data API：blobs→tree→commit→ref，支持二进制）；每次重大变更后运行一次增量备份
7. Bash 审批在本机频繁超时：批量操作尽量合并为单条命令；关键脚本落盘保存以便复跑

---

*文档版本：v1.1 · 2026-07-21 · 覆盖功能：半调引擎、闪光三调系统、25+9 贴纸、名牌生成器、四组贴纸栏、TV 动效背景、移动端适配、GitHub API 备份*
