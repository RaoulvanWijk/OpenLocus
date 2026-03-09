# OpenLocus

> **Privacy with ease — your data and AI, safe and uncompromised on your own device.**

OpenLocus is a modular, offline-first desktop application for privacy-conscious students and professionals. It combines the usability of modern productivity apps with the security guarantees of fully local software. Your data never leaves your machine — not even for AI.

## What is OpenLocus?

Modern productivity tools force you to choose between **convenience** (Notion, Google Drive) and **privacy** (self-hosted Nextcloud, encrypted drives). OpenLocus removes that trade-off.

Built for people who handle sensitive information — journalists protecting sources, researchers guarding IP, compliance officers bound by GDPR, healthcare professionals bound by medical confidentiality — OpenLocus provides:

- A clean, Markdown-based note editor (Notion-style)
- A local AI assistant that runs entirely on-device (no internet required)
- Chat with your own documents via RAG (Retrieval-Augmented Generation)
- Automatic link suggestions between notes and files
- A simple one-click installer — no terminal, no server, no account

## Installation & Requirements

### Prerequisites

| Tool                                            | Version         | Notes                                          |
| ----------------------------------------------- | --------------- | ---------------------------------------------- |
| [Node.js](https://nodejs.org/)                  | ≥ 18            | Required for the frontend toolchain            |
| [pnpm](https://pnpm.io/)                        | 9.x             | Package manager used across the monorepo       |
| [Rust](https://www.rust-lang.org/tools/install) | stable (latest) | Required by Tauri for the native desktop shell |
| Tauri system deps                               | —               | See platform notes below                       |

### Platform-specific Tauri dependencies

**macOS**

```bash
xcode-select --install
```

**Linux (Debian/Ubuntu)**

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows**

Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

Full Tauri prerequisites guide: https://tauri.app/start/prerequisites/

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/RaoulvanWijk/OpenLocus.git
cd OpenLocus

# 2. Install all dependencies
pnpm install

# 3. Start the desktop app in development mode
pnpm -F desktop tauri dev
```

> **Note:** `pnpm dev` alone only starts the frontend dev server without the Tauri/Rust backend. Always use `pnpm -F desktop tauri dev` to run the full desktop application with the native shell and backend.

### Build for production

```bash
pnpm build
# Tauri bundles are output to apps/desktop/src-tauri/target/release/bundle/
```

## Directory Structure

```
OpenLocus/
├── apps/
│   └── desktop/                  # The Tauri desktop application
│       ├── src/                  # React frontend (TypeScript)
│       │   ├── main.tsx          # App entry point
│       │   ├── router.ts         # TanStack Router setup
│       │   ├── routeTree.gen.ts  # Auto-generated route tree (do not edit)
│       │   └── routes/           # File-based page routes
│       │       ├── __root.tsx    # Root layout (nav, providers)
│       │       ├── index.tsx     # Home / notes view  →  /
│       │       └── edit.tsx      # Note editor view   →  /edit
│       ├── src-tauri/            # Rust / Tauri backend
│       │   ├── src/
│       │   │   ├── main.rs       # Tauri entry point
│       │   │   └── lib.rs        # Tauri commands & plugin registration
│       │   ├── Cargo.toml        # Rust dependencies
│       │   └── tauri.conf.json   # App metadata, permissions, window config
│       ├── public/               # Static assets served by Vite
│       ├── index.html            # HTML shell
│       ├── vite.config.ts        # Vite + Tauri + Tailwind config
│       └── package.json
│
├── packages/
│   ├── ui/                       # Shared React component library
│   │   └── src/
│   │       ├── components/       # Reusable UI components (Button, Input, …)
│   │       ├── hooks/            # Shared React hooks
│   │       ├── lib/utils.ts      # Utility helpers (cn, etc.)
│   │       └── styles/globals.css  # Global Tailwind base styles
│   ├── eslint-config/            # Shared ESLint configurations
│   │   ├── base.js               # Base rules
│   │   ├── react-internal.js     # React-specific rules
│   │   └── tauri.js              # Tauri-specific rules
│   └── typescript-config/        # Shared tsconfig presets
│       ├── base.json
│       ├── tauri.json            # Presest for Tauri apps
│       └── react-library.json    # Used by packages/ui
│
├── turbo.json                    # Turborepo pipeline config (build/dev/lint order)
├── pnpm-workspace.yaml           # Declares monorepo workspaces
├── package.json                  # Root scripts & shared devDependencies
├── CONTRIBUTING.md               # Developer guide
└── README.md                     # This file
```

### Where to find things

| I want to…                              | Go to…                                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new page / route                  | `apps/desktop/src/routes/` — create a new `.tsx` file; TanStack Router auto-generates the route tree                                                                                     |
| Edit the root layout or navigation      | `apps/desktop/src/routes/__root.tsx`                                                                                                                                                     |
| Add a shadcn/ui component               | `cd apps/desktop` then run `pnpm dlx shadcn@latest add <component>` (e.g. `button`, `input`, `dialog`). The component lands in `apps/desktop/src/components/ui/` and is ready to import. |
| Add a Tauri backend command (Rust)      | `apps/desktop/src-tauri/src/lib.rs`                                                                                                                                                      |
| Change window title, icons, permissions | `apps/desktop/src-tauri/tauri.conf.json`                                                                                                                                                 |
| Change Rust dependencies                | `apps/desktop/src-tauri/Cargo.toml`                                                                                                                                                      |
| Change frontend dependencies            | `apps/desktop/package.json`                                                                                                                                                              |
| Update shared lint rules                | `packages/eslint-config/`                                                                                                                                                                |
| Update shared TypeScript config         | `packages/typescript-config/`                                                                                                                                                            |

## Tech Stack

| Layer                  | Technology                                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| Desktop shell          | [Tauri v2](https://tauri.app/) (Rust)                                             |
| Frontend framework     | [React 19](https://react.dev/)                                                    |
| Routing                | [TanStack Router v1](https://tanstack.com/router)                                 |
| Styling                | [Tailwind CSS v4](https://tailwindcss.com/)                                       |
| Component primitives   | [shadcn/ui](https://ui.shadcn.com/)                                               |
| Build tool             | [Vite](https://vitejs.dev/)                                                       |
| Monorepo orchestration | [Turborepo](https://turbo.build/) + [pnpm workspaces](https://pnpm.io/workspaces) |
| Language               | TypeScript (frontend) + Rust (backend)                                            |

## Contributing

For guidelines on branching, commits, code style and pull requests, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the MIT License — see [LICENSE.md](LICENSE.md) for details.
