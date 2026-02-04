export type BlockType = 'container' | 'text' | 'textarea' | 'image' | 'badge' | 'generic';

export interface BlockStyle {
  [key: string]: string | number;
}

export interface Block {
  id: string;
  type: BlockType;
  name: string;
  children: Block[];
  styles: BlockStyle;
  cssClass: string;
  extraClasses?: string[];
  tagName?: string;
  attributes?: Record<string, string>;
  content: string; // Text content or Image URL
  innerHTML?: string; // For rich HTML content
  isRoot?: boolean;
  expanded?: boolean; // For tree view
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
}
