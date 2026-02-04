import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateStore } from '../../services/template.store';
import { CssStylesheetStore } from '../../services/css-stylesheet.store';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full w-full bg-[#181c21] text-[#bbc1cb] overflow-hidden">
      <!-- HTML Editor -->
      <div class="flex-1 flex flex-col border-r border-[#434d5d]">
        <div class="p-3 border-b border-[#434d5d] bg-[#262c35] flex items-center justify-between">
          <div class="font-semibold text-sm tracking-wider flex items-center gap-2 text-orange-400">
            <i class="pi pi-code"></i> HTML Template
          </div>
        </div>
        <textarea 
          class="flex-1 bg-[#1e2228] text-gray-300 p-4 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-orange-500/50"
          [ngModel]="htmlContent()"
          (ngModelChange)="updateHtml($event)"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- CSS Editor -->
      <div class="flex-1 flex flex-col">
        <div class="p-3 border-b border-[#434d5d] bg-[#262c35] flex items-center justify-between">
          <div class="font-semibold text-sm tracking-wider flex items-center gap-2 text-blue-400">
            <i class="pi pi-palette"></i> CSS Stylesheet
          </div>
        </div>
        <textarea 
          class="flex-1 bg-[#1e2228] text-gray-300 p-4 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-blue-500/50"
          [ngModel]="cssContent()"
          (ngModelChange)="updateCss($event)"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
  `
})
export class CodeEditorComponent {
  store = inject(TemplateStore);
  cssStore = inject(CssStylesheetStore);

  htmlContent = signal('');
  cssContent = signal('');

  constructor() {
    // Initialize contents from stores when component is created
    this.htmlContent.set(this.store.generateHtml(this.store.rootBlock()));
    this.cssContent.set(this.cssStore.toCssString());
  }

  updateHtml(newHtml: string) {
    this.htmlContent.set(newHtml);
    // Debounce this in the future, for now just sync directly to store?
    // Wait, we only sync Code -> GUI when switching modes according to the plan.
    // For now, we just hold the state here until the mode switch happens.
    // Actually, Phase 3 is building the HTML parser, so we just hold state for now.
  }

  updateCss(newCss: string) {
    this.cssContent.set(newCss);
    // Sync Code -> GUI when switching mode.
  }

  // Method to be called by AppComponent right before switching back to GUI
  saveToStore() {
    this.store.parseHtmlToBlocks(this.htmlContent());
    this.cssStore.parseFromCss(this.cssContent());
  }
}
