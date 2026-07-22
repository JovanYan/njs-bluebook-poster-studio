import { useCallback, useEffect, useRef, useState } from 'react'
import StatusBar from './components/StatusBar'
import PosterCanvas from './components/PosterCanvas'
import Controls from './components/Controls'
import StickerTray, { TrayGroup } from './components/StickerTray'
import CameraModal from './components/CameraModal'
import { DEFAULT_HALFTONE, HalftoneSettings } from './lib/halftone'
import {
  PhotoState,
  PhotoTransform,
  POSTER_W,
  POSTER_H,
  exportPosterPNG,
} from './lib/poster'
import {
  Sticker,
  StickerAsset,
  STICKER_GROUPS,
  createNameplateSource,
  loadStickerAssets,
  makeSticker,
} from './lib/stickers'
import { loadTextStickers } from './lib/textstickers'
import { loadSamplePortrait } from './lib/sample'

let photoCounter = 0

const DEFAULT_ZOOM = 1.08

export default function App() {
  const [photo, setPhoto] = useState<PhotoState | null>(null)
  const [settings, setSettings] = useState<HalftoneSettings>(DEFAULT_HALFTONE)
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [trayGroups, setTrayGroups] = useState<TrayGroup[]>([])
  const [nameText, setNameText] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)

  const uploadInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void Promise.all([loadStickerAssets(), loadTextStickers()]).then(([images, words]) => {
      const groups: TrayGroup[] = STICKER_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        assets:
          g.id === 'words'
            ? [...images.filter((a) => a.group === 'words'), ...words]
            : images.filter((a) => a.group === g.id),
      }))
      setTrayGroups(groups)
    })
  }, [])

  const setPhotoFromSource = useCallback((image: CanvasImageSource, w: number, h: number) => {
    photoCounter += 1
    setPhoto({
      id: `photo-${Date.now().toString(36)}-${photoCounter}`,
      image,
      imgW: w,
      imgH: h,
      t: { x: 0, y: 0, scale: DEFAULT_ZOOM },
    })
    setSelectedId(null)
  }, [])

  const loadFile = useCallback(
    (file: File | Blob) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => setPhotoFromSource(img, img.naturalWidth, img.naturalHeight)
        img.src = String(reader.result)
      }
      reader.readAsDataURL(file)
    },
    [setPhotoFromSource],
  )

  const handleUpload = useCallback(() => uploadInputRef.current?.click(), [])

  const handleCamera = useCallback(() => {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      setCameraOpen(true)
    } else {
      cameraInputRef.current?.click()
    }
  }, [])

  const handleSample = useCallback(() => {
    void loadSamplePortrait().then(({ image, w, h }) => setPhotoFromSource(image, w, h))
  }, [setPhotoFromSource])

  const handleSave = useCallback(() => {
    exportPosterPNG(photo, settings, stickers)
  }, [photo, settings, stickers])

  const handleRetake = useCallback(() => {
    setPhoto(null)
    setStickers([])
    setSelectedId(null)
  }, [])

  const handleCameraErrorFallback = useCallback(() => {
    setCameraOpen(false)
    cameraInputRef.current?.click()
  }, [])

  const addSticker = useCallback((asset: StickerAsset) => {
    const s = makeSticker(asset, POSTER_W / 2, POSTER_H / 2, asset.baseSize ?? 150)
    setStickers((prev) => [...prev, s])
    setSelectedId(s.id)
  }, [])

  const addNameplate = useCallback(() => {
    void createNameplateSource(nameText).then(({ source, aspect }) => {
      const asset: StickerAsset = { name: 'nameplate', source, aspect, loaded: true }
      const s = makeSticker(asset, POSTER_W / 2, POSTER_H / 2, 220)
      setStickers((prev) => [...prev, s])
      setSelectedId(s.id)
    })
  }, [nameText])

  const updateSticker = useCallback((next: Sticker) => {
    setStickers((prev) => prev.map((s) => (s.id === next.id ? next : s)))
  }, [])

  const removeSticker = useCallback((id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  const updateTransform = useCallback((t: PhotoTransform) => {
    setPhoto((prev) => (prev ? { ...prev, t } : prev))
  }, [])

  const updateFlashPos = useCallback((fx: number, fy: number) => {
    setSettings((s) => ({ ...s, flashX: fx, flashY: fy }))
  }, [])

  return (
    <div className="app-root">
      {/* highlighter splotches */}
      <div className="splotch splotch-yellow" />
      <div className="splotch splotch-pink" />
      <div className="splotch splotch-yellow-2" />

      <StatusBar recording={photo !== null} />

      <main className="main-layout">
        {/* ── poster column ── */}
        <section className="poster-column">
          <div className="title-wrap">
            <h1 className="title-hand">NewJeans Bluebook</h1>
            <svg className="title-squiggle" viewBox="0 0 220 14" aria-hidden>
              <path
                d="M4 9 Q 20 3, 38 8 T 74 8 T 110 8 T 146 8 T 182 8 T 216 8"
                fill="none"
                stroke="#F2509E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="title-tag">HALFTONE POSTER STUDIO</span>
          </div>

          <div className="poster-frame">
            <div className="washi washi-tl" />
            <div className="washi washi-br" />
            <svg className="doodle doodle-star" viewBox="0 0 40 40" aria-hidden>
              <path
                d="M20 3 L24 15 L37 16 L27 24 L30 37 L20 30 L10 37 L13 24 L3 16 L16 15 Z"
                fill="#FFE600"
                stroke="#141414"
                strokeWidth="2"
              />
            </svg>
            <svg className="doodle doodle-squig" viewBox="0 0 60 20" aria-hidden>
              <path
                d="M3 12 Q 12 2, 21 12 T 39 12 T 57 12"
                fill="none"
                stroke="#F2509E"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            <PosterCanvas
              photo={photo}
              settings={settings}
              stickers={stickers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdateSticker={updateSticker}
              onRemoveSticker={removeSticker}
              onPhotoTransform={updateTransform}
              onFlashMove={updateFlashPos}
              onDropFile={loadFile}
              onRequestUpload={handleUpload}
            />

            {photo === null && (
              <button className="dropzone" onClick={handleUpload}>
                <svg className="dropzone-arrow" viewBox="0 0 80 60" aria-hidden>
                  <path
                    d="M64 6 C 50 26, 34 36, 16 44"
                    fill="none"
                    stroke="#141414"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M28 40 L14 46 L20 32"
                    fill="none"
                    stroke="#141414"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="dropzone-text">DROP PHOTO HERE</span>
                <span className="dropzone-text dropzone-sub">TAP TO UPLOAD</span>
              </button>
            )}
          </div>

          <StickerTray groups={trayGroups} onAdd={addSticker} />
        </section>

        {/* ── control console ── */}
        <aside className="console-column">
          <Controls
            hasPhoto={photo !== null}
            dot={settings.cell}
            ink={settings.inkGain}
            contrast={settings.contrast}
            flash={settings.flash}
            flashRange={settings.flashRange}
            inkColor={settings.inkColor}
            nameText={nameText}
            onDot={(v) => setSettings((s) => ({ ...s, cell: v }))}
            onInk={(v) => setSettings((s) => ({ ...s, inkGain: v }))}
            onContrast={(v) => setSettings((s) => ({ ...s, contrast: v }))}
            onFlash={(v) => setSettings((s) => ({ ...s, flash: v }))}
            onFlashRange={(v) => setSettings((s) => ({ ...s, flashRange: v }))}
            onInkColor={(v) => setSettings((s) => ({ ...s, inkColor: v }))}
            onNameText={setNameText}
            onAddNameplate={addNameplate}
            onUpload={handleUpload}
            onCamera={handleCamera}
            onSample={handleSample}
            onSave={handleSave}
            onRetake={handleRetake}
          />
        </aside>
      </main>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadFile(f)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadFile(f)
          e.target.value = ''
        }}
      />

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onFallback={handleCameraErrorFallback}
        onShot={(blob) => {
          setCameraOpen(false)
          loadFile(blob)
        }}
      />
    </div>
  )
}
