import { Component, inject, signal, ElementRef, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateStore } from '../../services/template.store';
import { CssStylesheetStore } from '../../services/css-stylesheet.store';
import { BlockRendererComponent } from './block-renderer.component';
import { SnapGuide } from '../../types';

@Component({
    selector: 'app-canvas',
    standalone: true,
    imports: [CommonModule, BlockRendererComponent],
    templateUrl: './canvas.component.html',
    styleUrls: ['./canvas.component.css']
})
export class CanvasComponent {
    store = inject(TemplateStore);
    cssStore = inject(CssStylesheetStore);
    cardContainer = viewChild<ElementRef>('cardContainer');
    scrollContainer = viewChild<ElementRef>('scrollContainer');

    zoom = signal(0.7); // Default zoom start

    // Dimensions for wrapper
    cardWidth = computed(() => {
        const rootBlock = this.store.rootBlock();
        const styles = this.cssStore.getBlockStyles(rootBlock.cssClass);
        return parseFloat(String(styles['width'] || '825'));
    });
    cardHeight = computed(() => {
        const rootBlock = this.store.rootBlock();
        const styles = this.cssStore.getBlockStyles(rootBlock.cssClass);
        return parseFloat(String(styles['height'] || '1125'));
    });

    scaledWidth = computed(() => this.cardWidth() * this.zoom());
    scaledHeight = computed(() => this.cardHeight() * this.zoom());

    pan = signal({ x: 0, y: 0 });
    isPanning = signal(false);

    // Drag State
    dragStart = { x: 0, y: 0 };
    initialPos = { left: 0, top: 0 };
    initialPan = { x: 0, y: 0 };

    guides = signal<SnapGuide[]>([]);
    SNAP_THRESHOLD = 5;

    resetPan() {
        this.pan.set({ x: 0, y: 0 });
    }

    adjustZoom(delta: number, centerX?: number, centerY?: number) {
        const oldZoom = this.zoom();
        const newZoom = Math.max(0.1, Math.min(5.0, oldZoom + delta));
        
        if (centerX !== undefined && centerY !== undefined) {
            // Zoom towards mouse position
            const currentPan = this.pan();
            const ratio = newZoom / oldZoom;
            
            const newPanX = centerX - (centerX - currentPan.x) * ratio;
            const newPanY = centerY - (centerY - currentPan.y) * ratio;
            
            this.pan.set({ x: newPanX, y: newPanY });
        }
        
        this.zoom.set(parseFloat(newZoom.toFixed(2)));
    }

    onWheel(e: WheelEvent) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        
        // Use scroll container rect to get relative mouse position
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const centerX = e.clientX - rect.left - rect.width / 2;
        const centerY = e.clientY - rect.top - rect.height / 2;

        this.adjustZoom(delta, centerX, centerY);
    }

    toggleZoom() {
        if (Math.abs(this.zoom() - 1) < 0.01) {
            this.fitToScreen();
            this.resetPan();
        } else {
            this.zoom.set(1);
            this.resetPan();
        }
    }

    fitToScreen() {
        const container = this.scrollContainer()?.nativeElement;
        if (!container) return;

        const padding = 80; // p-10 * 2
        const availableW = container.clientWidth - padding;
        const availableH = container.clientHeight - padding;

        const w = this.cardWidth();
        const h = this.cardHeight();

        const scaleW = availableW / w;
        const scaleH = availableH / h;

        // Fit entire card
        const fitScale = Math.min(scaleW, scaleH, 1.0); // Don't zoom in more than 100% for fit
        this.zoom.set(parseFloat(fitScale.toFixed(2)));
    }

    onBgMouseDown(e: MouseEvent) {
        if (e.button === 1 || (e.button === 0 && (e.target === e.currentTarget || e.target === this.scrollContainer()?.nativeElement))) {
            this.isPanning.set(true);
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.initialPan = { ...this.pan() };
            this.store.selectBlock(null);
            e.preventDefault();
        }
    }

    onBlockMouseDown(e: MouseEvent) {
        if (e.button !== 0) return; // Only LMB for block dragging

        const target = e.target as HTMLElement;
        // Find the closest block element
        const blockEl = target.closest('[data-block-id]') as HTMLElement;
        if (!blockEl) return;

        const blockId = blockEl.getAttribute('data-block-id');
        if (!blockId || blockId === 'root') return;

        const block = this.store.findBlock(this.store.rootBlock(), blockId);
        if (!block) return;

        const styles = this.cssStore.getBlockStyles(block.cssClass);
        if (styles['position'] === 'absolute') {
            this.store.setDraggingBlockId(blockId);
            this.dragStart = { x: e.clientX, y: e.clientY };

            const currentLeft = parseFloat(String(styles['left'] || blockEl.offsetLeft));
            const currentTop = parseFloat(String(styles['top'] || blockEl.offsetTop));

            this.initialPos = {
                left: isNaN(currentLeft) ? blockEl.offsetLeft : currentLeft,
                top: isNaN(currentTop) ? blockEl.offsetTop : currentTop
            };

            e.preventDefault(); // Prevent text selection
            e.stopPropagation(); // Prevent background panning
        }
    }

    onMouseMove(e: MouseEvent) {
        // Handle Panning
        if (this.isPanning()) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.pan.set({
                x: this.initialPan.x + dx,
                y: this.initialPan.y + dy
            });
            return;
        }

        // Handle Block Dragging
        const draggingId = this.store.draggingBlockId();
        if (!draggingId) return;

        const currentZoom = this.zoom();

        // Adjust movement for zoom level
        const dx = (e.clientX - this.dragStart.x) / currentZoom;
        const dy = (e.clientY - this.dragStart.y) / currentZoom;

        let newLeft = this.initialPos.left + dx;
        let newTop = this.initialPos.top + dy;

        // Calculate Snapping
        const snapResult = this.calculateSnapping(draggingId, newLeft, newTop);

        this.guides.set(snapResult.guides);

        // Apply snapped positions if available
        if (snapResult.x !== null) newLeft = snapResult.x;
        if (snapResult.y !== null) newTop = snapResult.y;

        this.store.updateStyles(draggingId, {
            left: `${newLeft}px`,
            top: `${newTop}px`
        });
    }

    onMouseUp() {
        this.store.setDraggingBlockId(null);
        this.isPanning.set(false);
        this.guides.set([]);
    }

    onDragOver(e: DragEvent) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
    }

    onDrop(e: DragEvent) {
        e.preventDefault();
        const newBlockType = e.dataTransfer?.getData('block-type') as any;
        if (!newBlockType) return;

        const container = this.cardContainer()?.nativeElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const scale = this.zoom();

        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        // Default size for new absolute blocks
        const defaultStyles: any = {
            position: 'absolute',
            left: `${Math.round(x)}px`,
            top: `${Math.round(y)}px`
        };

        if (['container', 'image', 'textarea'].includes(newBlockType)) {
            defaultStyles.width = '150px';
            defaultStyles.height = '100px';
        }

        this.store.addBlock('root', newBlockType, defaultStyles);
    }

    calculateSnapping(draggingId: string, currentX: number, currentY: number) {
        const guides: SnapGuide[] = [];
        let snappedX: number | null = null;
        let snappedY: number | null = null;

        const rootEl = this.cardContainer()?.nativeElement;
        if (!rootEl) return { x: null, y: null, guides: [] };

        const draggingEl = rootEl.querySelector(`[data-block-id="${draggingId}"]`) as HTMLElement;
        if (!draggingEl) return { x: null, y: null, guides: [] };

        const dragRect = draggingEl.getBoundingClientRect();
        const rootRect = rootEl.getBoundingClientRect();
        const scale = this.zoom();

        // Convert scaled screen dimensions back to CSS logic dimensions
        const dragWidth = dragRect.width / scale;
        const dragHeight = dragRect.height / scale;

        // The candidates are all other blocks
        const candidates = Array.from(rootEl.querySelectorAll('[data-block-id]')) as HTMLElement[];

        const myLeft = currentX;
        const myCenter = currentX + dragWidth / 2;
        const myRight = currentX + dragWidth;

        const myTop = currentY;
        const myMiddle = currentY + dragHeight / 2;
        const myBottom = currentY + dragHeight;

        // Card edges (root is the container)
        const cardW = rootRect.width / scale;
        const cardH = rootRect.height / scale;

        const targetsX = [0, cardW / 2, cardW];
        const targetsY = [0, cardH / 2, cardH];

        // Check against other blocks
        candidates.forEach(el => {
            const id = el.getAttribute('data-block-id');
            if (id === draggingId || id === 'root') return;

            const rect = el.getBoundingClientRect();
            // Relative position in Logic Pixels
            const relLeft = (rect.left - rootRect.left) / scale;
            const relTop = (rect.top - rootRect.top) / scale;
            const width = rect.width / scale;
            const height = rect.height / scale;

            targetsX.push(relLeft, relLeft + width / 2, relLeft + width);
            targetsY.push(relTop, relTop + height / 2, relTop + height);
        });

        // Find Closest X
        for (const target of targetsX) {
            if (Math.abs(myLeft - target) < this.SNAP_THRESHOLD) {
                snappedX = target;
                guides.push({ type: 'vertical', position: target });
            } else if (Math.abs(myRight - target) < this.SNAP_THRESHOLD) {
                snappedX = target - dragWidth;
                guides.push({ type: 'vertical', position: target });
            } else if (Math.abs(myCenter - target) < this.SNAP_THRESHOLD) {
                snappedX = target - dragWidth / 2;
                guides.push({ type: 'vertical', position: target });
            }
        }

        // Find Closest Y
        for (const target of targetsY) {
            if (Math.abs(myTop - target) < this.SNAP_THRESHOLD) {
                snappedY = target;
                guides.push({ type: 'horizontal', position: target });
            } else if (Math.abs(myBottom - target) < this.SNAP_THRESHOLD) {
                snappedY = target - dragHeight;
                guides.push({ type: 'horizontal', position: target });
            } else if (Math.abs(myMiddle - target) < this.SNAP_THRESHOLD) {
                snappedY = target - dragHeight / 2;
                guides.push({ type: 'horizontal', position: target });
            }
        }

        return { x: snappedX, y: snappedY, guides };
    }
}