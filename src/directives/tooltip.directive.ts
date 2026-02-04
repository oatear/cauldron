import { Directive, ElementRef, HostListener, Input, Renderer2, OnDestroy } from '@angular/core';

@Directive({
    selector: '[appTooltip]',
    standalone: true
})
export class TooltipDirective implements OnDestroy {
    @Input('appTooltip') tooltipText: string = '';
    private tooltipElement: HTMLElement | null = null;
    private showTimeout: any;

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    @HostListener('mouseenter') onMouseEnter() {
        if (!this.tooltipText) return;

        // Small delay to prevent flickering when moving quickly
        this.showTimeout = setTimeout(() => {
            this.show();
        }, 200);
    }

    @HostListener('mouseleave') onMouseLeave() {
        this.hide();
    }

    @HostListener('mousedown') onMouseDown() {
        this.hide();
    }

    ngOnDestroy() {
        this.hide();
    }

    private show() {
        if (this.tooltipElement) return;

        this.tooltipElement = this.renderer.createElement('div');
        this.renderer.appendChild(document.body, this.tooltipElement);

        // Style the tooltip for a premium look
        this.renderer.addClass(this.tooltipElement, 'fixed');
        this.renderer.addClass(this.tooltipElement, 'z-50');
        this.renderer.addClass(this.tooltipElement, 'px-2');
        this.renderer.addClass(this.tooltipElement, 'py-1');
        this.renderer.addClass(this.tooltipElement, 'text-[10px]');
        this.renderer.addClass(this.tooltipElement, 'font-medium');
        this.renderer.addClass(this.tooltipElement, 'text-white');
        this.renderer.addClass(this.tooltipElement, 'bg-[#181c21]');
        this.renderer.addClass(this.tooltipElement, 'border');
        this.renderer.addClass(this.tooltipElement, 'border-[#434d5d]');
        this.renderer.addClass(this.tooltipElement, 'rounded');
        this.renderer.addClass(this.tooltipElement, 'shadow-lg');
        this.renderer.addClass(this.tooltipElement, 'pointer-events-none');
        this.renderer.addClass(this.tooltipElement, 'animate-fade-in');

        // Set content
        this.renderer.setProperty(this.tooltipElement, 'textContent', this.tooltipText);

        // Calculate position
        const hostPos = this.el.nativeElement.getBoundingClientRect();
        const tooltipPos = this.tooltipElement!.getBoundingClientRect();

        // Position above the element by default, centered horizontally
        let top = hostPos.top - tooltipPos.height - 6;
        let left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;

        // Check if it goes off screen top, if so put it below
        if (top < 0) {
            top = hostPos.bottom + 6;
        }

        // Check header collision (approximate header height) or generally too high
        if (top < 10) {
            top = hostPos.bottom + 6;
        }

        // Keep within horizontal bounds
        if (left < 5) left = 5;
        if (left + tooltipPos.width > window.innerWidth - 5) {
            left = window.innerWidth - tooltipPos.width - 5;
        }

        this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
        this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
    }

    private hide() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }

        if (this.tooltipElement) {
            this.renderer.removeChild(document.body, this.tooltipElement);
            this.tooltipElement = null;
        }
    }
}
