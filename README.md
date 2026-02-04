# Cauldron - Card Template Editor

Cauldron is a powerful, bidirectional card template editor designed for building game cards using HTML and CSS. It allows designers to flip seamlessly between a visual GUI editor and direct code editing without losing data or styling integrity.

## Prerequisites

- **Node.js**: Version 18 or later is recommended.
- **npm**: Comes with Node.js.

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run start
    ```
    This will start a Vite development server (typically at `http://localhost:5173`).

3.  **Build for production**:
    ```bash
    npm run build
    ```
    The production build will be available in the `dist` directory.

## Features

- **Bidirectional Editing**: Switch between a drag-and-drop GUI and an HTML/CSS code editor.
- **CSS-as-Source-of-Truth**: All styling is managed via a centralized CSS engine, supporting advanced features like `:hover`, `@keyframes`, and media queries.
- **Lossless Round-Trip**: Manual code edits are accurately parsed back into the visual block tree.
- **Handlebars Support**: Seamless integration for dynamic card data.

## Documentation

- [Design Architecture (DESIGN.md)](DESIGN.md) - Deep dive into how the bidirectional editing and CSS engine work.
