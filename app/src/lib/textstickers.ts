// textstickers.ts — procedural Y2K text stickers (WORDS group).
// Rendered as crisp canvas bitmaps at runtime with web fonts, never AI images.
// Every sticker gets a die-cut look: thick white outline, transparent elsewhere.

import type { StickerAsset } from './stickers'

const INK = '#141414'
const BLUE = '#2B52D6'
const PINK = '#F2509E'
const GREEN = '#1F9E5A'
const YELLOW = '#FFE600'

let cache: StickerAsset[] | null = null

async function ensureFonts(): Promise<void> {
  const wanted = [
    '400 100px Bungee',
    '400 80px "Homemade Apple"',
    '100px "Press Start 2P"',
    '700 100px Caveat',
  ]
  try {
    await Promise.race([
      Promise.all(wanted.map((f) => document.fonts.load(f))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ])
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ])
  } catch {
    // fall back to whatever fonts are available
  }
}

/** Horizontal chrome gradient (silver with a bright specular band). */
function chromeGradient(ctx: CanvasRenderingContext2D, w: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, '#7d828c')
  g.addColorStop(0.2, '#c9cfd9')
  g.addColorStop(0.4, '#f4f7fb')
  g.addColorStop(0.5, '#ffffff')
  g.addColorStop(0.62, '#dfe4ec')
  g.addColorStop(0.84, '#a9afba')
  g.addColorStop(1, '#6c717b')
  return g
}

/** Vertical chrome gradient for script fills. */
function chromeGradientV(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.35, '#dfe4ec')
  g.addColorStop(0.6, '#a9afba')
  g.addColorStop(0.8, '#e8ecf2')
  g.addColorStop(1, '#7d828c')
  return g
}

interface TextLine {
  text: string
  font: string
  fill: string | CanvasGradient
  /** extra letter spacing in px (manual, for pixel/chunk fonts) */
  tracking?: number
}

interface RenderOpts {
  lines: TextLine[]
  padX: number
  padY: number
  lineGap: number
  /** thick white die-cut stroke width */
  dieCut: number
  /** optional dark outline drawn between die-cut and fill */
  outline?: { color: string; width: number }
  /** optional backing shape drawn before the text */
  backing?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  /** italic skew applied to the whole canvas content */
  skewX?: number
  /** drop-shade pass drawn behind each line (bubble letters) */
  shade?: { dx: number; dy: number; color: string }
}

function measureLines(ctx: CanvasRenderingContext2D, lines: TextLine[]): { widths: number[]; max: number } {
  const widths = lines.map((l) => {
    ctx.font = l.font
    const base = ctx.measureText(l.text).width
    return base + (l.tracking ?? 0) * Math.max(0, l.text.length - 1)
  })
  return { widths, max: Math.max(...widths, 1) }
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  line: TextLine,
  cx: number,
  y: number,
  mode: 'fill' | 'stroke',
): void {
  const tracking = line.tracking ?? 0
  ctx.font = line.font
  ctx.textBaseline = 'middle'
  if (tracking === 0) {
    ctx.textAlign = 'center'
    if (mode === 'fill') ctx.fillText(line.text, cx, y)
    else ctx.strokeText(line.text, cx, y)
    return
  }
  // manual tracking: draw char by char from the left edge
  ctx.textAlign = 'left'
  let total = 0
  for (const ch of line.text) total += ctx.measureText(ch).width
  total += tracking * (line.text.length - 1)
  let x = cx - total / 2
  for (const ch of line.text) {
    if (mode === 'fill') ctx.fillText(ch, x, y)
    else ctx.strokeText(ch, x, y)
    x += ctx.measureText(ch).width + tracking
  }
}

/** Rasterize one text sticker onto a transparent canvas. */
function renderTextSticker(opts: RenderOpts): HTMLCanvasElement {
  const probe = document.createElement('canvas').getContext('2d')
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  if (!probe || !ctx) return c

  // rough line height from the first line's font size
  const sizeOf = (font: string): number => {
    const m = /(\d+(?:\.\d+)?)px/.exec(font)
    return m ? Number(m[1]) : 60
  }
  const { max } = measureLines(probe, opts.lines)
  const lineHs = opts.lines.map((l) => sizeOf(l.font) * 1.25)
  const textH = lineHs.reduce((a, b) => a + b, 0) + opts.lineGap * (opts.lines.length - 1)

  const W = Math.ceil(max + opts.padX * 2 + opts.dieCut * 2)
  const H = Math.ceil(textH + opts.padY * 2 + opts.dieCut * 2)
  c.width = W
  c.height = H

  ctx.save()
  if (opts.skewX) {
    ctx.translate(W / 2, H / 2)
    ctx.transform(1, 0, opts.skewX, 1, 0, 0)
    ctx.translate(-W / 2, -H / 2)
  }

  if (opts.backing) {
    opts.backing(ctx, W, H)
  }

  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  let y = opts.dieCut + opts.padY
  opts.lines.forEach((line, i) => {
    const cy = y + lineHs[i] / 2
    const cx = W / 2

    // drop shade (bubble letters) — same silhouette, offset, dark color
    if (opts.shade) {
      ctx.save()
      ctx.translate(opts.shade.dx, opts.shade.dy)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = opts.dieCut
      drawTracked(ctx, line, cx, cy, 'stroke')
      ctx.fillStyle = opts.shade.color
      drawTracked(ctx, line, cx, cy, 'fill')
      ctx.restore()
    }

    // die-cut white outline
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = opts.dieCut
    drawTracked(ctx, line, cx, cy, 'stroke')

    // optional dark outline
    if (opts.outline) {
      ctx.strokeStyle = opts.outline.color
      ctx.lineWidth = opts.outline.width
      drawTracked(ctx, line, cx, cy, 'stroke')
    }

    // fill
    ctx.fillStyle = line.fill
    drawTracked(ctx, line, cx, cy, 'fill')

    y += lineHs[i] + opts.lineGap
  })

  ctx.restore()
  return c
}

/** Jagged torn-edge strip (washi tape look). */
function tornStripPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const j = Math.min(7, h * 0.16)
  ctx.beginPath()
  ctx.moveTo(x + j * 0.4, y + j)
  ctx.lineTo(x + w * 0.22, y + j * 0.2)
  ctx.lineTo(x + w * 0.47, y + j * 0.7)
  ctx.lineTo(x + w * 0.74, y + j * 0.1)
  ctx.lineTo(x + w - j * 0.5, y + j * 0.8)
  ctx.lineTo(x + w - j * 0.1, y + h * 0.42)
  ctx.lineTo(x + w - j * 0.7, y + h - j * 0.6)
  ctx.lineTo(x + w * 0.63, y + h - j * 0.15)
  ctx.lineTo(x + w * 0.36, y + h - j * 0.75)
  ctx.lineTo(x + j * 0.6, y + h - j * 0.3)
  ctx.lineTo(x, y + h * 0.52)
  ctx.closePath()
}

function stripBacking(color: string, border: string | null, tape: boolean) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    const inset = 10
    tornStripPath(ctx, inset, inset, w - inset * 2, h - inset * 2)
    ctx.fillStyle = color
    ctx.fill()
    if (tape) {
      // washi diagonal texture
      ctx.save()
      tornStripPath(ctx, inset, inset, w - inset * 2, h - inset * 2)
      ctx.clip()
      ctx.strokeStyle = 'rgba(43,82,214,0.10)'
      ctx.lineWidth = 5
      for (let x = -h; x < w + h; x += 16) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + h, h)
        ctx.stroke()
      }
      ctx.restore()
    }
    if (border) {
      tornStripPath(ctx, inset, inset, w - inset * 2, h - inset * 2)
      ctx.strokeStyle = border
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }
}

/** Build the whole WORDS set. Bitmaps are cached after the first call. */
export async function loadTextStickers(): Promise<StickerAsset[]> {
  if (cache) return cache
  await ensureFonts()

  const mk = (name: string, canvas: HTMLCanvasElement, baseSize: number): StickerAsset => ({
    name,
    source: canvas,
    aspect: canvas.width > 0 ? canvas.width / canvas.height : 2,
    loaded: true,
    group: 'words',
    baseSize,
  })

  const list: StickerAsset[] = []

  // 1. A T T E N T I O N — chunky chrome letters, black outline
  {
    const line: TextLine = { text: 'ATTENTION', font: '400 118px Bungee', fill: INK, tracking: 14 }
    const probe = document.createElement('canvas').getContext('2d')
    let fill: string | CanvasGradient = '#c9cfd9'
    if (probe) {
      const { max } = measureLines(probe, [line])
      fill = chromeGradient(probe, max)
    }
    line.fill = fill
    const c = renderTextSticker({
      lines: [line],
      padX: 26,
      padY: 18,
      lineGap: 8,
      dieCut: 22,
      outline: { color: INK, width: 5 },
    })
    list.push(mk('word-attention', c, 300))
  }

  // 2. you got me looking for attention — hot-pink hand script, two lines
  {
    const c = renderTextSticker({
      lines: [
        { text: 'you got me', font: '400 86px "Homemade Apple", cursive', fill: PINK },
        { text: 'looking for attention', font: '400 86px "Homemade Apple", cursive', fill: PINK },
      ],
      padX: 30,
      padY: 16,
      lineGap: 18,
      dieCut: 16,
    })
    list.push(mk('word-looking', c, 300))
  }

  // 3. not gonna be the one to get hurt — tiny pixel font on washi strip
  {
    const c = renderTextSticker({
      lines: [{ text: 'NOT GONNA BE THE ONE TO GET HURT', font: '26px "Press Start 2P"', fill: INK }],
      padX: 34,
      padY: 22,
      lineGap: 8,
      dieCut: 12,
      backing: stripBacking('#ffffff', INK, true),
    })
    list.push(mk('word-hurt', c, 320))
  }

  // 4. DON'T BE BLUE — white caps on cobalt strip, italic skew
  {
    const c = renderTextSticker({
      lines: [{ text: "DON'T BE BLUE", font: '400 96px Bungee', fill: '#ffffff' }],
      padX: 44,
      padY: 20,
      lineGap: 8,
      dieCut: 16,
      skewX: -0.14,
      backing: stripBacking(BLUE, INK, false),
    })
    list.push(mk('word-dontbeblue', c, 300))
  }

  // 5. NEWJEANS ARE NOT BLUE — white caps on black strip
  {
    const c = renderTextSticker({
      lines: [{ text: 'NEWJEANS ARE NOT BLUE', font: '400 84px Bungee', fill: '#ffffff' }],
      padX: 44,
      padY: 20,
      lineGap: 8,
      dieCut: 16,
      backing: stripBacking(INK, null, false),
    })
    list.push(mk('word-notblue', c, 320))
  }

  // 6. like you a little — chunky pink bubble letters + darker pink shade
  {
    const c = renderTextSticker({
      lines: [{ text: 'like you a little', font: '400 104px Bungee', fill: '#FF7EBE' }],
      padX: 26,
      padY: 18,
      lineGap: 8,
      dieCut: 20,
      shade: { dx: 7, dy: 8, color: '#D63D8A' },
    })
    list.push(mk('word-likeyou', c, 300))
  }

  // 7. chemical hype boy — chrome hand script
  {
    const line: TextLine = { text: 'chemical hype boy', font: '400 92px "Homemade Apple", cursive', fill: '#c9cfd9' }
    const probe = document.createElement('canvas').getContext('2d')
    if (probe) line.fill = chromeGradientV(probe, 0, 120)
    const c = renderTextSticker({
      lines: [line],
      padX: 30,
      padY: 18,
      lineGap: 8,
      dieCut: 16,
      outline: { color: 'rgba(20,20,20,0.55)', width: 2.5 },
    })
    list.push(mk('word-chemical', c, 300))
  }

  // 8. say it ditto — green pixel font on white strip
  {
    const c = renderTextSticker({
      lines: [{ text: 'SAY IT DITTO', font: '44px "Press Start 2P"', fill: GREEN }],
      padX: 36,
      padY: 24,
      lineGap: 8,
      dieCut: 14,
      backing: stripBacking('#ffffff', INK, true),
    })
    list.push(mk('word-ditto', c, 280))
  }

  // 9. OMG!! — chunky yellow letters, black outline
  {
    const c = renderTextSticker({
      lines: [{ text: 'OMG!!', font: '400 148px Bungee', fill: YELLOW }],
      padX: 26,
      padY: 16,
      lineGap: 8,
      dieCut: 24,
      outline: { color: INK, width: 7 },
    })
    list.push(mk('word-omg', c, 260))
  }

  cache = list
  return list
}
