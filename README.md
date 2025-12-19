# Transcription Pro

A transcription application built with Electron, React, and TypeScript.

## Tech Stack

- **Electron** - Cross-platform desktop application framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Tone.js** - Web Audio framework

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

This will start both the React dev server and Electron app.

### Building

Build the application:

```bash
npm run build
npm run build:electron
```

## Git Workflow

This project uses a Git Flow workflow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches branched from `develop`

### Creating a Feature Branch

```bash
git checkout develop
git checkout -b feature/your-feature-name
```

## Project Structure

```
├── src/
│   ├── main/          # Electron main process
│   │   ├── main.ts    # Main entry point
│   │   └── preload.ts # Preload script
│   ├── App.tsx        # React root component
│   ├── main.tsx       # React entry point
│   └── index.css      # Global styles
├── dist/              # Build output
└── package.json       # Dependencies and scripts
```

## License

MIT

