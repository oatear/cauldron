import { Injectable, signal, computed, inject } from '@angular/core';
import { Block, BlockType } from '../types';
import { CssStylesheetStore } from './css-stylesheet.store';

// Beige paper background with hand-drawn mountains and sun
const DEFAULT_IMAGE_DATA_URI = `data:image/svg+xml,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23e3d6c4%22%2F%3E%3Cpath%20d%3D%22M20%20160%20L70%2060%20L120%20160%22%20stroke%3D%22%232c1810%22%20stroke-width%3D%223%22%20fill%3D%22none%22%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M90%20160%20L140%2080%20L190%20160%22%20stroke%3D%22%232c1810%22%20stroke-width%3D%223%22%20fill%3D%22none%22%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%22150%22%20cy%3D%2250%22%20r%3D%2220%22%20stroke%3D%22%232c1810%22%20stroke-width%3D%223%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E`;

@Injectable({
  providedIn: 'root'
})
export class TemplateStore {
  // Initial state with a root card
  private initialRoot: Block = {
    id: 'root',
    type: 'container',
    name: 'Card Root',
    cssClass: 'block-root',
    children: [
      {
        id: 'header-container',
        type: 'container',
        name: 'Header',
        cssClass: 'block-header-container',
        content: '',
        children: [
          {
            id: 'card-title',
            type: 'text',
            name: 'Title',
            cssClass: 'block-card-title',
            content: 'Glorious Wizard',
            children: []
          },
          {
            id: 'mana-badge',
            type: 'badge',
            name: 'Cost',
            cssClass: 'block-mana-badge',
            content: '5',
            children: []
          }
        ],
        expanded: true
      },
      {
        id: 'card-art',
        type: 'image',
        name: 'Art',
        cssClass: 'block-card-art',
        content: DEFAULT_IMAGE_DATA_URI,
        children: [],
        expanded: true
      },
      {
        id: 'card-body',
        type: 'textarea',
        name: 'Effect Text',
        cssClass: 'block-card-body',
        content: 'When this card enters the battlefield, search your library for an arcane spell and add it to your hand.\n\n"Magic is simply the art of knowing what to ask for."',
        children: [],
        expanded: true
      },
      {
        id: 'footer-container',
        type: 'container',
        name: 'Footer',
        cssClass: 'block-footer-container',
        content: '',
        children: [
          {
            id: 'set-icon',
            type: 'image',
            name: 'Set Icon',
            cssClass: 'block-set-icon',
            content: DEFAULT_IMAGE_DATA_URI,
            children: []
          },
          {
            id: 'flavor-text',
            type: 'text',
            name: 'Flavor',
            cssClass: 'block-flavor-text',
            content: 'Only the brave dare gaze into the void.',
            children: []
          },
          {
            id: 'rarity-badge',
            type: 'badge',
            name: 'Rarity',
            cssClass: 'block-rarity-badge',
            content: '',
            children: []
          }
        ],
        expanded: true
      }
    ],
    content: '',
    isRoot: true,
    expanded: true
  };

  rootBlock = signal<Block>(this.initialRoot);
  selectedBlockId = signal<string | null>('root');
  draggingBlockId = signal<string | null>(null);

  setDraggingBlockId(id: string | null) {
    this.draggingBlockId.set(id);
  }

  selectedBlock = computed(() => {
    const id = this.selectedBlockId();
    if (!id) return null;
    return this.findBlock(this.rootBlock(), id);
  });

  snapGuides = signal<{ x: number | null, y: number | null }>({ x: null, y: null });

  setSnapGuides(guides: { x: number | null, y: number | null }) {
    this.snapGuides.set(guides);
  }

  // Drag and Drop Global State
  activeDropTarget = signal<{ id: string, position: 'inside' | 'top' | 'bottom' } | null>(null);

  setDropTarget(target: { id: string, position: 'inside' | 'top' | 'bottom' } | null) {
    this.activeDropTarget.set(target);
  }

  clearDropTarget() {
    this.activeDropTarget.set(null);
  }

  cssStore = inject(CssStylesheetStore);
  editorMode = signal<'gui' | 'code'>('gui');

  constructor() {
    this.initializeDefaultStyles();
  }

  private initializeDefaultStyles() {
    const defaultCss = `
.block-root { display: flex; flex-direction: column; width: 825px; height: 1125px; background-color: #baa791; padding: 40px; overflow: hidden; border: 2px solid black; border-radius: 12px; box-shadow: 0 0 15px rgba(0,0,0,0.1); gap: 20px; }
.block-header-container { display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; height: auto; padding: 0 10px; }
.block-card-title { font-size: 42px; font-weight: bold; color: #2c1810; text-transform: uppercase; letter-spacing: 2px; font-family: "Patrick Hand", cursive; }
.block-mana-badge { font-size: 32px; font-weight: bold; color: #2c1810; background-color: #baa791; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 2px 2px 2px rgba(0,0,0,0.2); border: 2px solid black; font-family: "Patrick Hand", cursive; }
.block-card-art { width: 100%; flex: 1; background-color: #d8c8b0; background-size: cover; background-position: center; border-radius: 12px; border: 2px solid black; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); }
.block-card-body { width: 100%; min-height: 200px; background-color: #a79179; border: 2px solid black; border-radius: 12px; padding: 20px; font-size: 24px; line-height: 1.5; color: #2c1810; font-family: "Patrick Hand", cursive; }
.block-footer-container { display: flex; flex-direction: row; align-items: center; width: 100%; gap: 15px; padding: 10px 0; }
.block-set-icon { width: 40px; height: 40px; border-radius: 50%; background-color: #2c1810; border: none; background-size: cover; background-position: center; }
.block-flavor-text { font-size: 18px; font-style: italic; color: #4e342e; flex: 1; font-family: "Patrick Hand", cursive; }
.block-rarity-badge { width: 20px; height: 20px; border-radius: 50%; background-color: #baa791; border: 1px solid black; font-family: "Patrick Hand", cursive; }
`;
    this.cssStore.parseFromCss(defaultCss);
  }

  // Recursive finder
  findBlock(current: Block, id: string): Block | null {
    if (current.id === id) return current;
    for (const child of current.children) {
      const found = this.findBlock(child, id);
      if (found) return found;
    }
    return null;
  }

  // Recursive parent finder
  findParent(current: Block, id: string): Block | null {
    if (current.children.some(c => c.id === id)) return current;
    for (const child of current.children) {
      const found = this.findParent(child, id);
      if (found) return found;
    }
    return null;
  }

  selectBlock(id: string | null) {
    this.selectedBlockId.set(id);
  }

  updateBlock(id: string, updates: Partial<Block>) {
    const root = structuredClone(this.rootBlock());
    const target = this.findBlock(root, id);
    if (target) {
      Object.assign(target, updates);
      this.rootBlock.set(root);
    }
  }

  updateStyles(id: string, styles: Record<string, string | number>) {
    const root = this.rootBlock();
    const target = this.findBlock(root, id);
    if (target) {
      for (const [key, value] of Object.entries(styles)) {
        this.cssStore.setProperty('.' + target.cssClass, key, String(value));
      }
    }
  }

  addBlock(parentId: string, type: BlockType, initialStyles: Record<string, string | number> = {}) {
    this.insertBlock(parentId, -1, type, initialStyles);
  }

  insertBlock(parentId: string, index: number, type: BlockType, initialStyles: Record<string, string | number> = {}) {
    const root = structuredClone(this.rootBlock());
    const parent = this.findBlock(root, parentId);

    if (parent) {
      let defaultContent = 'New Block';
      if (type === 'image') {
        defaultContent = DEFAULT_IMAGE_DATA_URI;
      } else if (type === 'badge') {
        defaultContent = '1';
      } else if (type === 'container') {
        defaultContent = '';
      }

      const id = crypto.randomUUID();
      const cssClass = `block-${type}-${id.substring(0, 8)}`;
      
      const newBlock: Block = {
        id,
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        cssClass,
        children: [],
        content: defaultContent,
        expanded: true
      };

      const defaultStyles = { ...this.getDefaultStyles(type), ...initialStyles };
      for (const [k, v] of Object.entries(defaultStyles)) {
        this.cssStore.setProperty('.' + cssClass, k, String(v));
      }

      if (index === -1 || index >= parent.children.length) {
        parent.children.push(newBlock);
      } else {
        parent.children.splice(index, 0, newBlock);
      }

      this.rootBlock.set(root);
      this.selectedBlockId.set(newBlock.id);
    }
  }

  deleteBlock(id: string) {
    if (id === 'root') return; // Cannot delete root
    const root = structuredClone(this.rootBlock());
    const parent = this.findParent(root, id);
    if (parent) {
      parent.children = parent.children.filter(c => c.id !== id);
      this.rootBlock.set(root);
      this.selectedBlockId.set(parent.id);
    }
  }

  // Basic Drag and Drop (Reparenting/Reordering)
  moveBlock(dragId: string, targetId: string, position: 'inside' | 'before' | 'after') {
    if (dragId === targetId || dragId === 'root') return;

    const root = structuredClone(this.rootBlock());

    // 1. Remove from old parent
    const oldParent = this.findParent(root, dragId);
    if (!oldParent) return;

    const blockToMove = oldParent.children.find(c => c.id === dragId);
    if (!blockToMove) return;

    // Prevent moving a parent into its own child
    if (this.isDescendant(blockToMove, targetId)) return;

    oldParent.children = oldParent.children.filter(c => c.id !== dragId);

    // 2. Add to new location
    if (position === 'inside') {
      const target = this.findBlock(root, targetId);
      if (target) {
        target.children.push(blockToMove);
        target.expanded = true;
      }
    } else {
      const newParent = this.findParent(root, targetId);
      if (newParent) {
        const targetIndex = newParent.children.findIndex(c => c.id === targetId);
        if (targetIndex !== -1) {
          const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
          newParent.children.splice(insertIndex, 0, blockToMove);
        }
      }
    }

    this.rootBlock.set(root);
  }

  isDescendant(parent: Block, childId: string): boolean {
    if (parent.children.some(c => c.id === childId)) return true;
    return parent.children.some(c => this.isDescendant(c, childId));
  }

  getDefaultStyles(type: BlockType): Record<string, string | number> {
    const base = {
      boxSizing: 'border-box',
    };

    switch (type) {
      case 'container':
        return {
          ...base,
          display: 'flex',
          flexDirection: 'row',
          padding: '10px',
          gap: '10px',
          minHeight: '50px',
          border: '2px solid black',
          borderRadius: '12px',
          backgroundColor: '#baa791'
        };
      case 'text':
        return {
          ...base,
          fontSize: '16px',
          color: '#2c1810',
          padding: '5px',
          fontFamily: '"Patrick Hand", cursive'
        };
      case 'textarea':
        return {
          ...base,
          fontSize: '14px',
          color: '#2c1810',
          padding: '10px',
          backgroundColor: '#a79179',
          borderRadius: '12px',
          minHeight: '60px',
          border: '2px solid black',
          fontFamily: '"Patrick Hand", cursive'
        };
      case 'badge':
        return {
          ...base,
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#2c1810',
          backgroundColor: '#baa791',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          boxShadow: '2px 2px 2px rgba(0,0,0,0.2)',
          border: '2px solid black',
          fontFamily: '"Patrick Hand", cursive'
        };
      case 'image':
        return {
          ...base,
          width: '100px',
          height: '100px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '12px',
          border: '2px solid black'
        };
      default:
        return base;
    }
  }

  generateHtml(block: Block, indent = 0): string {
    const spaces = '  '.repeat(indent);
    
    const tagName = block.tagName || 'div';
    
    // Build class string
    let classes = block.cssClass;
    if (block.extraClasses && block.extraClasses.length > 0) {
      classes += ' ' + block.extraClasses.join(' ');
    }

    // Build attributes string
    let attrStr = '';
    if (block.attributes) {
      attrStr = Object.entries(block.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('');
    }

    let html = `${spaces}<${tagName} class="${classes}"${attrStr}>`;

    if (block.type === 'image' || tagName === 'img') {
      if (tagName === 'img') {
          html = `${spaces}<img class="${classes}"${attrStr} />\n`;
      } else {
          html += `</${tagName}>\n`;
      }
    } else {
      if (block.innerHTML) {
         html += `\n${spaces}  ${block.innerHTML}\n`;
      } else if (block.content) {
         html += `\n${spaces}  ${block.content}\n`;
      }
      
      if (block.children.length > 0) {
        html += '\n' + block.children.map(c => this.generateHtml(c, indent + 1)).join('');
        html += `${spaces}</${tagName}>\n`;
      } else if (!block.content && !block.innerHTML) {
        html += `</${tagName}>\n`;
      } else {
        html += `${spaces}</${tagName}>\n`;
      }
    }
    return html;
  }

  camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  // Context Menu State
  contextMenu = signal<{ isVisible: boolean; x: number; y: number; blockId: string | null }>({
    isVisible: false,
    x: 0,
    y: 0,
    blockId: null
  });

  openContextMenu(x: number, y: number, blockId: string) {
    this.contextMenu.set({ isVisible: true, x, y, blockId });
    this.selectedBlockId.set(blockId); // Also select the block
  }

  closeContextMenu() {
    this.contextMenu.update(current => ({ ...current, isVisible: false }));
  }

  toggleBlockPositioning(blockId: string) {
    const root = this.rootBlock();
    const block = this.findBlock(root, blockId);

    if (block) {
      const styles = this.cssStore.getBlockStyles(block.cssClass);
      if (styles['position'] === 'absolute') {
        this.cssStore.setProperty('.' + block.cssClass, 'position', '');
        this.cssStore.setProperty('.' + block.cssClass, 'top', '');
        this.cssStore.setProperty('.' + block.cssClass, 'left', '');
        this.cssStore.setProperty('.' + block.cssClass, 'right', '');
        this.cssStore.setProperty('.' + block.cssClass, 'bottom', '');
      } else {
        this.cssStore.setProperty('.' + block.cssClass, 'position', 'absolute');
        this.cssStore.setProperty('.' + block.cssClass, 'top', '0px');
        this.cssStore.setProperty('.' + block.cssClass, 'left', '0px');
      }
    }
    this.closeContextMenu();
  }

  resetBlockSizing(id: string) {
    const root = this.rootBlock();
    const block = this.findBlock(root, id);

    if (block) {
      const defaults = this.getDefaultStyles(block.type);

      const resetProp = (prop: string) => {
        if (defaults[prop] !== undefined) {
          this.cssStore.setProperty('.' + block.cssClass, prop, String(defaults[prop]));
        } else {
          this.cssStore.setProperty('.' + block.cssClass, prop, '');
        }
      };

      resetProp('width');
      resetProp('height');
      resetProp('minWidth');
      resetProp('minHeight');
      resetProp('maxWidth');
      resetProp('maxHeight');
    }
    this.closeContextMenu();
  }

  duplicateBlock(id: string) {
    if (id === 'root') return;
    const root = structuredClone(this.rootBlock());
    const parent = this.findParent(root, id);

    if (parent) {
      const originalBlockIndex = parent.children.findIndex(c => c.id === id);
      if (originalBlockIndex === -1) return;

      const originalBlock = parent.children[originalBlockIndex];
      const newBlock = this.cloneBlockWithNewIds(originalBlock);

      // Add (Copy) to the name
      newBlock.name = `${newBlock.name} (Copy)`;

      // If absolute, offset slightly
      const originalStyles = this.cssStore.getBlockStyles(originalBlock.cssClass);
      if (originalStyles['position'] === 'absolute') {
        const top = parseFloat(String(originalStyles['top'] || 0));
        const left = parseFloat(String(originalStyles['left'] || 0));
        if (!isNaN(top) && !isNaN(left)) {
          this.cssStore.setProperty('.' + newBlock.cssClass, 'top', `${top + 20}px`);
          this.cssStore.setProperty('.' + newBlock.cssClass, 'left', `${left + 20}px`);
        }
      }

      // Insert after original
      parent.children.splice(originalBlockIndex + 1, 0, newBlock);

      this.rootBlock.set(root);
      this.selectedBlockId.set(newBlock.id);
    }
    this.closeContextMenu();
  }

  private cloneBlockWithNewIds(block: Block): Block {
    const clone = structuredClone(block);
    clone.id = crypto.randomUUID();
    clone.cssClass = `block-${clone.type}-${clone.id.substring(0, 8)}`;
    
    // Clone styles in CSS store
    const oldStyles = this.cssStore.getBlockStyles(block.cssClass);
    for (const [k, v] of Object.entries(oldStyles)) {
      this.cssStore.setProperty('.' + clone.cssClass, k, String(v));
    }
    
    clone.children = clone.children.map(child => this.cloneBlockWithNewIds(child));
    return clone;
  }

  parseHtmlToBlocks(html: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // The body should contain exactly one root element for a card template
    const rootElement = doc.body.firstElementChild;
    if (!rootElement) return;

    const newRoot = this.parseElementToBlock(rootElement as HTMLElement, true);
    if (newRoot) {
      this.rootBlock.set(newRoot);
    }
  }

  private parseElementToBlock(el: HTMLElement, isRoot = false): Block {
    // Determine identity
    let id = crypto.randomUUID();
    let type: BlockType = 'generic';
    let cssClass = '';
    let extraClasses: string[] = [];

    // Check existing classes to preserve identity
    for (let i = 0; i < el.classList.length; i++) {
      const cls = el.classList[i];
      if (cls.startsWith('block-') && !cssClass) {
        cssClass = cls;
        
        // Try to infer type from class structure (e.g. block-container-...)
        const parts = cls.split('-');
        if (parts.length >= 2) {
          const inferredType = parts[1] as BlockType;
          if (['container', 'text', 'textarea', 'image', 'badge', 'generic'].includes(inferredType)) {
            type = inferredType;
          }
        }
      } else {
        extraClasses.push(cls);
      }
    }

    if (!cssClass) {
      cssClass = `block-${type}-${id.substring(0, 8)}`;
    } else {
      // If we found an existing ID, we try to extract it from the end
      const parts = cssClass.split('-');
      if (parts.length >= 3) {
        id = parts.slice(2).join('-');
      }
    }

    // Determine Tag Name
    let tagName = el.tagName.toLowerCase();
    
    // For images, we support actual <img> tags or div with background
    if (tagName === 'img' || (type === 'image' && tagName === 'div')) {
       type = 'image';
    } else if (type === 'generic') {
      if (tagName === 'div') type = 'container';
      if (['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) type = 'text';
    }

    // Determine Content
    let content = '';
    let innerHTML = '';
    let children: Block[] = [];

    if (tagName === 'img') {
      content = (el as HTMLImageElement).src || DEFAULT_IMAGE_DATA_URI;
    } else {
      // If element has any children (text or elements), parse them
      if (el.childNodes.length > 0) {
         let hasElements = false;
         
         Array.from(el.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
               hasElements = true;
               const childBlock = this.parseElementToBlock(node as HTMLElement);
               if (childBlock) children.push(childBlock);
            } else if (node.nodeType === Node.TEXT_NODE) {
               const text = node.textContent?.trim();
               if (text) {
                  // Create a text block for it
                  children.push({
                     id: crypto.randomUUID(),
                     type: 'text',
                     name: 'Text Node',
                     cssClass: `block-text-${crypto.randomUUID().substring(0, 8)}`,
                     content: node.textContent || '', // Keep original whitespace
                     children: [],
                     expanded: true
                  });
               }
            }
         });
         
         // If it was just one text node, simplify by making it the parent's content
         if (!hasElements && children.length === 1 && children[0].type === 'text') {
            content = children[0].content;
            children = [];
         }
      }
    }

    // Attributes
    const attributes: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name !== 'class' && attr.name !== 'style') {
        attributes[attr.name] = attr.value;
      }
    }

    return {
      id,
      type,
      name: `${tagName} Element`,
      cssClass,
      extraClasses: extraClasses.length > 0 ? extraClasses : undefined,
      tagName: tagName !== 'div' ? tagName : undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      content,
      innerHTML: innerHTML ? innerHTML : undefined,
      children,
      isRoot,
      expanded: true
    };
  }
}