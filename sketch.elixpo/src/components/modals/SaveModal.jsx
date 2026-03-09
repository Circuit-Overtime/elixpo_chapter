"use client"

import useUIStore from '@/store/useUIStore'

const SAVE_OPTIONS = [
  {
    id: 'png',
    label: 'Image',
    description: 'Export as PNG',
    icon: 'bxs-image',
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    description: 'Export as PDF',
    icon: 'bxs-file-pdf',
  },
  {
    id: 'lixsketch',
    label: 'Scene (.lixsketch)',
    description: 'Save scene data for later',
    icon: 'bx-braces',
  },
  {
    id: 'load',
    label: 'Open Scene',
    description: 'Load a .lixsketch file',
    icon: 'bx-folder-open',
  },
]

function handleSaveAction(id, toggleModal) {
  const serializer = window.__sceneSerializer
  if (!serializer) {
    console.warn('Scene serializer not initialized yet')
    return
  }

  switch (id) {
    case 'png':
      serializer.exportPNG()
      break
    case 'pdf':
      serializer.exportPDF()
      break
    case 'lixsketch': {
      const name = useUIStore.getState().workspaceName || 'Untitled'
      serializer.download(name)
      break
    }
    case 'load':
      serializer.upload().then((success) => {
        if (success) toggleModal()
      }).catch(() => {})
      return // Don't close modal yet — wait for file load
  }

  toggleModal()
}

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
              onClick={() => handleSaveAction(option.id, toggleSaveModal)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border-light hover:border-accent-blue hover:bg-surface-hover cursor-pointer transition-all duration-200"
            >
              <i
                className={`bx ${option.icon} text-2xl text-accent-blue`}
              />
              <div className="flex flex-col items-start">
                <span className="text-text-primary text-sm">
                  {option.label}
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
