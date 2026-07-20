import { INK_SWATCHES } from '../lib/constants'

interface ControlsProps {
  hasPhoto: boolean
  dot: number
  ink: number
  contrast: number
  flash: number
  flashRange: number
  inkColor: string
  nameText: string
  onDot(v: number): void
  onInk(v: number): void
  onContrast(v: number): void
  onFlash(v: number): void
  onFlashRange(v: number): void
  onInkColor(v: string): void
  onNameText(v: string): void
  onAddNameplate(): void
  onUpload(): void
  onCamera(): void
  onSample(): void
  onSave(): void
  onRetake(): void
}

function PixelSlider(props: {
  label: string
  min: number
  max: number
  step: number
  value: number
  disabled?: boolean
  format?: (v: number) => string
  onChange(v: number): void
}) {
  const { label, min, max, step, value, onChange, disabled } = props
  const fmt = props.format ?? ((v: number) => v.toFixed(2))
  return (
    <div className={`slider-row ${disabled ? 'slider-disabled' : ''}`}>
      <label className="slider-label">{label}</label>
      <input
        type="range"
        className="pixel-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{fmt(value)}</span>
    </div>
  )
}

export default function Controls(p: ControlsProps) {
  return (
    <div className="console">
      <div className="btn-grid">
        {p.hasPhoto ? (
          <>
            <button className="btn-pixel btn-accent" onClick={p.onSave}>
              Save PNG
            </button>
            <button className="btn-pixel" onClick={p.onRetake}>
              Retake
            </button>
          </>
        ) : (
          <>
            <button className="btn-pixel btn-accent" onClick={p.onUpload}>
              Upload
            </button>
            <button className="btn-pixel" onClick={p.onCamera}>
              Camera
            </button>
            <button className="btn-pixel" onClick={p.onSample}>
              Sample
            </button>
          </>
        )}
      </div>

      <div className="panel-block">
        <PixelSlider label="DOT" min={3} max={14} step={0.5} value={p.dot} format={(v) => v.toFixed(1)} onChange={p.onDot} />
        <PixelSlider label="INK" min={0.5} max={1.6} step={0.05} value={p.ink} onChange={p.onInk} />
        <PixelSlider label="CONTRAST" min={0.4} max={2.5} step={0.05} value={p.contrast} onChange={p.onContrast} />
        <PixelSlider label="FLASH" min={0} max={100} step={1} value={p.flash} format={(v) => String(Math.round(v))} onChange={p.onFlash} />
        <PixelSlider label="RANGE" min={0} max={100} step={1} value={p.flashRange} disabled={p.flash <= 0} format={(v) => String(Math.round(v))} onChange={p.onFlashRange} />
      </div>

      <div className="panel-block">
        <div className="slider-label mb-2">INK COLOR</div>
        <div className="flex gap-3">
          {INK_SWATCHES.map((c) => (
            <button
              key={c}
              className={`swatch ${p.inkColor === c ? 'swatch-selected' : ''}`}
              style={{ background: c }}
              aria-label={`ink ${c}`}
              onClick={() => p.onInkColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="panel-block">
        <div className="slider-label mb-2">NAMEPLATE</div>
        <div className="flex gap-2">
          <input
            className="pixel-input"
            value={p.nameText}
            maxLength={18}
            placeholder="YOUR NAME"
            onChange={(e) => p.onNameText(e.target.value)}
          />
          <button className="btn-pixel" onClick={p.onAddNameplate}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
