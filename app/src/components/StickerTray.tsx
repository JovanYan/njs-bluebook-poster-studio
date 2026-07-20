import { useEffect, useRef } from 'react'
import type { StickerAsset } from '../lib/stickers'

export interface TrayGroup {
  id: string
  label: string
  assets: StickerAsset[]
}

function Thumb({ asset, onClick }: { asset: StickerAsset; onClick(): void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const S = 44
    const dpr = 2
    c.width = S * dpr
    c.height = S * dpr
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, S, S)
    const a = asset.aspect > 0 ? asset.aspect : 1
    let w = S - 8
    let h = w / a
    if (h > S - 8) {
      h = S - 8
      w = h * a
    }
    ctx.drawImage(asset.source, (S - w) / 2, (S - h) / 2, w, h)
  }, [asset])

  return (
    <button className="tray-thumb" onClick={onClick} title={asset.name.toUpperCase()}>
      <canvas ref={ref} style={{ width: 44, height: 44 }} />
    </button>
  )
}

export default function StickerTray({
  groups,
  onAdd,
}: {
  groups: TrayGroup[]
  onAdd(asset: StickerAsset): void
}) {
  return (
    <div className="sticker-tray">
      {groups.map((g) => (
        <div className="tray-group" key={g.id}>
          <div className="tray-group-label">{g.label}</div>
          <div className="tray-group-thumbs">
            {g.assets.map((a) => (
              <Thumb key={a.name} asset={a} onClick={() => onAdd(a)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
