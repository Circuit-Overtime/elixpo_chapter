# Teams & Collaboration

LixSketch is built for teams who think visually. Share a canvas link and everyone can draw together in real time — no accounts, no setup.

## How Real-Time Collaboration Works

When multiple people open the same canvas URL, they're connected through a **WebSocket room** powered by Cloudflare Durable Objects. Every action — drawing a shape, moving an element, typing text — is broadcast to all participants instantly.

```lixscript
// Collaboration Architecture
$blue = #4A90D9
$green = #2ECC71
$purple = #9B59B6
$orange = #E67E22
$gray = #e0e0e0

rect user1 at 50, 50 size 130x50 {
  stroke: $blue
  label: "User A"
}

rect user2 at 50, 170 size 130x50 {
  stroke: $blue
  label: "User B"
}

rect user3 at 50, 290 size 130x50 {
  stroke: $blue
  label: "User C"
}

rect worker at 260, 170 size 160x50 {
  stroke: $purple
  label: "Durable Object"
}

rect state at 480, 170 size 140x50 {
  stroke: $green
  label: "Room State"
}

arrow a1 from user1.right to worker.left {
  stroke: $gray
  label: "WebSocket"
}

arrow a2 from user2.right to worker.left {
  stroke: $gray
  label: "WebSocket"
}

arrow a3 from user3.right to worker.left {
  stroke: $gray
  label: "WebSocket"
}

arrow a4 from worker.right to state.left {
  stroke: $gray
  label: "Sync"
}
```

## What Gets Synced

During a collaboration session, participants see:

- **Live cursors** — colored cursor positions for each participant, updated in real time
- **Shape creation** — new shapes appear as they're drawn
- **Shape modifications** — moves, resizes, rotations, and property changes
- **Text edits** — text content updates as they're typed
- **Deletions** — elements disappear for everyone when deleted
- **Undo/redo** — each participant has their own undo stack

## Starting a Team Session

1. **Open a canvas** — visit any canvas URL or create a new one
2. **Share the URL** — send the link to your teammates via Slack, email, or any messenger
3. **Draw together** — everyone who opens the link joins the same room
4. **See cursors** — each participant gets a colored cursor with their name

That's it. No sign-up flow, no workspace creation, no invite system. Just a URL.

## How Durable Objects Work

Each collaboration room runs as an isolated **Cloudflare Durable Object** — a single-threaded, globally unique instance that:

- **Lives at the edge** — the room runs in the Cloudflare data center closest to the first participant
- **Handles all messages** — every WebSocket message goes through this single instance, ensuring consistency
- **Manages state** — tracks connected participants, cursor positions, and scene state
- **Cleans up** — when all participants disconnect, the room is garbage collected

This architecture means:

- **No conflicts** — a single authority manages all state transitions
- **Low latency** — edge deployment puts the room close to participants
- **No persistence overhead** — nothing is stored after the session ends
- **Automatic scaling** — each room is independent, so thousands can run in parallel

## Collaboration Best Practices

### For Architecture Reviews

- Have one person sketch the initial diagram while explaining
- Others add annotations and questions using text blocks
- Use **frames** to separate different system views (frontend, backend, infra)
- Use the **laser pointer** to highlight areas during discussion

### For Sprint Planning

- Create a frame for each sprint or epic
- Use rectangles for user stories, colored by priority
- Draw arrows to show dependencies between stories
- Everyone can drag and rearrange simultaneously

### For Brainstorming

- Start with a central topic in the middle
- Each participant branches out with their ideas
- Use **freehand drawing** for quick sketches
- Color-code by participant or theme
- No need to take turns — the infinite canvas has room for everyone

### For Design Critiques

- Drop screenshots or mockups onto the canvas using the image tool
- Annotate with arrows and text callouts
- Use different colors per reviewer
- Circle areas of concern with the freehand brush

## Sharing Permissions

When you share a canvas:

- **Edit link** — recipients can view and modify the canvas
- **View link** — recipients can see the canvas but not change it

Both share types use **E2E encryption**. The encryption key is in the URL fragment — our servers never see it.

```lixscript
// Permission Model
$blue = #4A90D9
$green = #2ECC71
$red = #E74C3C
$gray = #e0e0e0

rect owner at 180, 40 size 160x50 {
  stroke: $blue
  label: "Canvas Owner"
}

rect edit at 80, 170 size 160x50 {
  stroke: $green
  label: "Edit Access"
}

rect view at 290, 170 size 160x50 {
  stroke: $red
  label: "View Only"
}

rect actions1 at 80, 290 size 160x50 {
  stroke: $green
  label: "Draw + Modify"
}

rect actions2 at 290, 290 size 160x50 {
  stroke: $red
  label: "See + Export"
}

arrow a1 from owner.bottom to edit.top {
  stroke: $gray
  label: "Share /edit"
}

arrow a2 from owner.bottom to view.top {
  stroke: $gray
  label: "Share /view"
}

arrow a3 from edit.bottom to actions1.top {
  stroke: $gray
}

arrow a4 from view.bottom to actions2.top {
  stroke: $gray
}
```

## What's Coming for Teams

We're building dedicated team features:

- **Team workspaces** — organize canvases by project or team
- **Persistent rooms** — collaboration rooms that survive disconnects
- **Role-based access** — owner, editor, viewer roles per workspace
- **Team library** — shared components, templates, and icon sets
- **Activity feed** — see who edited what canvas and when
- **Comments** — leave threaded comments on specific elements
- **Presence indicators** — see who's currently in a workspace

## Self-Hosting for Teams

LixSketch is open source. If your team needs full control over data:

- **Fork the repo** and deploy to your own infrastructure
- **Cloudflare Workers** handles the backend — deploy with `wrangler`
- **No vendor lock-in** — standard WebSocket protocol, standard encryption
- **Custom branding** — modify the UI to match your organization

Check the GitHub repository for deployment instructions.
