import { useEffect, useMemo, useState } from 'react'

const BASE = import.meta.env.BASE_URL || '/'
const POSTERS = [
  `${BASE}assets/tv/poster-1.png`,
  `${BASE}assets/tv/poster-2.png`,
  `${BASE}assets/tv/poster-3.png`,
]
const BUNNY = `${BASE}assets/stickers/bunny.png`

const POSTER_MS = 4000 // each poster stays on screen this long
const GLITCH_MS = 400 // channel-change glitch duration
const GLITCH_SWAP_MS = 200 // poster swaps mid-glitch, hidden by the noise

/**
 * Animated retro-TV page background: a CSS-drawn CRT set looping blue
 * halftone posters with signal-glitch transitions, interrupted every
 * ~10-14s by a flashing bunny station ident. Pure CSS visuals; timers only
 * fire a few times per second at most (no per-frame JS).
 */
export default function TvBackground() {
  const [poster, setPoster] = useState(0)
  const [glitch, setGlitch] = useState(false)
  const [bunny, setBunny] = useState(false)
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set())
  const [bunnyFailed, setBunnyFailed] = useState(false)

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // poster slideshow with a glitch transition between channels
  useEffect(() => {
    if (reduced) return
    let swap = 0
    let settle = 0
    const cycle = window.setInterval(() => {
      setGlitch(true)
      swap = window.setTimeout(() => setPoster((p) => (p + 1) % POSTERS.length), GLITCH_SWAP_MS)
      settle = window.setTimeout(() => setGlitch(false), GLITCH_MS)
    }, POSTER_MS)
    return () => {
      window.clearInterval(cycle)
      window.clearTimeout(swap)
      window.clearTimeout(settle)
    }
  }, [reduced])

  // bunny station ident: random every ~10-14s, holds ~0.8-1.2s
  useEffect(() => {
    if (reduced) return
    let alive = true
    let t1 = 0
    let t2 = 0
    let t3 = 0
    const schedule = () => {
      t1 = window.setTimeout(
        () => {
          if (!alive) return
          setGlitch(true)
          setBunny(true)
          t2 = window.setTimeout(
            () => {
              if (!alive) return
              setBunny(false)
              t3 = window.setTimeout(() => setGlitch(false), GLITCH_MS)
              schedule()
            },
            800 + Math.random() * 400,
          )
        },
        10000 + Math.random() * 4000,
      )
    }
    schedule()
    return () => {
      alive = false
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [reduced])

  const markFailed = (i: number) =>
    setFailed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))

  // missing poster -> cobalt dot screen with the bunny ident instead;
  // reduced-motion keeps a static poster (timers never run, poster stays 0)
  const showIdent = bunny || failed.has(poster)
  const identHard = bunny && !reduced

  return (
    <div className="tv-layer" aria-hidden="true">
      <div className="tv-set">
        <div className="tv-antenna tv-antenna-l" />
        <div className="tv-antenna tv-antenna-r" />
        <div className="tv-body">
          <div className={`tv-screen ${glitch ? 'glitch' : ''} ${identHard ? 'hard' : ''}`}>
            <div className="tv-screen-bg" />
            {POSTERS.map((src, i) =>
              failed.has(i) ? null : (
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className={`tv-poster ${i === poster && !showIdent ? 'on' : ''}`}
                  onError={() => markFailed(i)}
                />
              ),
            )}
            <div className={`tv-ident ${showIdent ? 'on' : ''}`}>
              {!bunnyFailed && (
                <img
                  src={BUNNY}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() => setBunnyFailed(true)}
                />
              )}
            </div>
            <div className="tv-noise" />
            <div className="tv-tear" />
            <div className="tv-scanlines" />
            <div className="tv-crt" />
          </div>
          <div className="tv-side">
            <span className="tv-knob tv-knob-blue" />
            <span className="tv-knob tv-knob-white" />
            <span className="tv-knob tv-knob-pink" />
            <div className="tv-speaker" />
          </div>
        </div>
        <div className="tv-foot tv-foot-l" />
        <div className="tv-foot tv-foot-r" />
      </div>
      <span className="pixel-sparkle ps-1" />
      <span className="pixel-sparkle ps-2" />
    </div>
  )
}
