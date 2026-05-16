import { Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateStore } from './services/template.store';
import { TreeItemComponent } from './components/tree/tree-item.component';
import { PropertyPanelComponent } from './components/properties/property-panel.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { BlockType } from './types';

import { PaletteComponent } from './components/palette/palette.component';
import { ContextMenuComponent } from './components/ui/context-menu.component';
import { CodeEditorComponent } from './components/editor/code-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TreeItemComponent, PropertyPanelComponent, CanvasComponent, PaletteComponent, ContextMenuComponent, CodeEditorComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  store = inject(TemplateStore);
  showCode = signal(false);
  codeEditor = viewChild<CodeEditorComponent>('codeEditor');

  addBlock(type: BlockType) {
    let parentId = this.store.selectedBlockId();
    const currentBlock = this.store.selectedBlock();

    if (!parentId || (currentBlock && currentBlock.type !== 'container' && !currentBlock.isRoot)) {
      parentId = 'root';
    }

    this.store.addBlock(parentId || 'root', type);
  }

  switchMode(mode: 'gui' | 'code') {
    if (mode === 'gui' && this.store.editorMode() === 'code') {
      const editor = this.codeEditor();
      if (editor) {
        editor.saveToStore();
      }
    }
    this.store.editorMode.set(mode);
  }
}