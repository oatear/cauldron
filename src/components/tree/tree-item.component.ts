import { Component, input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block } from '../../types';
import { TemplateStore } from '../../services/template.store';
import { CssStylesheetStore } from '../../services/css-stylesheet.store';

@Component({
  selector: 'app-tree-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-item.component.html'
})
export class TreeItemComponent {
  block = input.required<Block>();
  store = inject(TemplateStore);
  cssStore = inject(CssStylesheetStore);

  isDragging = signal(false);


  dropPosition = computed(() => {
    const target = this.store.activeDropTarget();
    if (target && target.id === this.block().id) {
      return target.position;
    }
    return 'none';
  });

  get containerClasses() {
    const selected = this.isSelected();
    const dropPos = this.dropPosition();
    const isInside = dropPos === 'inside';

    if (selected) {
      return {
        'bg-[#7089a2]': true,
        'text-white': true,
        'shadow-md': true
      };
    } else if (isInside) {
      return {
        'bg-[#3b82f6]/20': true
      };
    } else {
      return {
        'bg-[#353d49]/30': true,
        'text-[#bbc1cb]': true,
        'hover:bg-[#353d49]': true
      };
    }
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

  getPositionLabel(): string | null {
    const styles = this.cssStore.getBlockStyles(this.block().cssClass);
    const pos = styles['position'];
    if (!pos || pos === 'static') return null; // Don't show static as it's default
    if (pos === 'absolute') return 'ABS';
    if (pos === 'relative') return 'REL';
    if (pos === 'fixed') return 'FIX';
    if (pos === 'sticky') return 'STK';
    return String(pos).substring(0, 3).toUpperCase();
  }

  getDisplayLabel(): string | null {
    const styles = this.cssStore.getBlockStyles(this.block().cssClass);
    const display = styles['display'];
    if (!display || display === 'block') return null; // Don't show block as it's mostly default (or maybe we should?)
    // Let's show flex and grid specially
    if (display === 'flex') return 'FLEX';
    if (display === 'grid') return 'GRID';
    if (display === 'inline-block') return 'IN-BLK';
    if (display === 'inline') return 'INL';
    if (display === 'none') return 'NONE';
    return String(display).substring(0, 4).toUpperCase();
  }

  isSelected() {
    return this.store.selectedBlockId() === this.block().id;
  }

  select(e: MouseEvent) {
    e.stopPropagation();
    this.store.selectBlock(this.block().id);
  }

  onContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.store.openContextMenu(e.clientX, e.clientY, this.block().id);
  }

  toggleExpand(e: MouseEvent) {
    e.stopPropagation();
    this.store.updateBlock(this.block().id, { expanded: !this.block().expanded });
  }

  deleteBlock(e: MouseEvent) {
    e.stopPropagation();
    if (confirm('Delete this block?')) {
      this.store.deleteBlock(this.block().id);
    }
  }

  // --- Drag and Drop Logic ---

  onDragStart(e: DragEvent) {
    e.stopPropagation();
    if (this.block().isRoot) {
      e.preventDefault();
      return;
    }
    this.isDragging.set(true);
    e.dataTransfer?.setData('block-id', this.block().id);
    e.dataTransfer!.effectAllowed = 'move';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position relative to height
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let pos: 'none' | 'inside' | 'top' | 'bottom' = 'none';

    if (this.block().isRoot) {
      pos = 'inside';
    } else {
      // Container logic: Top 25% (Before), Bottom 25% (After), Middle (Inside)
      if (this.block().type === 'container') {
        if (y < height * 0.25) pos = 'top';
        else if (y > height * 0.75) pos = 'bottom';
        else pos = 'inside';
      }
      // Leaf logic: Top 50% (Before), Bottom 50% (After)
      else {
        if (y < height * 0.5) pos = 'top';
        else pos = 'bottom';
      }
    }

    this.store.setDropTarget({ id: this.block().id, position: pos });

    // Check if we are dragging a new block (copy) or moving an existing one
    if (e.dataTransfer?.types.includes('block-type')) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer!.dropEffect = 'move';
    }
  }

  onDragLeave(e: DragEvent) {
    // Only clear if we are actually leaving the element rect
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      const currentTarget = this.store.activeDropTarget();
      if (currentTarget && currentTarget.id === this.block().id) {
        this.store.clearDropTarget();
      }
    }
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const pos = this.dropPosition();
    this.store.clearDropTarget();

    const dragId = e.dataTransfer?.getData('block-id');
    const newBlockType = e.dataTransfer?.getData('block-type') as any;

    // Handle existing block move
    if (dragId) {
      if (dragId === this.block().id) return;

      let movePos: 'inside' | 'before' | 'after' | null = null;
      if (pos === 'inside') movePos = 'inside';
      else if (pos === 'top') movePos = 'before';
      else if (pos === 'bottom') movePos = 'after';

      if (movePos) {
        this.store.moveBlock(dragId, this.block().id, movePos);
      }
    }
    // Handle new block creation
    else if (newBlockType) {
      if (pos === 'inside') {
        // Add to the end of children
        this.store.insertBlock(this.block().id, -1, newBlockType);
      } else {
        // Dropping before or after the current block
        // We need to find the parent and the index of the current block
        if (!this.block().isRoot) {
          const root = this.store.rootBlock();
          const parent = this.store.findParent(root, this.block().id);

          if (parent) {
            const currentIndex = parent.children.findIndex(c => c.id === this.block().id);
            if (currentIndex !== -1) {
              const insertIndex = pos === 'bottom' ? currentIndex + 1 : currentIndex;
              this.store.insertBlock(parent.id, insertIndex, newBlockType);
            }
          }
        }
      }
    }


    this.isDragging.set(false);
  }

  onDragEnd(e: DragEvent) {
    this.isDragging.set(false);
    this.store.clearDropTarget();
  }
}