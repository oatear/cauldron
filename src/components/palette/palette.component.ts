import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockType } from '../../types';
import { TemplateStore } from '../../services/template.store';
import { inject } from '@angular/core';

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './palette.component.html'
})
export class PaletteComponent {
  store = inject(TemplateStore);

  items: { type: BlockType; label: string; icon: string }[] = [
    { type: 'container', label: 'Container', icon: 'pi-box' },
    { type: 'text', label: 'Text', icon: 'pi-align-left' },
    { type: 'textarea', label: 'Text Area', icon: 'pi-file-edit' },
    { type: 'image', label: 'Image', icon: 'pi-image' },
    { type: 'badge', label: 'Badge', icon: 'pi-tag' }
  ];

  onDragStart(e: DragEvent, type: BlockType) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('block-type', type);
      e.dataTransfer.setData('action', 'create');
      e.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragEnd(e: DragEvent) {
    this.store.clearDropTarget();
  }
}
