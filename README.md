# DiagramDocs

A **read-only SVG diagram viewer** with document linking and in-app document viewing. Open a folder, view your diagram (including draw.io exports), link shapes to PDFs, Markdown, JSON, and images, and open them in tabs—all in one place.

Ideal for engineers, architects, students, and researchers who want to navigate architecture diagrams and their related docs without leaving the app.

## Features

- **Read-only diagram viewer**: Open any folder with `diagram.svg` (and optional `diagram.links.json`). Supports both custom SVG and **draw.io / diagrams.net** exported SVG.
- **Shape-to-doc linking**: Link one document per diagram element (PDF, Markdown, JSON, images). Links are stored only in `diagram.links.json`; the SVG file is never modified.
- **In-app doc viewer**: Open linked docs in VS Code–style tabs. PDF (zoom, page nav), Markdown, JSON (pretty-print, collapse), and images (zoom, pan).
- **Navigation**: Double-click a linked shape to open its doc. Right-click for link / open / change / remove. Pan with two-finger trackpad or middle-mouse drag; zoom with Ctrl/Cmd + wheel (centered on cursor).

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, click **Open folder**, and select a project folder that contains (or will contain) `diagram.svg` and `diagram.links.json`. The app looks for these at the folder root or inside `docs/`.

## Workspace layout

```
my-project/
├── diagram.svg          # Your diagram (edit in draw.io or any SVG editor)
├── diagram.links.json   # Shape/element → document links (managed by the app)
└── docs/
    ├── readme.md
    ├── spec.pdf
    └── schema.json
```

## Browser support

- **Chrome / Edge**: Full support (File System Access API for folder picker and file access).
- **Firefox / Safari**: Folder picker not supported; use a Chromium-based browser.

## Commands

| Command           | Description          |
|-------------------|----------------------|
| `npm run dev`     | Start dev server     |
| `npm run build`   | Production build     |
| `npm run preview` | Preview production   |
| `npm run lint`    | Run ESLint           |

## License

MIT © 2026 [atharvmunot004](https://github.com/atharvmunot004)
