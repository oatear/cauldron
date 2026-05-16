import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateStore } from '../../services/template.store';
import { CssStylesheetStore } from '../../services/css-stylesheet.store';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code-editor.component.html'
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
