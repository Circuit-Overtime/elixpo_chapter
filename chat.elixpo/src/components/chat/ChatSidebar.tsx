"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>, label: "New chat", href: "/chat/new" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>, label: "Search", href: "#" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>, label: "Projects", href: "#" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>, label: "Chats", href: "#" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" /><circle cx="12" cy="12" r="3" /></svg>, label: "Settings", href: "#" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M16 18l2-2-2-2" /><path d="M8 6L6 8l2 2" /><path d="M14.5 4l-5 16" /></svg>, label: "Code", href: "#" },
];

export default function ChatSidebar({ collapsed, onToggle }: SidebarProps) {
  const { id } = useParams<{ id: string }>();

  return (
    <div className={`flex flex-col h-full bg-white border-r border-neutral-100 transition-all duration-300 ${collapsed ? "w-14" : "w-56"}`}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center h-12 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          {collapsed
            ? <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
            : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
          }
        </svg>
      </button>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === `/chat/${id}` || (item.label === "New chat" && id === "new");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors ${
                isActive ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logo at bottom */}
      <div className="px-2 pb-4 pt-2">
        <Link href="/" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-neutral-400 hover:text-neutral-700 transition-colors">
          <img src="/images/logo.png" alt="" width={24} height={24} className="rounded-md opacity-50" />
          {!collapsed && <span className="text-xs font-medium">Elixpo Chat</span>}
        </Link>
      </div>
    </div>
  );
}
