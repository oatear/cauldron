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
    template: `
    <div class="w-full h-full relative flex flex-col bg-[#181c21] checkboard overflow-hidden">

        <!-- Scrollable Viewport -->
        <div 
          class="flex-1 overflow-auto flex items-center justify-center p-10 outline-none" 
          #scrollContainer
          (click)="bgClick($event)"
          (mouseup)="onMouseUp()"
          (mousemove)="onMouseMove($event)"
          (mouseleave)="onMouseUp()"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
        >
            <!-- Sizing Wrapper (Ensures scrollbars and centering work correctly) -->
            <div 
               [style.width.px]="scaledWidth()" 
               [style.height.px]="scaledHeight()" 
               class="relative flex-shrink-0 transition-all duration-200 ease-out"
            >
                <!-- Scaled Content -->
                <div 
                  class="absolute top-0 left-0 origin-top-left shadow-2xl"
                  #cardContainer
                  [style.transform]="'scale(' + zoom() + ')'"
                >
                    <app-block-renderer 
                      [block]="store.rootBlock()" 
                      (mousedown)="onMouseDown($event)"
                    ></app-block-renderer>
                    
                    <!-- Snap Guides for Dragging -->
                    @for (guide of guides(); track $index) {
                        <div 
                            class="absolute bg-[#7089a2] z-[100] pointer-events-none"
                            [style.left.px]="guide.type === 'vertical' ? guide.position - 1 : 0"
                            [style.top.px]="guide.type === 'horizontal' ? guide.position - 1 : 0"
                            [style.width]="guide.type === 'vertical' ? '2px' : '100%'"
                            [style.height]="guide.type === 'horizontal' ? '2px' : '100%'"
                        ></div>
                    }

                    <!-- Global Snap Guides (Resizing) -->
                    @if (store.snapGuides().x !== null) {
                        <div class="fixed top-0 bottom-0 border-l-2 border-dashed border-red-500 pointer-events-none z-[100]" [style.left.px]="store.snapGuides().x - 1"></div>
                    }
                    @if (store.snapGuides().y !== null) {
                        <div class="fixed left-0 right-0 border-t-2 border-dashed border-red-500 pointer-events-none z-[100]" [style.top.px]="store.snapGuides().y - 1"></div>
                    }
                </div>
            </div>
        </div>

        <!-- Zoom Controls -->
        <div class="absolute bottom-8 right-8 flex items-center gap-2 bg-[#262c35] p-2 rounded-[10px] shadow-xl border border-[#434d5d] z-50">
            <button (click)="adjustZoom(-0.1)" class="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[#353d49] text-[#bbc1cb] hover:text-white transition-colors" title="Zoom Out">
                <i class="pi pi-minus"></i>
            </button>
            
            <button 
                (click)="toggleZoom()" 
                class="w-12 h-8 flex items-center justify-center rounded-[8px] hover:bg-[#353d49] text-sm font-mono text-[#bbc1cb] hover:text-white transition-colors select-none"
                title="Toggle Zoom (100% / Fit)"
            >
                {{ (zoom() * 100).toFixed(0) }}%
            </button>

            <button (click)="adjustZoom(0.1)" class="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[#353d49] text-[#bbc1cb] hover:text-white transition-colors" title="Zoom In">
                <i class="pi pi-plus"></i>
            </button>
        </div>
    </div>
  `
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

    // Drag State
    dragStart = { x: 0, y: 0 };
    initialPos = { left: 0, top: 0 };

    guides = signal<SnapGuide[]>([]);
    SNAP_THRESHOLD = 5;

    adjustZoom(delta: number) {
        const newZoom = Math.max(0.1, Math.min(3.0, this.zoom() + delta));
        this.zoom.set(parseFloat(newZoom.toFixed(2)));
    }

    toggleZoom() {
        if (Math.abs(this.zoom() - 1) < 0.01) {
            this.fitToScreen();
        } else {
            this.zoom.set(1);
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

    bgClick(e: MouseEvent) {
        if (e.target === e.currentTarget || e.target === this.scrollContainer()?.nativeElement) {
            this.store.selectBlock(null);
        }
    }

    onMouseDown(e: MouseEvent) {
        const target = e.target as HTMLElement;
        // Find the closest block element
        const blockEl = target.closest('[data-block-id]') as HTMLElement;
        if (!blockEl) return;

        const blockId = blockEl.getAttribute('data-block-id');
        if (!blockId || blockId === 'root') return;

        const block = this.store.findBlock(this.store.rootBlock(), blockId);
        if (block?.styles['position'] === 'absolute') {
            this.store.setDraggingBlockId(blockId);
            this.dragStart = { x: e.clientX, y: e.clientY };

            const currentLeft = parseFloat(String(block.styles['left'] || blockEl.offsetLeft));
            const currentTop = parseFloat(String(block.styles['top'] || blockEl.offsetTop));

            this.initialPos = {
                left: isNaN(currentLeft) ? blockEl.offsetLeft : currentLeft,
                top: isNaN(currentTop) ? blockEl.offsetTop : currentTop
            };

            e.preventDefault(); // Prevent text selection
        }
    }

    onMouseMove(e: MouseEvent) {
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