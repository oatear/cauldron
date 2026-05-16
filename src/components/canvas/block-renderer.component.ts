import { Component, input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block } from '../../types';
import { TemplateStore } from '../../services/template.store';

@Component({
  selector: 'app-block-renderer',
  standalone: true,
  imports: [CommonModule],
  host: {
    'style': 'display: contents'
  },
  templateUrl: './block-renderer.component.html',
  styleUrls: ['./block-renderer.component.css']
})
export class BlockRendererComponent {
  block = input.required<Block>();
  store = inject(TemplateStore);
  isResizing = signal(false);

  isDragging = computed(() => this.store.draggingBlockId() === this.block().id);
  isSelected = computed(() => this.store.selectedBlockId() === this.block().id);

  blockClassList = computed(() => {
    let base = `relative box-border select-none block-renderer ${this.block().cssClass}`;
    if (this.block().extraClasses) {
       base += ' ' + this.block().extraClasses.join(' ');
    }
    return base;
  });

  select(e: MouseEvent) {
    e.stopPropagation();
    this.store.selectBlock(this.block().id);
  }

  onContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.store.openContextMenu(e.clientX, e.clientY, this.block().id);
  }

  // --- Resize Logic ---
  // --- Resize Logic ---
  resizeHandles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
  snapThreshold = 5;
  otherRects: { left: number, right: number, top: number, bottom: number, centerX: number, centerY: number }[] = [];

  // Track drag state
  private resizeStart: {
    x: number, y: number, width: number, height: number, top: number, left: number,
    scale: number,
    viewport: { left: number, top: number, width: number, height: number }
  } | null = null;
  private currentHandle: string | null = null;
  private initialBlockStyles: Record<string, string | number> = {};

  onResizeStart(e: MouseEvent, handle: string) {
    this.isResizing.set(true);
    e.preventDefault();
    e.stopPropagation();

    this.currentHandle = handle;
    const blockEl = (e.target as HTMLElement).closest('.block-renderer') as HTMLElement;
    const rect = blockEl.getBoundingClientRect();

    // Collect rects for snapping
    this.otherRects = Array.from(document.querySelectorAll('.block-renderer'))
      .filter(el => el !== blockEl)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          centerX: r.left + r.width / 2, centerY: r.top + r.height / 2
        };
      });

    // Get computed styles for initial values
    const computed = window.getComputedStyle(blockEl);
    const width = parseFloat(computed.width);
    const height = parseFloat(computed.height);
    const top = parseFloat(computed.top) || 0;
    const left = parseFloat(computed.left) || 0;

    // We cannot easily get initial block styles since it's in CSS store now, 
    // but the resize logic only depends on the computed width/height which we get from DOM.
    // We just rely on the DOM values for the start state.

    // Calculate Scale
    const scale = width > 0 ? rect.width / width : 1;

    this.resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width,
      height,
      top,
      left,
      scale,
      viewport: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    };

    // Add window listeners
    window.addEventListener('mousemove', this.onResizeMove);
    window.addEventListener('mouseup', this.onResizeEnd);
  }

  onResizeMove = (e: MouseEvent) => {
    if (!this.resizeStart || !this.currentHandle) return;

    const scale = this.resizeStart.scale;
    const dxRaw = e.clientX - this.resizeStart.x;
    const dyRaw = e.clientY - this.resizeStart.y;

    // Effective delta in local coordinate space (unscaled)
    const dx = dxRaw / scale;
    const dy = dyRaw / scale;

    let newWidth = this.resizeStart.width;
    let newHeight = this.resizeStart.height;
    let newTop = this.resizeStart.top;
    let newLeft = this.resizeStart.left;

    // Apply Mouse Drag Delta
    if (this.currentHandle.includes('e')) newWidth += dx;
    if (this.currentHandle.includes('w')) { newWidth -= dx; newLeft += dx; }
    if (this.currentHandle.includes('s')) newHeight += dy;
    if (this.currentHandle.includes('n')) { newHeight -= dy; newTop += dy; }

    let snappedX: number | null = null;
    let snappedY: number | null = null;
    let snapDeltaX = 0;
    let snapDeltaY = 0;

    // --- Horizontal Snapping ---
    if (this.currentHandle.includes('w')) {
      const currentLeftAbs = this.resizeStart.viewport.left + dxRaw;
      const targets = this.otherRects.flatMap(r => [r.left, r.right, r.centerX]);
      const closest = this.findClosest(currentLeftAbs, targets);
      if (closest) {
        snapDeltaX = closest - currentLeftAbs; // This is SCREEN delta
        snappedX = closest;
        // Apply UNSCALED delta to local props
        newWidth -= (snapDeltaX / scale);
        newLeft += (snapDeltaX / scale);
      }
    } else if (this.currentHandle.includes('e')) {
      const currentRightAbs = (this.resizeStart.viewport.left + this.resizeStart.viewport.width) + dxRaw;
      const targets = this.otherRects.flatMap(r => [r.left, r.right, r.centerX]);
      const closest = this.findClosest(currentRightAbs, targets);
      if (closest) {
        snapDeltaX = closest - currentRightAbs;
        snappedX = closest;
        newWidth += (snapDeltaX / scale);
      }
    }

    // --- Vertical Snapping ---
    if (this.currentHandle.includes('n')) {
      const currentTopAbs = this.resizeStart.viewport.top + dyRaw;
      const targets = this.otherRects.flatMap(r => [r.top, r.bottom, r.centerY]);
      const closest = this.findClosest(currentTopAbs, targets);
      if (closest) {
        snapDeltaY = closest - currentTopAbs;
        snappedY = closest;
        newHeight -= (snapDeltaY / scale);
        newTop += (snapDeltaY / scale);
      }
    } else if (this.currentHandle.includes('s')) {
      const currentBottomAbs = (this.resizeStart.viewport.top + this.resizeStart.viewport.height) + dyRaw;
      const targets = this.otherRects.flatMap(r => [r.top, r.bottom, r.centerY]);
      const closest = this.findClosest(currentBottomAbs, targets);
      if (closest) {
        snapDeltaY = closest - currentBottomAbs;
        snappedY = closest;
        newHeight += (snapDeltaY / scale);
      }
    }

    this.store.setSnapGuides({ x: snappedX, y: snappedY });

    const updates: Record<string, string> = {
      width: `${Math.max(0, newWidth)}px`,
      height: `${Math.max(0, newHeight)}px`,
    };

    // Need to get position from css store
    // better yet, just use DOM computed style
    const computedBlock = window.getComputedStyle(document.getElementById('block-' + this.block().id)!);
    
    if (computedBlock.position === 'absolute' || computedBlock.position === 'fixed') {
      if (this.currentHandle.includes('w')) updates['left'] = `${newLeft}px`;
      if (this.currentHandle.includes('n')) updates['top'] = `${newTop}px`;
    }

    this.store.updateStyles(this.block().id, updates);
  }

  findClosest(val: number, targets: number[]): number | null {
    let closest = null;
    let minDist = this.snapThreshold;
    for (const t of targets) {
      const dist = Math.abs(val - t);
      if (dist < minDist) {
        minDist = dist;
        closest = t;
      }
    }
    return closest;
  }

  onResizeEnd = () => {
    this.isResizing.set(false);
    this.store.setSnapGuides({ x: null, y: null });
    window.removeEventListener('mousemove', this.onResizeMove);
    window.removeEventListener('mouseup', this.onResizeEnd);
    this.resizeStart = null;
    this.currentHandle = null;
  }
}