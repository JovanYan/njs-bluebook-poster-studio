// stickers.ts — sticker asset loading (with procedural fallbacks),
// the placed-sticker model, transform math and hit-testing.

export interface StickerAsset {
  name: string
  source: CanvasImageSource
  /** width / height of the source */
  aspect: number
  /** false when the PNG was missing and a fallback was drawn */
  loaded: boolean
  /** tray group id (doodles / y2k / pixel / words) */
  group?: string
  /** preferred placement size (preview px width at scale 1) */
  baseSize?: number
}

export interface Sticker {
  id: string
  name: string
  source: CanvasImageSource
  aspect: number
  /** center position, preview poster coords (600x800 space) */
  x: number
  y: number
  scale: number
  /** radians */
  rotation: number
  /** width in preview px at scale 1 */
  baseSize: number
}

export const STICKER_FILES: string[] = [
  'bunny.png',
  'heart.png',
  'daisy.png',
  'eye.png',
  'sparkle.png',
  'smiley.png',
  'cherry.png',
  'butterfly.png',
  'lightning.png',
  'rainbow.png',
  'flower-smile.png',
  'tape-blue.png',
  'tape-pink.png',
  'njs-graffiti.png',
  'nameplate-blank.png',
  'flip-phone.png',
  'hype-boy.png',
  'pixel-globe.png',
  'crt-monitor.png',
  'pixel-cursor.png',
  'digicam.png',
  'pixel-sparkle4.png',
  'pixel-heart-outline.png',
  'pixel-planet.png',
  'pixel-moon.png',
]

export interface StickerGroup {
  id: string
  label: string
  files: string[]
}

/** Tray grouping for the 25 image stickers. hype-boy.png is a word-style
 *  image sticker, so it heads the WORDS group alongside the procedural ones. */
export const STICKER_GROUPS: StickerGroup[] = [
  {
    id: 'doodles',
    label: 'DOODLES',
    files: [
      'bunny.png',
      'heart.png',
      'daisy.png',
      'eye.png',
      'sparkle.png',
      'smiley.png',
      'cherry.png',
      'butterfly.png',
      'lightning.png',
      'rainbow.png',
      'flower-smile.png',
      'njs-graffiti.png',
      'tape-blue.png',
      'tape-pink.png',
      'nameplate-blank.png',
    ],
  },
  {
    id: 'y2k',
    label: 'Y2K DEVICES',
    files: ['flip-phone.png', 'crt-monitor.png', 'digicam.png', 'pixel-globe.png', 'pixel-cursor.png'],
  },
  {
    id: 'pixel',
    label: 'PIXEL BITS',
    files: ['pixel-sparkle4.png', 'pixel-heart-outline.png', 'pixel-planet.png', 'pixel-moon.png'],
  },
  { id: 'words', label: 'WORDS', files: ['hype-boy.png'] },
]

/** file name -> tray group id */
export const STICKER_GROUP_MAP: Record<string, string> = STICKER_GROUPS.reduce(
  (acc, g) => {
    for (const f of g.files) acc[f] = g.id
    return acc
  },
  {} as Record<string, string>,
)

const ACCENTS = ['#2B52D6', '#F2509E', '#1F9E5A', '#141414', '#FFE600']

let idCounter = 0
export function nextStickerId(): string {
  idCounter += 1
  return `st-${Date.now().toString(36)}-${idCounter}`
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`failed to load ${url}`))
    img.src = url
  })
}

/** Procedural placeholder so a missing PNG never breaks the app. */
export function makeFallbackSticker(name: string, accentSeed = 0): HTMLCanvasElement {
  const S = 160
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const accent = ACCENTS[accentSeed % ACCENTS.length]

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 4
  ctx.setLineDash([8, 6])
  ctx.strokeRect(4, 4, S - 8, S - 8)
  ctx.setLineDash([])

  // simple star doodle
  const cx = S / 2
  const cy = S / 2 - 14
  const R = 34
  const r = 15
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r
    const a = (Math.PI / 5) * i - Math.PI / 2
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = accent
  ctx.fill()
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 3
  ctx.stroke()

  const label = name.replace(/\.png$/, '').toUpperCase().slice(0, 12)
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#141414'
  ctx.fillText(label, cx, S - 34)
  return c
}

/** Load every tray sticker; missing files fall back to placeholders. */
export async function loadStickerAssets(): Promise<StickerAsset[]> {
  const base = import.meta.env.BASE_URL || '/'
  const jobs = STICKER_FILES.map(async (file, idx): Promise<StickerAsset> => {
    const name = file.replace(/\.png$/, '')
    const group = STICKER_GROUP_MAP[file] ?? 'doodles'
    try {
      const img = await loadImage(`${base}assets/stickers/${file}`)
      return {
        name,
        source: img,
        aspect: img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 1,
        loaded: true,
        group,
      }
    } catch {
      const c = makeFallbackSticker(file, idx)
      return { name, source: c, aspect: 1, loaded: false, group }
    }
  })
  return Promise.all(jobs)
}

/** Try the blank nameplate bitmap; null when missing. */
export async function loadNameplateBlank(): Promise<HTMLImageElement | null> {
  const base = import.meta.env.BASE_URL || '/'
  try {
    return await loadImage(`${base}assets/stickers/nameplate-blank.png`)
  } catch {
    return null
  }
}

/**
 * Chrome oval nameplate: bitmap when available, otherwise a procedural
 * metallic gradient oval with a specular band and dark rim. Name is
 * centered in bold white with a dark outline.
 */
export async function createNameplateSource(name: string): Promise<{ source: HTMLCanvasElement; aspect: number }> {
  const W = 480
  const H = 200
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return { source: c, aspect: W / H }

  const blank = await loadNameplateBlank()
  if (blank) {
    ctx.drawImage(blank, 0, 0, W, H)
  } else {
    const ex = W / 2
    const ey = H / 2
    const rx = W / 2 - 8
    const ry = H / 2 - 8

    // metallic horizontal gradient
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, '#7d828c')
    g.addColorStop(0.18, '#c9cfd9')
    g.addColorStop(0.38, '#f4f7fb')
    g.addColorStop(0.5, '#ffffff') // specular band
    g.addColorStop(0.62, '#dfe4ec')
    g.addColorStop(0.82, '#a9afba')
    g.addColorStop(1, '#6c717b')

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // specular highlight blob
    const sg = ctx.createRadialGradient(ex, ey - ry * 0.55, 4, ex, ey - ry * 0.55, rx * 0.8)
    sg.addColorStop(0, 'rgba(255,255,255,0.85)')
    sg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, W, H)

    // bottom shade for bevel
    const bg = ctx.createLinearGradient(0, H * 0.55, 0, H)
    bg.addColorStop(0, 'rgba(0,0,0,0)')
    bg.addColorStop(1, 'rgba(20,20,20,0.28)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // dark rim + inner bevel highlight
    ctx.beginPath()
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
    ctx.strokeStyle = '#2a2d33'
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(ex, ey, rx - 8, ry - 8, 0, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  const label = (name.trim() || 'YOUR NAME').toUpperCase().slice(0, 18)
  ctx.font = '900 52px "Arial Black", "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 9
  ctx.strokeText(label, W / 2, H / 2 + 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, W / 2, H / 2 + 2)

  return { source: c, aspect: W / H }
}

// ── transform / hit-test math ────────────────────────────────────────────────

export interface Size {
  w: number
  h: number
}

export function stickerSize(s: Sticker): Size {
  const w = s.baseSize * s.scale
  return { w, h: w / s.aspect }
}

/** Rotate a canvas-space point into sticker-local space. */
export function toLocal(s: Sticker, px: number, py: number): { x: number; y: number } {
  const dx = px - s.x
  const dy = py - s.y
  const cos = Math.cos(-s.rotation)
  const sin = Math.sin(-s.rotation)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

/** Sticker-local point -> canvas space. */
export function toCanvas(s: Sticker, lx: number, ly: number): { x: number; y: number } {
  const cos = Math.cos(s.rotation)
  const sin = Math.sin(s.rotation)
  return { x: s.x + lx * cos - ly * sin, y: s.y + lx * sin + ly * cos }
}

export function hitTest(s: Sticker, px: number, py: number): boolean {
  const { w, h } = stickerSize(s)
  const p = toLocal(s, px, py)
  return Math.abs(p.x) <= w / 2 && Math.abs(p.y) <= h / 2
}

export type HandleKind = 'scale' | 'rotate' | 'delete'

export const HANDLE_HIT_RADIUS = 14

/** Handle anchor positions in canvas space (preview coords). */
export function handlePositions(s: Sticker): Record<HandleKind, { x: number; y: number }> {
  const { w, h } = stickerSize(s)
  return {
    scale: toCanvas(s, w / 2, h / 2),
    rotate: toCanvas(s, 0, -h / 2 - 26),
    delete: toCanvas(s, w / 2 + 12, -h / 2 - 12),
  }
}

export function hitHandle(s: Sticker, px: number, py: number): HandleKind | null {
  const pos = handlePositions(s)
  const order: HandleKind[] = ['delete', 'rotate', 'scale']
  for (const kind of order) {
    const p = pos[kind]
    if (Math.hypot(px - p.x, py - p.y) <= HANDLE_HIT_RADIUS) return kind
  }
  return null
}

export function makeSticker(asset: StickerAsset, x: number, y: number, baseSize = 150): Sticker {
  const rot = ((Math.random() * 24 - 12) * Math.PI) / 180 // ±12°
  return {
    id: nextStickerId(),
    name: asset.name,
    source: asset.source,
    aspect: asset.aspect > 0 ? asset.aspect : 1,
    x,
    y,
    scale: 1,
    rotation: rot,
    baseSize,
  }
}
