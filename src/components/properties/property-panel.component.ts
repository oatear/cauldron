import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateStore } from '../../services/template.store';
import { CssStylesheetStore } from '../../services/css-stylesheet.store';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
    selector: 'app-property-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TooltipDirective],
    templateUrl: './property-panel.component.html',
    styleUrls: ['./property-panel.component.css']
})
export class PropertyPanelComponent {
    store = inject(TemplateStore);
    cssStore = inject(CssStylesheetStore);

    getStyle(block: any, prop: string): any {
        const kebabProp = prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        return this.cssStore.getBlockStyles(block.cssClass)[kebabProp] || '';
    }

    getTypeIcon(type: string) {
        switch (type) {
            case 'container': return 'pi-box';
            case 'text': return 'pi-align-left';
            case 'textarea': return 'pi-file-edit';
            case 'image': return 'pi-image';
            case 'badge': return 'pi-tag';
            default: return 'pi-circle';
        }
    }

    update(field: string, value: any) {
        if (this.store.selectedBlockId()) {
            this.store.updateBlock(this.store.selectedBlockId()!, { [field]: value });
        }
    }

    updateStyle(prop: string, value: any) {
        if (this.store.selectedBlockId()) {
            this.store.updateStyles(this.store.selectedBlockId()!, { [prop]: value });
        }
    }

    getBgImage(block: any): string {
        if (block.type === 'image') {
            return block.content;
        }
        const bg = this.getStyle(block, 'backgroundImage');
        if (!bg) return '';
        // Extract URL from url('...') format if present
        const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : bg;
    }

    updateBgImage(url: string) {
        if (this.store.selectedBlock()?.type === 'image') {
            this.update('content', url);
            return;
        }

        if (!url) {
            this.updateStyle('backgroundImage', '');
            return;
        }
        // Wrap in url() if it doesn't start with url(
        if (!url.trim().toLowerCase().startsWith('url(')) {
            this.updateStyle('backgroundImage', `url('${url}')`);
        } else {
            this.updateStyle('backgroundImage', url);
        }
    }
}