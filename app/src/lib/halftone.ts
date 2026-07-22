// halftone.ts — pure halftone / duotone screen-print math.
// Classic offset-print simulation: a rotated screen grid (45°) of round dots.
// Dark image areas -> big dots, bright areas -> tiny / no dots.

export interface HalftoneSettings {
  /** screen cell size in px, at the current render scale */
  cell: number
  /** ink gain: dot radius multiplier (the INK slider) */
  inkGain: number
  /** contrast curve strength k */
  contrast: number
  /** dot fill color */
  inkColor: string
  /** screen angle in degrees (classic 45) */
  screenAngleDeg: number
  /** paper ground color */
  background: string
  /** camera-flash intensity 0..100 (the FLASH slider) */
  flash: number
  /** flash spatial extent 0..100 (the RANGE slider) */
  flashRange: number
  /** flash center, normalized 0..1 frame coordinates (draggable) */
  flashX: number
  flashY: number
}

export const DEFAULT_HALFTONE: HalftoneSettings = {
  cell: 7,
  inkGain: 1.0,
  contrast: 1.25,
  inkColor: '#2B52D6',
  screenAngleDeg: 45,
  background: '#FDFDF8',
  flash: 35,
  flashRange: 55,
  flashX: 0.5,
  flashY: 0.5,
}

/** Linear contrast curve around mid-gray: l' = clamp((l - 0.5) * k + 0.5) */
export function applyContrast(l: number, k: number): number {
  const v = (l - 0.5) * k + 0.5
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Dot radius for a given post-curve luminance. */
export function dotRadius(luma: number, cell: number, inkGain: number): number {
  const r = (cell / 2) * Math.sqrt(Math.max(0, 1 - luma)) * inkGain
  return Math.min(r, cell * 0.72)
}

/**
 * Camera-flash luminance modulation around a draggable flash center (fx, fy).
 * A flash-lit photo is brighter near the flash with natural falloff, and the
 * far edges fall into a gentle vignette.
 *   d      = normalized distance from the flash point (0 .. ~1)
 *   radius = light-pool size from RANGE: tight 25% spot .. 95% frame flood
 *   falloff= smooth flash pool, ~1 at the flash point, 0 at the pool edge
 *   vig    = smoothstep edge darkening; starts near the pool edge for small
 *            ranges and is pushed to the corners for large ranges
 * Returns a signed luminance delta applied AFTER the contrast curve.
 * Intensity (flash01) scales the depth; RANGE scales only the geometry.
 */
export function flashModulation(
  nx: number,
  ny: number,
  flash01: number,
  fx: number,
  fy: number,
  range01: number,
): number {
  if (flash01 <= 0) return 0
  const dx = nx - fx
  const dy = ny - fy
  // normalize by the frame half-diagonal so falloff size is position-independent
  const d = Math.hypot(dx, dy) / Math.hypot(0.5, 0.5)
  const radius = 0.25 + 0.7 * range01
  const r = Math.min(1, d / radius)
  const falloff = 1 - r * r * (3 - 2 * r) // smoothstep-down pool of light
  const vigStart = Math.min(0.95, radius * 1.15)
  const vt = Math.min(1, Math.max(0, (d - vigStart) / (1.35 - vigStart)))
  const vig = vt * vt * (3 - 2 * vt)
  return flash01 * (0.55 * falloff - 0.35 * vig)
}

export interface LuminanceSampler {
  width: number
  height: number
  /** sample normalized coords (0..1, 0..1), returns luminance 0..1 */
  sample(nx: number, ny: number): number
}

/**
 * Downscale a drawn source into a small ImageData and expose fast
 * nearest-pixel luminance lookups in normalized coordinates.
 */
export function buildLuminanceSampler(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxDim = 320,
): LuminanceSampler {
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2d context unavailable')
  ctx.drawImage(source, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  return {
    width: w,
    height: h,
    sample(nx: number, ny: number): number {
      const x = Math.min(w - 1, Math.max(0, Math.round(nx * (w - 1))))
      const y = Math.min(h - 1, Math.max(0, Math.round(ny * (h - 1))))
      const i = (y * w + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    },
  }
}

/**
 * Render the halftone: paper ground + rotated screen of ink dots.
 * All dots are accumulated into a single path and filled once for speed.
 */
export function renderHalftone(
  ctx: CanvasRenderingContext2D,
  sampler: LuminanceSampler,
  W: number,
  H: number,
  s: HalftoneSettings,
): void {
  ctx.fillStyle = s.background
  ctx.fillRect(0, 0, W, H)

  const cell = s.cell
  const ang = (s.screenAngleDeg * Math.PI) / 180
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  const cx = W / 2
  const cy = H / 2
  // Rotated grid must cover the frame corners: use the half-diagonal.
  const ext = Math.hypot(W, H) / 2 + cell
  const n = Math.ceil(ext / cell)

  const flash01 = Math.min(1, Math.max(0, s.flash / 100))
  const range01 = Math.min(1, Math.max(0, s.flashRange / 100))
  ctx.beginPath()
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const ux = (i + 0.5) * cell
      const uy = (j + 0.5) * cell
      const x = cx + ux * cos - uy * sin
      const y = cy + ux * sin + uy * cos
      if (x < -cell || x > W + cell || y < -cell || y > H + cell) continue
      let l = applyContrast(sampler.sample(x / W, y / H), s.contrast)
      l += flashModulation(x / W, y / H, flash01, s.flashX, s.flashY, range01)
      l = l < 0 ? 0 : l > 1 ? 1 : l
      const r = dotRadius(l, cell, s.inkGain)
      // cutoff is proportional to the cell so preview and export (2.5x)
      // drop the SAME relative dots — a fixed px cutoff would ink more at export
      if (r < cell * 0.05) continue
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = s.inkColor
  ctx.fill()
}

/**
 * Flash overlay drawn ON TOP of the finished halftone so even the inked
 * dots catch the light: a soft radial white glow in `screen` mode plus a
 * 4-point starburst (thin horizontal + vertical light rays) centered on the
 * draggable flash point (fx, fy). Scales with the render size, so preview
 * and 1500x2000 export match.
 */
export function drawFlashOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  flash: number,
  fx: number,
  fy: number,
  range: number,
): void {
  const f = Math.min(1, Math.max(0, flash / 100))
  if (f <= 0) return
  const rg = Math.min(1, Math.max(0, range / 100))
  const cx = fx * W
  const cy = fy * H
  const halfDiag = Math.hypot(W, H) / 2

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  // soft radial glow — radius follows RANGE: tight bright core -> wide soft wash
  const glowR = halfDiag * (0.32 + 0.7 * rg)
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
  glow.addColorStop(0, `rgba(255,255,255,${0.6 * f})`)
  glow.addColorStop(0.45, `rgba(255,255,255,${0.28 * f})`)
  glow.addColorStop(0.86, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // 4-point starburst: two thin rays (horizontal + vertical) through (cx, cy);
  // always long enough to reach the corners, thinning slightly at high RANGE
  const rayLen = halfDiag * 1.6
  const rayThick = Math.max(2, W * 0.004) * (0.6 + f) * (1 - 0.25 * rg)
  for (const angle of [0, Math.PI / 2]) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    const ray = ctx.createLinearGradient(-rayLen, 0, rayLen, 0)
    ray.addColorStop(0, 'rgba(255,255,255,0)')
    ray.addColorStop(0.5, `rgba(255,255,255,${0.5 * f})`)
    ray.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = ray
    ctx.fillRect(-rayLen, -rayThick / 2, rayLen * 2, rayThick)
    // bright core of the ray
    const core = ctx.createLinearGradient(-rayLen * 0.4, 0, rayLen * 0.4, 0)
    core.addColorStop(0, 'rgba(255,255,255,0)')
    core.addColorStop(0.5, `rgba(255,255,255,${0.65 * f})`)
    core.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = core
    ctx.fillRect(-rayLen * 0.4, -rayThick / 6, rayLen * 0.8, rayThick / 3)
    ctx.restore()
  }

  ctx.restore()
}
