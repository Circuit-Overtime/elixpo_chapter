'use client'

import useUIStore from '@/store/useUIStore'

export default function SaveStatusIndicator() {
  const saveStatus = useUIStore((s) => s.saveStatus)

  if (saveStatus === 'idle') return null

  const isCloud = saveStatus === 'cloud'

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-card/80 backdrop-blur-md border border-border-light font-[lixFont] pointer-events-none select-none">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isCloud ? 'bg-green-400' : 'bg-yellow-400'
        }`}
      />
      <span className="text-text-dim text-[10px] tracking-wide">
        {isCloud ? 'Synced to cloud' : 'Saved locally'}
      </span>
    </div>
  )
}
