"use client"

import useUIStore from '@/store/useUIStore'

const SAVE_OPTIONS = [
  {
    id: 'png',
    label: 'Image',
    description: 'Export as PNG',
    icon: 'bxs-image',
    disabled: false,
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    description: 'Export as PDF',
    icon: 'bxs-file-pdf',
    disabled: false,
  },
  {
    id: 'json',
    label: 'Scene (.json)',
    description: 'Save scene data',
    icon: 'bx-braces',
    disabled: true,
    badge: 'Coming Soon',
  },
]

export default function SaveModal() {
  const saveModalOpen = useUIStore((s) => s.saveModalOpen)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)

  if (!saveModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
      onClick={toggleSaveModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface-card border border-border-light rounded-2xl p-6 w-[340px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary text-base font-medium">Save As</h2>
          <button
            onClick={toggleSaveModal}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {SAVE_OPTIONS.map((option) => (
            <button
              key={option.id}
              disabled={option.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                option.disabled
                  ? 'border-border opacity-50 cursor-not-allowed'
                  : 'border-border-light hover:border-accent-blue hover:bg-surface-hover cursor-pointer'
              }`}
            >
              <i
                className={`bx ${option.icon} text-2xl ${
                  option.disabled ? 'text-text-dim' : 'text-accent-blue'
                }`}
              />
              <div className="flex flex-col items-start">
                <span className="text-text-primary text-sm flex items-center gap-2">
                  {option.label}
                  {option.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-surface-hover text-text-dim rounded-full border border-border">
                      {option.badge}
                    </span>
                  )}
                </span>
                <span className="text-text-dim text-xs">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
