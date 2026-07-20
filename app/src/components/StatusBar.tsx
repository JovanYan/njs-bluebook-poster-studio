import { useEffect, useState } from 'react'

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export default function StatusBar({ recording }: { recording: boolean }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`

  return (
    <header className="osd-bar">
      <div className="flex items-center gap-2">
        <span className={`rec-dot ${recording ? 'rec-on' : 'rec-off'}`} />
        <span>{recording ? 'REC' : 'STANDBY'}</span>
      </div>
      <div className="osd-clock">{clock}</div>
      <div>{date}</div>
    </header>
  )
}
