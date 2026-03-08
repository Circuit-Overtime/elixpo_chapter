"use client"

export default function ShapeSidebar({ visible, title, children }) {
  return (
    <div
      className={`absolute left-14 top-1/2 -translate-y-1/2 w-[200px] bg-surface border border-border-light rounded-xl p-3 z-[999] font-[lixFont] transition-all duration-200 ${
        visible
          ? 'opacity-100 pointer-events-auto blur-0'
          : 'opacity-0 pointer-events-none blur-sm'
      }`}
    >
      {title && (
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
