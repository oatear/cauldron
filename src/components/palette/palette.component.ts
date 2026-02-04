import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockType } from '../../types';
import { TemplateStore } from '../../services/template.store';
import { inject } from '@angular/core';

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-4 gap-2 p-2">
      @for (item of items; track item.type) {
        <div 
          class="aspect-square bg-[#353d49] border border-[#434d5d] rounded-[8px] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-[#434d5d] hover:border-[#7089a2] hover:shadow transition-all group p-1"
          draggable="true"
          (dragstart)="onDragStart($event, item.type)"
          (dragend)="onDragEnd($event)"
          [title]="item.label"
        >
          <i class="pi {{item.icon}} text-lg text-[#bbc1cb] group-hover:text-white group-hover:scale-110 transition-transform"></i>
        </div>
      }
    </div>
  `,
  styles: []
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
