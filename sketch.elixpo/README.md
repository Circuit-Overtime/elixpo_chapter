# LixSketch - Built by a Genz 🚀

<img width="1866" height="886" alt="image" src="https://github.com/user-attachments/assets/a0b93c41-32ce-44a1-ac37-4c3f9eb555cd" />

> It was one of the most favourite projects of mine while development. It took me 11 months to come to the stage where I can write the README and product my mvp - [LixSketch](https://sketch.elixpo.com)


<div align="center">

<img src="https://sketch.elixpo.com/Images/logo.png" alt="LixSketch Logo" width="80" />


An open-source freemium platform for collaborative canvas — technical presentations, modelling, wireframes, and more.

[![GitHub Stars](https://img.shields.io/github/stars/elixpo/sketch.elixpo?style=for-the-badge&logo=github&color=5B57D1&labelColor=1a1a2e)](https://github.com/elixpo/sketch.elixpo/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/elixpo/sketch.elixpo?style=for-the-badge&logo=github&color=8B88E8&labelColor=1a1a2e)](https://github.com/elixpo/sketch.elixpo/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/elixpo/sketch.elixpo?style=for-the-badge&logo=github&color=c873e4&labelColor=1a1a2e)](https://github.com/elixpo/sketch.elixpo/issues)
[![License](https://img.shields.io/github/license/elixpo/sketch.elixpo?style=for-the-badge&color=4A90D9&labelColor=1a1a2e)](./LICENSE)

[![Website](https://img.shields.io/badge/Website-sketch.elixpo.com-5B57D1?style=flat-square&logo=googlechrome&logoColor=white)](https://sketch.elixpo.com)
[![Docs](https://img.shields.io/badge/Docs-LixScript-8B88E8?style=flat-square&logo=bookstack&logoColor=white)](https://sketch.elixpo.com/docs)
[![npm](https://img.shields.io/npm/v/@elixpo/lixsketch?style=flat-square&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/@elixpo/lixsketch)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=elixpo.lixsketch)

</div>


### LixSketch is an open source freemium platfor for collaborative canvas for technical presentation / modelling on web + IDE + pwa (under development)

<img width="1322" height="612" alt="og-image" src="https://github.com/user-attachments/assets/a96e85be-dce9-464c-8451-5513ad521dd6" />

## Why LixSketch?

LixSketch offers technical / professional proficiency in quick canvases used for any technical interview, presentation, workshop, or classroom in a collaborative fashion — sharable with anyone at any time in a matter of a click.

<img width="1867" height="874" alt="image" src="https://github.com/user-attachments/assets/9971cf94-dba8-4436-b858-4d80e99b246d" />

## What Makes LixSketch Stand Out

| | Feature |
|---|---|
| 🔓 | **No login required** — start drawing instantly as a guest |
| 🎁 | **Generous freemium model** — powerful tools at zero cost |
| 📜 | **LixScript** — our own [diagram scripting language](https://sketch.elixpo.com/docs) |
| 🧩 | **All-in-one workspace** — combines Excalidraw + TLDraw + Eraser.io |
| 🛡️ | **E2E encrypted sharing** — your data stays yours |
| 📂 | **Open Source** — MIT licensed, built in public |
| ⚡ | **Fast & free** — generous guest mode, no paywall |

<img width="1858" height="884" alt="image" src="https://github.com/user-attachments/assets/de4565a2-c6b5-4392-8de2-e76b6b1f5c1e" />

## Use LixSketch Everywhere

<div align="center">

| | Platform | Description |
|---|---|---|
| 🌐 | **[Web App](https://sketch.elixpo.com)** | Full collaborative canvas in the browser |
| 🖥️ | **[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=elixpo.lixsketch)** | Draw diagrams right inside your editor — open any `.lixsketch` file |
| 📦 | **[NPM Package](https://www.npmjs.com/package/@elixpo/lixsketch)** | Embed the engine in your own app with `npm install @elixpo/lixsketch` |

</div>

### VS Code Extension

Draw diagrams, sketch ideas, and build visual documents — without leaving your editor. Just create a `.lixsketch` file and start drawing.

```
ext install elixpo.lixsketch
```

<img width="1866" height="886" alt="LixSketch VS Code Extension" src="./packages/vscode/media/vs-code-etension-hero.png" />

### NPM Package

Build your own whiteboard, diagramming tool, or collaborative canvas with a few lines of code.

```bash
npm install @elixpo/lixsketch
```

```javascript
import { createSketchEngine, TOOLS } from '@elixpo/lixsketch';

const engine = createSketchEngine(svgElement);
await engine.init();
engine.setActiveTool(TOOLS.RECTANGLE);
```

Full API docs and examples in the [engine README](./packages/lixsketch/README.md).

## Tech Stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000?style=flat-square&logo=nextdotjs&logoColor=white)
![RoughJS](https://img.shields.io/badge/RoughJS-333?style=flat-square&logo=javascript&logoColor=F7DF1E)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![D1](https://img.shields.io/badge/D1_Database-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=flat-square&logo=react&logoColor=white)

</div>

## Documentation

We have a dedicated section for our [LixSketch Docs](https://sketch.elixpo.com/docs) with a rich definition on how we implemented our architecture and product in the open source with security and transparency.

<img width="1861" height="863" alt="image" src="https://github.com/user-attachments/assets/03130310-9ebb-4916-b0af-ee1c3c78ec60" />

## Contributing

This is an open source project! If you find bugs on the platform, please let us know from the [Issues Tab](https://github.com/elixpo/sketch.elixpo/issues). We'd love to solve them for a smooth user experience.

<img width="1866" height="877" alt="image" src="https://github.com/user-attachments/assets/a0c53df1-86bb-47f9-a062-1b8dee0999f6" />


## Star History

<div align="center">

<a href="https://star-history.com/#elixpo/sketch.elixpo&Timeline">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=elixpo/sketch.elixpo&type=Timeline&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=elixpo/sketch.elixpo&type=Timeline" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=elixpo/sketch.elixpo&type=Timeline&theme=dark" width="700" />
  </picture>
</a>

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20,24&height=120&section=footer&fontSize=0" width="100%" />

### Made with ❤️ by [Elixpo](https://elixpo.com) | [GitHub](https://github.com/elixpo/sketch.elixpo)

</div>
