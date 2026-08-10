"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Building2, GitPullRequest, Layers3, Play, Radio, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Building", icon: Building2 },
  { href: "/floors", label: "Floors", icon: Layers3 },
  { href: "/runs", label: "Runs", icon: Play },
  { href: "/work", label: "Work", icon: GitPullRequest },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/security", label: "Security", icon: ShieldCheck },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  if (href === "/floors" && ["/operations", "/oreoflow", "/discussions"].includes(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OperationsNav({ repositoryUrl }: { repositoryUrl: string }) {
  const pathname = usePathname();

  return (
    <header className="real-topbar">
      <Link className="real-brand" href="/">
        <Image src="/logo.png" alt="elixpoo" width={38} height={38} priority />
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
      <a className="github-source" href={repositoryUrl} target="_blank" rel="noreferrer"><Radio size={15} /><span>GitHub source</span></a>
    </header>
  );
}
