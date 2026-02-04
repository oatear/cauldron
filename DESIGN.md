# Cauldron Design: Bidirectional GUI & Code Editing

This document outlines the architecture of Cauldron, specifically how the visual GUI and the raw HTML/CSS code editors work together in a lossless, bidirectional manner.

## Core Philosophy: CSS-as-Source-of-Truth

The central architectural decision in Cauldron is that **CSS is the source of truth for styling**. Unlike simpler editors that store styles as JSON objects (inline styles), Cauldron manages a real CSS stylesheet.

### Advantages
1.  **Full CSS Support**: Since we use real CSS, we can support pseudo-classes (`:hover`, `:active`), animations (`@keyframes`), and media queries that would be difficult to represent in a rigid JSON model.
2.  **Lossless Round-Trip**: Manual edits in code mode (like adding a custom class or a complex selector) are preserved when returning to GUI mode.
3.  **Compatibility**: The output is standard HTML/CSS, directly compatible with existing web tools and the Cider card rendering pipeline.

---

## Architectural Components

### 1. `CssStylesheetStore`
This service acts as the canonical source for all styling rules.
-   **Structured Rules**: Rules targeting `.block-*` classes are parsed into structured objects for the GUI to consume and edit.
-   **Global CSS**: Any CSS that doesn't fit the simple `.block-*` pattern (e.g., global resets, complex selectors, at-rules) is kept in a `globalCss` buffer.
-   **Normalization**: All property names are normalized to kebab-case (e.g., `background-color`) to ensure consistency between the browser's CSSOM and the GUI inputs.
-   **Dynamic Injection**: The store automatically manages a `<style>` tag in the document head, ensuring the preview is always in sync with the state.

### 2. `TemplateStore`
Manages the structural "Block Tree".
-   **Block Model**: Each block has a unique ID, a `cssClass` mapping to the stylesheet, and optional attributes/innerHTML.
-   **HTML Generation**: Recursively generates clean, indented HTML from the block tree.
-   **HTML Parsing**: Uses `DOMParser` to reconstruct the block tree from raw HTML. It uses the `block-*` class names to re-identify and map elements back to their structured counterparts.

---

## Bidirectional Workflow

### GUI → Code (Generation)
1.  The `TemplateStore` traverses the block tree and generates an HTML string.
2.  The `CssStylesheetStore` serializes all structured rules and the `globalCss` buffer into a CSS string.
3.  The result is presented in the `CodeEditorComponent`.

### Code → GUI (Parsing)
1.  **CSS Parsing**: The `CssStylesheetStore` uses a hidden `<style>` element and the browser's CSSOM to parse the CSS string. Rules matching `.block-*` selectors are structured; everything else is moved to `globalCss`.
2.  **HTML Parsing**: The `TemplateStore` parses the HTML string.
    -   Elements with `block-*` classes are converted back into specific Block types.
    -   **Identity Preservation**: By looking for existing `block-*` classes, the system preserves block IDs, ensuring they stay linked to their styles.
    -   **Handlebars & Mixed Content**: The parser iterates through `childNodes` (including text nodes) to ensure Handlebars expressions (`{{#each ...}}`) and other text nodes are preserved between elements.

---

## Technical Details

### Handling Property Casing
The GUI property panel typically uses camelCase (`backgroundColor`), while CSS uses kebab-case (`background-color`). The `CssStylesheetStore` handles this by automatically converting all keys to kebab-case during `setProperty` and `getRule` operations.

### Preservation of "Loose" Code
Because the parser only tries to "understand" elements that it can map to blocks, any custom HTML tags or attributes that don't fit the standard types are preserved in the `attributes` and `tagName` properties of a `generic` block. This ensures that the user's manual code refinements are never stripped away by the GUI.
