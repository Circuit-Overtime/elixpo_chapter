<div align="center">

<!-- Logo & Title -->
<img src="public/base-logo.png" alt="LixBlogs Logo" width="80" />

# LixBlogs

### Write, collaborate, and publish beautifully.

A modern blogging platform with a rich block editor, AI writing assistant,<br />
real-time collaboration, and organizations — all on the edge.

<br />

<!-- Badges -->
[![Live](https://img.shields.io/badge/Live-blogs.elixpo.com-9b7bf7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://blogs.elixpo.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Circuit-Overtime/elixpo_blogs)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

<br />

<!-- Banner -->
<div align="center">
<img src="public/og-image.jpg" alt="LixBlogs Banner" width="100%" style="border-radius: 12px;" />
</div>

<br />

## What is LixBlogs?

LixBlogs is a **free, open-source blogging platform** designed for creators, developers, and teams. It gives you a beautiful writing experience with powerful tools built right in — no plugins to install, no complicated setup.

Whether you're writing a personal blog, publishing under your organization, or co-authoring with teammates in real-time, LixBlogs has you covered.

<br />

<div align="center">

| | Feature | Description |
|:---:|:---|:---|
| :sparkles: | **AI Writing Assistant** | Press `Space` on an empty line — generate text, images, and get inline suggestions |
| :jigsaw: | **Rich Block Editor** | 20+ block types — code, math equations, diagrams, embeds, tables, and more |
| :busts_in_silhouette: | **Real-Time Collaboration** | Invite co-authors and edit together with live cursors and presence |
| :office: | **Organizations & Teams** | Create orgs, assign roles, organize content into collections |
| :cloud: | **Auto-Save & Cloud Sync** | Drafts save locally and sync to the cloud — never lose a word |
| :art: | **Themes & Customization** | Light & dark modes, custom page colors, cover images, page emojis |
| :framed_picture: | **Media Uploads** | Drag & drop images, auto-compressed to WebP, tier-based storage |
| :bookmark_tabs: | **Library & Bookmarks** | Save posts, organize into collections, track reading history |

</div>

<br />

<!-- Wave separator -->
<img width="100%" src="https://capsule-render.vercel.app/api?type=wave&color=9b7bf7&height=120&section=header&text=&fontSize=0" />

## How It Works

```mermaid
graph LR
    A["🔐 Sign Up"] -->|Elixpo OAuth| B["✍️ Write"]
    B -->|Block Editor| C["🤖 AI Assist"]
    C -->|Generate & Edit| D["👥 Collaborate"]
    D -->|Real-time Sync| E["🚀 Publish"]
    E -->|blogs.elixpo.com| F["🌍 Readers"]

    style A fill:#9b7bf7,stroke:#7c5ce0,color:#fff
    style B fill:#60a5fa,stroke:#3b82f6,color:#fff
    style C fill:#c084fc,stroke:#a855f7,color:#fff
    style D fill:#4ade80,stroke:#22c55e,color:#fff
    style E fill:#f59e0b,stroke:#d97706,color:#fff
    style F fill:#f87171,stroke:#ef4444,color:#fff
```

<br />

## The Editor

The heart of LixBlogs is a **powerful block editor** that feels like writing in Notion — but built for publishing.

<div align="center">

| Block Type | What It Does |
|:---|:---|
| Paragraphs, Headings | Standard text with markdown shortcuts |
| Code Blocks | Syntax-highlighted with 100+ languages via Shiki |
| Math / Equations | LaTeX-powered with KaTeX rendering |
| Mermaid Diagrams | Flowcharts, sequence diagrams, and more |
| Images | Upload, embed URL, or **AI-generate** inline |
| Embeds | YouTube, Twitter, CodePen, and more |
| Tables | Full table support with resizable columns |
| Callouts & Quotes | Styled callout boxes and blockquotes |
| Table of Contents | Auto-generated from your headings |
| Tabs | Tabbed content sections |

</div>

<br />

## Architecture

```mermaid
graph TB
    subgraph Client ["🖥️ Client"]
        FE["Next.js 15 + React 19"]
        ED["BlockNote Editor"]
        YJS["Yjs CRDT"]
    end

    subgraph Edge ["☁️ Cloudflare Edge"]
        CF["Pages + Workers"]
        D1["D1 Database"]
        DO["Durable Objects"]
        KV["KV Cache"]
    end

    subgraph Services ["🔌 Services"]
        AI["LixSearch AI"]
        CLD["Cloudinary"]
        AUTH["Elixpo Accounts"]
    end

    FE --> CF
    ED --> YJS
    YJS -->|WebSocket| DO
    CF --> D1
    CF --> KV
    FE --> AI
    FE --> CLD
    FE --> AUTH

    style Client fill:#1a1a2e,stroke:#9b7bf7,color:#e8edf5
    style Edge fill:#1a1a2e,stroke:#60a5fa,color:#e8edf5
    style Services fill:#1a1a2e,stroke:#4ade80,color:#e8edf5
```

<br />

## Built With

<div align="center">

<table>
<tr>
<td align="center" width="120">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" width="40" /><br />
<sub><b>Next.js 15</b></sub>
</td>
<td align="center" width="120">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="40" /><br />
<sub><b>React 19</b></sub>
</td>
<td align="center" width="120">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="40" /><br />
<sub><b>Tailwind CSS</b></sub>
</td>
<td align="center" width="120">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cloudflare/cloudflare-original.svg" width="40" /><br />
<sub><b>Cloudflare</b></sub>
</td>
<td align="center" width="120">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg" width="40" /><br />
<sub><b>D1 (SQLite)</b></sub>
</td>
</tr>
</table>
</div>

<br />

## Project Activity

<div align="center">

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=Circuit-Overtime/elixpo_blogs&type=date&legend=top-left)](https://www.star-history.com/?repos=Circuit-Overtime%2Felixpo_blogs&type=date&legend=top-left)

<br />

![GitHub stars](https://img.shields.io/github/stars/Circuit-Overtime/elixpo_blogs?style=for-the-badge&color=9b7bf7&logo=github)
![GitHub forks](https://img.shields.io/github/forks/Circuit-Overtime/elixpo_blogs?style=for-the-badge&color=60a5fa&logo=github)
![GitHub issues](https://img.shields.io/github/issues/Circuit-Overtime/elixpo_blogs?style=for-the-badge&color=4ade80&logo=github)
![GitHub last commit](https://img.shields.io/github/last-commit/Circuit-Overtime/elixpo_blogs?style=for-the-badge&color=f59e0b&logo=github)

</div>

<br />

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<!-- Footer wave -->
<img width="100%" src="https://capsule-render.vercel.app/api?type=wave&color=9b7bf7&height=120&section=footer&text=&fontSize=0" />

<div align="center">

**Made with :purple_heart: by [Circuit-Overtime](https://github.com/Circuit-Overtime)**

[Website](https://blogs.elixpo.com) · [Report Bug](https://github.com/Circuit-Overtime/elixpo_blogs/issues) · [Request Feature](https://github.com/Circuit-Overtime/elixpo_blogs/issues)

</div>
