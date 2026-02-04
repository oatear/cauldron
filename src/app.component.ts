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
  template: `
    <div class="flex h-screen w-screen overflow-hidden bg-[#181c21]">
      
      <!-- Left Sidebar: Tree & Tools -->
      <div class="w-80 bg-[#262c35] flex flex-col border-r border-[#434d5d] shadow-xl z-10">
        <div class="p-5 border-b border-[#434d5d] bg-[#262c35] flex items-center justify-between">
           <div class="flex items-center gap-3">
             <i class="pi pi-th-large text-[#7089a2] text-xl"></i>
             <div>
               <h1 class="text-xl font-bold tracking-tight text-[#bbc1cb] leading-none">Oatear Cauldron</h1>
               <p class="text-[10px] text-[#7e8a9c] mt-1">v0.0.1 • Drag & Drop</p>
             </div>
           </div>
        </div>

        <!-- Palette -->
        <div class="h-auto border-b border-[#434d5d] bg-[#262c35] shrink-0">
           <div class="px-4 py-2 text-[10px] font-bold text-[#7089a2] tracking-wider uppercase mt-1">Components</div>
           <app-palette></app-palette>
        </div>
        
        <!-- Tree View -->
        <div class="flex-1 flex flex-col bg-[#262c35] min-h-0">
            <div class="px-4 py-2 text-xs font-semibold text-[#7089a2] tracking-wider uppercase flex items-center gap-2 border-b border-[#434d5d]/50 bg-[#2b323c]">
                <i class="pi pi-list"></i> Layers
            </div>
            <div class="flex-1 overflow-y-auto py-2 px-2">
                <app-tree-item [block]="store.rootBlock()"></app-tree-item>
            </div>
        </div>

        <!-- Mode Switcher -->
        <div class="p-4 border-t border-[#434d5d] bg-[#262c35]">
          @if (store.editorMode() === 'gui') {
            <button (click)="switchMode('code')" class="w-full bg-[#7089a2] hover:bg-[#5c728a] text-white py-3 rounded-[10px] text-sm font-medium transition-colors shadow-lg flex items-center justify-center gap-2">
              <i class="pi pi-code"></i>
              Switch to Code Editor
            </button>
          } @else {
            <button (click)="switchMode('gui')" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-[10px] text-sm font-medium transition-colors shadow-lg flex items-center justify-center gap-2">
              <i class="pi pi-th-large"></i>
              Switch to Visual Editor
            </button>
          }
        </div>
      </div>

      <!-- Center: Editor Area -->
      <div class="flex-1 relative z-0 bg-[#181c21] flex flex-col">
        @if (store.editorMode() === 'gui') {
          <app-canvas class="flex-1"></app-canvas>
        } @else {
          <app-code-editor #codeEditor class="flex-1"></app-code-editor>
        }
      </div>

      <!-- Right Sidebar: Properties (Only in GUI mode) -->
      @if (store.editorMode() === 'gui') {
        <div class="w-80 bg-[#262c35] border-l border-[#434d5d] shadow-xl z-10 flex flex-col">
          <div class="p-4 border-b border-[#434d5d] bg-[#262c35] font-semibold text-sm text-[#7089a2] tracking-wider flex items-center gap-2">
            <i class="pi pi-sliders-h"></i> PROPERTIES
          </div>
          <app-property-panel class="flex-1 overflow-hidden"></app-property-panel>
        </div>
      }

      <app-context-menu></app-context-menu>
    </div>
  `,
  styles: [`
    .tool-btn {
      @apply p-2 rounded-[10px] bg-[#353d49] text-[#bbc1cb] hover:bg-[#434d5d] hover:text-white flex items-center justify-center transition-all border border-[#434d5d] h-10;
    }
  `]
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