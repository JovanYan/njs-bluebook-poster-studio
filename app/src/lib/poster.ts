// poster.ts — the full poster pipeline shared by preview and export.
// Preview renders at 600x800; export re-runs the IDENTICAL pipeline at
// 1500x2000 (EXPORT_SCALE = 2.5), so the PNG matches the preview exactly.

import {
  HalftoneSettings,
  LuminanceSampler,
  buildLuminanceSampler,
  drawFlashOverlay,
  renderHalftone,
} from './halftone'
import { Sticker, handlePositions, stickerSize } from './stickers'

export const POSTER_W = 600
export const POSTER_H = 800
export const EXPORT_W = 1500
export const EXPORT_H = 2000
export const EXPORT_SCALE = EXPORT_W / POSTER_W

export interface PhotoTransform {
  /** pan offset in preview px */
  x: number
  y: number
  /** user zoom multiplier on top of cover-fit */
  scale: number
}

export interface PhotoState {
  /** unique id per loaded photo, used for sampler caching */
  id: string
  image: CanvasImageSource
  imgW: number
  imgH: number
  t: PhotoTransform
}

/** Cover-fit scale for the photo inside the W x H frame. */
export function coverScale(photo: PhotoState, W = POSTER_W, H = POSTER_H): number {
  return Math.max(W / photo.imgW, H / photo.imgH)
}

/** Clamp panning so the photo always covers the whole frame. */
export function clampTransform(photo: PhotoState): PhotoTransform {
  const cover = coverScale(photo) * photo.t.scale
  const dw = photo.imgW * cover
  const dh = photo.imgH * cover
  const maxX = Math.max(0, (dw - POSTER_W) / 2)
  const maxY = Math.max(0, (dh - POSTER_H) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, photo.t.x)),
    y: Math.min(maxY, Math.max(-maxY, photo.t.y)),
    scale: photo.t.scale,
  }
}

/** Draw the framed photo (cover-fit + pan/zoom) into ctx at the given scale. */
export function drawFramedPhoto(
  ctx: CanvasRenderingContext2D,
  photo: PhotoState,
  scaleMul: number,
): void {
  const W = POSTER_W * scaleMul
  const H = POSTER_H * scaleMul
  const cover = coverScale(photo) * photo.t.scale
  const dw = photo.imgW * cover
  const dh = photo.imgH * cover
  const dx = (W - dw) / 2 + photo.t.x * scaleMul
  const dy = (H - dh) / 2 + photo.t.y * scaleMul
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(photo.image, dx, dy, dw, dh)
}

/** Render one sticker at the given render scale (preview coords * scaleMul). */
export function drawSticker(
  ctx: CanvasRenderingContext2D,
  s: Sticker,
  scaleMul: number,
): void {
  const { w, h } = stickerSize(s)
  ctx.save()
  ctx.translate(s.x * scaleMul, s.y * scaleMul)
  ctx.rotate(s.rotation)
  ctx.drawImage(s.source, (-w / 2) * scaleMul, (-h / 2) * scaleMul, w * scaleMul, h * scaleMul)
  ctx.restore()
}

/** Pixel-style dashed selection box + handles (preview only). */
export function drawStickerUI(ctx: CanvasRenderingContext2D, s: Sticker): void {
  const { w, h } = stickerSize(s)
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.rotation)
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  ctx.setLineDash([])
  ctx.restore()

  const pos = handlePositions(s)

  // rotate handle: line + circle above top-center
  ctx.save()
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  const topEdge = rotatePoint(s, 0, -h / 2)
  ctx.moveTo(topEdge.x, topEdge.y)
  ctx.lineTo(pos.rotate.x, pos.rotate.y)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(pos.rotate.x, pos.rotate.y, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // tiny circular arrow
  ctx.beginPath()
  ctx.arc(pos.rotate.x, pos.rotate.y, 3.4, -Math.PI * 0.9, Math.PI * 0.35)
  ctx.stroke()

  // scale handle: solid square at bottom-right
  ctx.fillStyle = '#2B52D6'
  ctx.strokeStyle = '#141414'
  ctx.fillRect(pos.scale.x - 6, pos.scale.y - 6, 12, 12)
  ctx.strokeRect(pos.scale.x - 6, pos.scale.y - 6, 12, 12)

  // delete badge: black circle with white X
  ctx.beginPath()
  ctx.arc(pos.delete.x, pos.delete.y, 9, 0, Math.PI * 2)
  ctx.fillStyle = '#141414'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pos.delete.x - 3.5, pos.delete.y - 3.5)
  ctx.lineTo(pos.delete.x + 3.5, pos.delete.y + 3.5)
  ctx.moveTo(pos.delete.x + 3.5, pos.delete.y - 3.5)
  ctx.lineTo(pos.delete.x - 3.5, pos.delete.y + 3.5)
  ctx.stroke()
  ctx.restore()
}

function rotatePoint(s: Sticker, lx: number, ly: number): { x: number; y: number } {
  const cos = Math.cos(s.rotation)
  const sin = Math.sin(s.rotation)
  return { x: s.x + lx * cos - ly * sin, y: s.y + lx * sin + ly * cos }
}

/** Hit radius (preview px) for the draggable flash handle — generous for touch. */
export const FLASH_HANDLE_HIT_RADIUS = 28

/** Flash center in preview poster coords. */
export function flashHandlePosition(fx: number, fy: number): { x: number; y: number } {
  return { x: fx * POSTER_W, y: fy * POSTER_H }
}

/**
 * Pixel-style flash handle (preview only, never exported):
 * a yellow 4-point sparkle marker with a dashed circle around it.
 */
export function drawFlashHandle(ctx: CanvasRenderingContext2D, fx: number, fy: number): void {
  const { x, y } = flashHandlePosition(fx, fy)
  ctx.save()

  // dashed circle
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(x, y, 18, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 4-point sparkle
  const R = 11
  const r = 3
  ctx.beginPath()
  ctx.moveTo(x, y - R)
  ctx.quadraticCurveTo(x + r, y - r, x + R, y)
  ctx.quadraticCurveTo(x + r, y + r, x, y + R)
  ctx.quadraticCurveTo(x - r, y + r, x - R, y)
  ctx.quadraticCurveTo(x - r, y - r, x, y - R)
  ctx.closePath()
  ctx.fillStyle = '#FFE600'
  ctx.fill()
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

export interface RenderOptions {
  scaleMul: number
  /** draw selection UI (preview only) */
  selectedId?: string | null
  /** draw the draggable flash handle (preview only) */
  showFlashHandle?: boolean
  sampler?: LuminanceSampler | null
}

/**
 * Full poster render. When `sampler` is not provided it is built on the fly
 * (used by export; the preview caches it for slider-drag performance).
 */
export function renderPoster(
  ctx: CanvasRenderingContext2D,
  photo: PhotoState | null,
  settings: HalftoneSettings,
  stickers: Sticker[],
  opts: RenderOptions,
): void {
  const m = opts.scaleMul
  const W = POSTER_W * m
  const H = POSTER_H * m

  if (photo) {
    let sampler = opts.sampler ?? null
    if (!sampler) {
      const off = document.createElement('canvas')
      off.width = W
      off.height = H
      const octx = off.getContext('2d')
      if (!octx) return
      drawFramedPhoto(octx, photo, m)
      sampler = buildLuminanceSampler(off, W, H)
    }
    renderHalftone(ctx, sampler, W, H, { ...settings, cell: settings.cell * m })
    // flash glow + starburst sit above the ink but below the stickers,
    // and are part of the render so the export matches the preview
    drawFlashOverlay(ctx, W, H, settings.flash, settings.flashX, settings.flashY, settings.flashRange)
  } else {
    ctx.fillStyle = settings.background
    ctx.fillRect(0, 0, W, H)
  }

  for (const s of stickers) {
    drawSticker(ctx, s, m)
  }

  if (opts.selectedId && m === 1) {
    const sel = stickers.find((s) => s.id === opts.selectedId)
    if (sel) drawStickerUI(ctx, sel)
  }

  if (opts.showFlashHandle && m === 1 && settings.flash > 0) {
    drawFlashHandle(ctx, settings.flashX, settings.flashY)
  }
}

/** Export the poster as a 1500x2000 PNG and trigger the download. */
export function exportPosterPNG(
  photo: PhotoState | null,
  settings: HalftoneSettings,
  stickers: Sticker[],
  filename = 'njs-bluebook-poster.png',
): void {
  const c = document.createElement('canvas')
  c.width = EXPORT_W
  c.height = EXPORT_H
  const ctx = c.getContext('2d')
  if (!ctx) return
  renderPoster(ctx, photo, settings, stickers, { scaleMul: EXPORT_SCALE })
  c.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }, 'image/png')
}
