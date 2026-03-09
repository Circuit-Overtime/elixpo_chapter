"use client"

import useUIStore from '@/store/useUIStore'

export default function Header() {
  const workspaceName = useUIStore((s) => s.workspaceName)
  const setWorkspaceName = useUIStore((s) => s.setWorkspaceName)
  const toggleMenu = useUIStore((s) => s.toggleMenu)
  const toggleShortcutsModal = useUIStore((s) => s.toggleShortcutsModal)

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-surface-dark border-b border-[#2c2c35] z-[1001] flex items-center justify-between px-3 font-[lixFont]">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div
          className="w-[26px] h-[26px] bg-contain bg-no-repeat bg-center"
          style={{ backgroundImage: "url('/Images/logo.png')" }}
        />

        {/* Divider */}
        <div className="w-px h-5 bg-[#2c2c35]" />

        {/* Workspace name */}
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          className="bg-transparent text-text-secondary text-sm border-none outline-none w-40 px-1.5 py-1 rounded hover:bg-surface-hover/50 focus:bg-surface-hover/50 transition-all duration-200 font-[lixFont]"
          spellCheck={false}
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Help icon */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200">
          <i className="bx bx-help-circle text-lg" />
        </button>

        {/* Share button */}
        <button className="px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-sm rounded-lg transition-all duration-200 font-[lixFont]">
          Share
        </button>

        {/* Shortcuts button */}
        <button
          onClick={toggleShortcutsModal}
          className="px-2.5 py-1.5 bg-surface hover:bg-surface-hover text-text-muted text-sm rounded-lg border border-border transition-all duration-200 font-[lixFont]"
        >
          Ctrl+/
        </button>

        {/* Hamburger menu */}
        <button
          onClick={toggleMenu}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-menu text-xl" />
        </button>
      </div>
    </header>
  )
}
