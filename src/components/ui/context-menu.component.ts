import { Component, inject, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateStore } from '../../services/template.store';

@Component({
    selector: 'app-context-menu',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './context-menu.component.html'
})
export class ContextMenuComponent {
    store = inject(TemplateStore);

    isAbsolute = computed(() => {
        const id = this.store.contextMenu().blockId;
        if (!id) return false;
        const block = this.store.findBlock(this.store.rootBlock(), id);
        return block?.styles['position'] === 'absolute';
    });

    togglePositioning() {
        const id = this.store.contextMenu().blockId;
        if (id) {
            this.store.toggleBlockPositioning(id);
        }
    }

    resetSizing() {
        const id = this.store.contextMenu().blockId;
        if (id) {
            this.store.resetBlockSizing(id);
        }
    }

    duplicate() {
        const id = this.store.contextMenu().blockId;
        if (id) {
            this.store.duplicateBlock(id);
        }
    }

    deleteBlock() {
        const id = this.store.contextMenu().blockId;
        if (id) {
            this.store.deleteBlock(id);
            this.store.closeContextMenu();
        }
    }
}
