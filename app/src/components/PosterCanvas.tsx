import { useCallback, useEffect, useRef } from 'react'
import type { HalftoneSettings, LuminanceSampler } from '../lib/halftone'
import { buildLuminanceSampler } from '../lib/halftone'
import {
  POSTER_W,
  POSTER_H,
  FLASH_HANDLE_HIT_RADIUS,
  PhotoState,
  PhotoTransform,
  clampTransform,
  drawFramedPhoto,
  flashHandlePosition,
  renderPoster,
} from '../lib/poster'
import { Sticker, hitHandle, hitTest } from '../lib/stickers'

interface PosterCanvasProps {
  photo: PhotoState | null
  settings: HalftoneSettings
  stickers: Sticker[]
  selectedId: string | null
  onSelect(id: string | null): void
  onUpdateSticker(s: Sticker): void
  onRemoveSticker(id: string): void
  onPhotoTransform(t: PhotoTransform): void
  onFlashMove(fx: number, fy: number): void
  onDropFile(f: File): void
  onRequestUpload(): void
}

type Gesture =
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'move'; id: string; grabDX: number; grabDY: number }
  | { kind: 'scale'; id: string; startDist: number; startScale: number }
  | { kind: 'rotate'; id: string; startAngle: number; startRotation: number }
  | { kind: 'delete-pending'; id: string }
  | { kind: 'flash' }
  | { kind: 'pinch-sticker'; id: string; d0: number; a0: number; s0: number; r0: number }
  | { kind: 'pinch-photo'; d0: number; s0: number; lastMX: number; lastMY: number }

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

export default function PosterCanvas(props: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const samplerCache = useRef<{ key: string; sampler: LuminanceSampler } | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  // live refs so pointer handlers always see current state
  const live = useRef(props)
  live.current = props

  const toPoster = useCallback((clientX: number, clientY: number) => {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    return {
      x: ((clientX - r.left) / r.width) * POSTER_W,
      y: ((clientY - r.top) / r.height) * POSTER_H,
    }
  }, [])

  /** is the pointer on the flash handle? (only when flash is active) */
  const hitFlashHandle = useCallback((px: number, py: number): boolean => {
    const { photo, settings } = live.current
    if (!photo || settings.flash <= 0) return false
    const h = flashHandlePosition(settings.flashX, settings.flashY)
    return Math.hypot(px - h.x, py - h.y) <= FLASH_HANDLE_HIT_RADIUS
  }, [])

  // ── render loop (rAF-debounced) ────────────────────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')
      if (!ctx) return
      const { photo, settings, stickers, selectedId } = live.current

      let sampler: LuminanceSampler | null = null
      if (photo) {
        const key = `${photo.id}|${photo.t.x.toFixed(1)}|${photo.t.y.toFixed(1)}|${photo.t.scale.toFixed(3)}`
        if (samplerCache.current?.key === key) {
          sampler = samplerCache.current.sampler
        } else {
          const off = document.createElement('canvas')
          off.width = POSTER_W
          off.height = POSTER_H
          const octx = off.getContext('2d')
          if (octx) {
            drawFramedPhoto(octx, photo, 1)
            sampler = buildLuminanceSampler(off, POSTER_W, POSTER_H)
            samplerCache.current = { key, sampler }
          }
        }
      }

      renderPoster(ctx, photo, settings, stickers, {
        scaleMul: 1,
        selectedId,
        sampler,
        showFlashHandle: photo !== null && settings.flash > 0,
      })
    })
    return () => cancelAnimationFrame(rafRef.current)
  }, [props.photo, props.settings, props.stickers, props.selectedId])

  // ── gestures ───────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current
    if (!c) return
    c.setPointerCapture(e.pointerId)
    const p = toPoster(e.clientX, e.clientY)
    pointers.current.set(e.pointerId, p)
    const { photo, stickers, selectedId } = live.current

    // second finger: upgrade to a pinch gesture
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const sel = stickers.find((s) => s.id === selectedId)
      if (sel && (hitTest(sel, pts[0].x, pts[0].y) || hitTest(sel, pts[1].x, pts[1].y))) {
        gesture.current = {
          kind: 'pinch-sticker',
          id: sel.id,
          d0,
          a0: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
          s0: sel.scale,
          r0: sel.rotation,
        }
      } else if (photo) {
        gesture.current = {
          kind: 'pinch-photo',
          d0,
          s0: photo.t.scale,
          lastMX: (pts[0].x + pts[1].x) / 2,
          lastMY: (pts[0].y + pts[1].y) / 2,
        }
      }
      return
    }

    // flash handle first — it must not conflict with panning or stickers
    if (hitFlashHandle(p.x, p.y)) {
      gesture.current = { kind: 'flash' }
      return
    }

    // handles of the selected sticker next
    const sel = stickers.find((s) => s.id === selectedId)
    if (sel) {
      const h = hitHandle(sel, p.x, p.y)
      if (h === 'delete') {
        gesture.current = { kind: 'delete-pending', id: sel.id }
        return
      }
      if (h === 'scale') {
        gesture.current = {
          kind: 'scale',
          id: sel.id,
          startDist: Math.max(8, Math.hypot(p.x - sel.x, p.y - sel.y)),
          startScale: sel.scale,
        }
        return
      }
      if (h === 'rotate') {
        gesture.current = {
          kind: 'rotate',
          id: sel.id,
          startAngle: Math.atan2(p.y - sel.y, p.x - sel.x),
          startRotation: sel.rotation,
        }
        return
      }
    }

    // topmost sticker under the pointer
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i]
      if (hitTest(s, p.x, p.y)) {
        live.current.onSelect(s.id)
        gesture.current = { kind: 'move', id: s.id, grabDX: p.x - s.x, grabDY: p.y - s.y }
        return
      }
    }

    live.current.onSelect(null)
    if (photo) {
      gesture.current = { kind: 'pan', lastX: p.x, lastY: p.y }
    } else {
      live.current.onRequestUpload()
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = toPoster(e.clientX, e.clientY)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g) return
    const { photo, stickers } = live.current
    const find = (id: string) => stickers.find((s) => s.id === id)

    if (g.kind === 'flash') {
      live.current.onFlashMove(clamp01(p.x / POSTER_W), clamp01(p.y / POSTER_H))
      return
    }

    if (g.kind === 'pan' && photo) {
      const next = clampTransform({
        ...photo,
        t: { ...photo.t, x: photo.t.x + (p.x - g.lastX), y: photo.t.y + (p.y - g.lastY) },
      })
      live.current.onPhotoTransform(next)
      gesture.current = { kind: 'pan', lastX: p.x, lastY: p.y }
      return
    }

    if (g.kind === 'move') {
      const s = find(g.id)
      if (s) live.current.onUpdateSticker({ ...s, x: p.x - g.grabDX, y: p.y - g.grabDY })
      return
    }

    if (g.kind === 'scale') {
      const s = find(g.id)
      if (s) {
        const d = Math.max(8, Math.hypot(p.x - s.x, p.y - s.y))
        const ns = Math.min(6, Math.max(0.15, g.startScale * (d / g.startDist)))
        live.current.onUpdateSticker({ ...s, scale: ns })
      }
      return
    }

    if (g.kind === 'rotate') {
      const s = find(g.id)
      if (s) {
        const a = Math.atan2(p.y - s.y, p.x - s.x)
        live.current.onUpdateSticker({ ...s, rotation: g.startRotation + (a - g.startAngle) })
      }
      return
    }

    if (g.kind === 'pinch-sticker' && pointers.current.size >= 2) {
      const s = find(g.id)
      if (s) {
        const pts = [...pointers.current.values()]
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        const a = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x)
        const ns = Math.min(6, Math.max(0.15, g.s0 * (d / Math.max(8, g.d0))))
        live.current.onUpdateSticker({ ...s, scale: ns, rotation: g.r0 + (a - g.a0) })
      }
      return
    }

    if (g.kind === 'pinch-photo' && photo && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const mx = (pts[0].x + pts[1].x) / 2
      const my = (pts[0].y + pts[1].y) / 2
      const ns = Math.min(5, Math.max(1, g.s0 * (d / Math.max(8, g.d0))))
      const next = clampTransform({
        ...photo,
        t: {
          scale: ns,
          x: photo.t.x + (mx - g.lastMX),
          y: photo.t.y + (my - g.lastMY),
        },
      })
      live.current.onPhotoTransform(next)
      gesture.current = { ...g, lastMX: mx, lastMY: my }
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.kind === 'delete-pending') {
      live.current.onRemoveSticker(g.id)
    }
    gesture.current = null
  }

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const { photo, stickers, selectedId } = live.current
    const p = toPoster(e.clientX, e.clientY)
    const sel = stickers.find((s) => s.id === selectedId)
    if (sel && hitTest(sel, p.x, p.y)) {
      const ns = Math.min(6, Math.max(0.15, sel.scale * Math.exp(-e.deltaY * 0.0015)))
      live.current.onUpdateSticker({ ...sel, scale: ns })
      return
    }
    if (!photo) return
    const ns = Math.min(5, Math.max(1, photo.t.scale * Math.exp(-e.deltaY * 0.0015)))
    live.current.onPhotoTransform(clampTransform({ ...photo, t: { ...photo.t, scale: ns } }))
  }

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = toPoster(e.clientX, e.clientY)
    if (hitFlashHandle(p.x, p.y)) {
      live.current.onFlashMove(0.5, 0.5)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={POSTER_W}
      height={POSTER_H}
      className="poster-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f && f.type.startsWith('image/')) live.current.onDropFile(f)
      }}
    />
  )
}
