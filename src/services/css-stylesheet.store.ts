import { Injectable, signal, computed, effect } from '@angular/core';

export interface CssRuleSet {
  [selector: string]: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class CssStylesheetStore {
  // Structured storage: selector -> { property: value }
  private rules = signal<CssRuleSet>({});
  
  // Global/unstructured CSS (animations, @font-face, media queries, comments)
  globalCss = signal<string>('');

  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    effect(() => {
      // Whenever rules or globalCss changes, update the DOM style element
      const css = this.toCssString();
      if (!this.styleElement) {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'cauldron-dynamic-styles';
        document.head.appendChild(this.styleElement);
      }
      this.styleElement.textContent = css;
    });
  }

  getRule(selector: string): Record<string, string> {
    return this.rules()[selector] || {};
  }

  setProperty(selector: string, prop: string, value: string) {
    // Normalize to kebab-case
    const kebabProp = prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    
    const currentRules = { ...this.rules() };
    if (!currentRules[selector]) {
      currentRules[selector] = {};
    }
    
    if (value === undefined || value === null || value === '') {
      delete currentRules[selector][kebabProp];
    } else {
      currentRules[selector][kebabProp] = value;
    }

    this.rules.set(currentRules);
  }

  getBlockStyles(cssClass: string): Record<string, string> {
    return this.getRule('.' + cssClass);
  }

  // Parse raw CSS string into structured rules + global remainder
  parseFromCss(raw: string) {
    const structured: CssRuleSet = {};
    let globalStr = '';

    // Remove comments
    let css = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // We actually need a better way to split global from structured,
    // because global CSS can have at-rules with nested braces.
    // For now, let's keep it simple: if selector starts with .block- and has no pseudo-classes/elements,
    // we put it in structured. Else global.

    // A more robust way to parse CSS in browser without external libs is to use a temporary style element
    // and CSSOM. Let's do that!
    
    const styleEl = document.createElement('style');
    styleEl.textContent = raw;
    document.head.appendChild(styleEl);
    
    const sheet = styleEl.sheet;
    if (sheet) {
      for (let i = 0; i < sheet.cssRules.length; i++) {
        const rule = sheet.cssRules[i];
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          // Check if it's a simple block selector
          if (selector.match(/^\.block-[a-zA-Z0-9-]+$/)) {
            const props: Record<string, string> = {};
            for (let j = 0; j < rule.style.length; j++) {
              const propName = rule.style[j];
              props[propName] = rule.style.getPropertyValue(propName);
            }
            structured[selector] = props;
          } else {
            globalStr += rule.cssText + '\\n';
          }
        } else {
          globalStr += rule.cssText + '\\n';
        }
      }
    }
    
    document.head.removeChild(styleEl);
    
    this.rules.set(structured);
    this.globalCss.set(globalStr);
  }

  // Serialize structured rules + global CSS back to a string
  toCssString(): string {
    let css = '';
    const currentRules = this.rules();
    
    for (const selector of Object.keys(currentRules)) {
      const props = currentRules[selector];
      const propKeys = Object.keys(props);
      if (propKeys.length > 0) {
        css += `${selector} {\n`;
        for (const prop of propKeys) {
          css += `  ${prop}: ${props[prop]};\n`;
        }
        css += `}\n\n`;
      }
    }

    const global = this.globalCss();
    if (global && global.trim().length > 0) {
      css += `/* Global Styles */\n${global}\n`;
    }

    return css;
  }
}
