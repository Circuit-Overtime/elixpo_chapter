"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Building2, GitPullRequest, Layers3, Play, Radio } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Building", icon: Building2 },
  { href: "/floors", label: "Floors", icon: Layers3 },
  { href: "/runs", label: "Runs", icon: Play },
  { href: "/work", label: "Work", icon: GitPullRequest },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OperationsNav() {
  const pathname = usePathname();

  return (
    <header className="real-topbar">
      <Link className="real-brand" href="/">
        <Image src="/agent.elixpo.png" alt="elixpoo" width={38} height={38} priority />
        <span><strong>OreoFlow</strong><small>GitHub operations building</small></span>
      </Link>
      <nav className="real-nav" aria-label="Operations">
        {links.map(({ href, label, icon: Icon }) => (
          <Link className={active(pathname, href) ? "real-nav-active" : ""} href={href} key={href}>
            <Icon size={17} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <span className="github-source"><Radio size={15} /><span>GitHub source</span></span>
    </header>
  );
}
