// sample.ts — procedural two-tone abstract portrait used when
// /assets/sample/sample-portrait.png is not available, so SAMPLE never errors.

async function tryLoadSample(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function drawProceduralPortrait(): HTMLCanvasElement {
  const W = 600
  const H = 800
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return c

  // paper-ish ground with a light gradient band
  ctx.fillStyle = '#EFEBDD'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(43,82,214,0.10)')
  g.addColorStop(0.5, 'rgba(43,82,214,0)')
  g.addColorStop(1, 'rgba(242,80,158,0.12)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const ink = '#23212B'
  const mid = '#5B5870'
  const skin = '#C9C4B4'

  // shoulders / torso silhouette
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.moveTo(60, H)
  ctx.bezierCurveTo(90, 560, 200, 520, 300, 520)
  ctx.bezierCurveTo(400, 520, 510, 560, 540, H)
  ctx.closePath()
  ctx.fill()

  // neck
  ctx.fillStyle = mid
  ctx.fillRect(262, 440, 76, 110)

  // hair mass (two buns + fringe)
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.ellipse(300, 300, 150, 165, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(168, 190, 62, 0, Math.PI * 2)
  ctx.arc(432, 190, 62, 0, Math.PI * 2)
  ctx.fill()

  // face
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.ellipse(300, 330, 105, 125, 0, 0, Math.PI * 2)
  ctx.fill()

  // fringe shadow
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.ellipse(300, 238, 108, 46, 0, Math.PI, Math.PI * 2)
  ctx.fill()

  // eyes
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.ellipse(258, 330, 13, 17, 0, 0, Math.PI * 2)
  ctx.ellipse(342, 330, 13, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  // eye highlights
  ctx.fillStyle = '#FDFDF8'
  ctx.beginPath()
  ctx.arc(253, 324, 4, 0, Math.PI * 2)
  ctx.arc(337, 324, 4, 0, Math.PI * 2)
  ctx.fill()

  // blush + mouth
  ctx.fillStyle = 'rgba(242,80,158,0.55)'
  ctx.beginPath()
  ctx.ellipse(238, 372, 16, 9, 0, 0, Math.PI * 2)
  ctx.ellipse(362, 372, 16, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8E3B5E'
  ctx.beginPath()
  ctx.ellipse(300, 405, 18, 10, 0, 0, Math.PI)
  ctx.fill()

  // collar stripes (gives the halftone some mid-tones to chew on)
  ctx.fillStyle = '#FDFDF8'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(140, 600 + i * 46, 320, 12)
  }

  // accent shapes
  ctx.fillStyle = '#2B52D6'
  ctx.beginPath()
  ctx.arc(496, 132, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FFE600'
  ctx.save()
  ctx.translate(92, 120)
  ctx.rotate(0.5)
  ctx.fillRect(-22, -8, 44, 16)
  ctx.restore()

  return c
}

/** Load the sample portrait: real file when present, procedural otherwise. */
export async function loadSamplePortrait(): Promise<{ image: CanvasImageSource; w: number; h: number }> {
  const base = import.meta.env.BASE_URL || '/'
  const img = await tryLoadSample(`${base}assets/sample/sample-portrait.png`)
  if (img && img.naturalWidth > 0) {
    return { image: img, w: img.naturalWidth, h: img.naturalHeight }
  }
  const c = drawProceduralPortrait()
  return { image: c, w: c.width, h: c.height }
}
