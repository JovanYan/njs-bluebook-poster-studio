import { useCallback, useEffect, useRef, useState } from 'react'

interface CameraModalProps {
  open: boolean
  onClose(): void
  onShot(blob: Blob): void
  /** camera unavailable/denied -> parent falls back to a capture file input */
  onFallback(): void
}

/**
 * getUserMedia photo booth. When the camera is unavailable or denied,
 * the parent falls back to a capture="user" file input.
 */
export default function CameraModal({ open, onClose, onShot, onFallback }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCaptured(null)
    setError(null)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => undefined)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('CAMERA UNAVAILABLE')
          onFallback()
        }
      })
    return () => {
      cancelled = true
      stop()
    }
  }, [open, stop, onFallback])

  if (!open) return null

  const shutter = () => {
    const v = videoRef.current
    if (!v || v.videoWidth === 0) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (!ctx) return
    // mirror the selfie view
    ctx.translate(c.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0)
    setCaptured(c.toDataURL('image/png'))
  }

  const useShot = () => {
    if (!captured) return
    fetch(captured)
      .then((r) => r.blob())
      .then((blob) => {
        stop()
        onShot(blob)
      })
      .catch(() => undefined)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="osd-bar modal-osd">
          <span>CAMERA</span>
          <button className="btn-pixel btn-xs" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-stage">
          {error ? (
            <div className="font-pixel text-[9px] p-6 text-center">{error}</div>
          ) : captured ? (
            <img src={captured} alt="captured" className="modal-media" />
          ) : (
            <video ref={videoRef} className="modal-media mirrored" muted playsInline />
          )}
        </div>
        <div className="flex gap-3 justify-center p-3">
          {captured ? (
            <>
              <button className="btn-pixel" onClick={() => setCaptured(null)}>
                Retake
              </button>
              <button className="btn-pixel btn-accent" onClick={useShot}>
                Use
              </button>
            </>
          ) : (
            <button className="btn-pixel btn-accent" onClick={shutter} disabled={!!error}>
              ● Shutter
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
