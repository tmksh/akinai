// コンテンツブロックの型定義

export type BlockType = 
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'spacer'
  | 'divider'
  | 'quote'
  | 'list';

export interface BaseBlock {
  id: string;
  type: BlockType;
  locked: boolean; // ロック状態（編集不可）
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  url: string;
  variant: 'primary' | 'secondary' | 'outline';
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: number; // px
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  content: string;
  author?: string;
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  items: string[];
  style: 'bullet' | 'number';
}

export type ContentBlock = 
  | HeadingBlock 
  | ParagraphBlock 
  | ImageBlock 
  | ButtonBlock 
  | SpacerBlock 
  | DividerBlock
  | QuoteBlock
  | ListBlock;

export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  blocks: ContentBlock[];
  status: 'draft' | 'published';
  updatedAt: string;
}

// サンプルコンテンツ
export const sampleContent: ContentPage = {
  id: '1',
  title: '春の新作コレクション',
  slug: 'spring-collection-2024',
  status: 'draft',
  updatedAt: new Date().toISOString(),
  blocks: [
    {
      id: 'block-1',
      type: 'heading',
      content: '春の新作コレクション 2024',
      level: 1,
      locked: false,
    },
    {
      id: 'block-2',
      type: 'paragraph',
      content: '今年も春がやってきました。自然の息吹を感じる新作アイテムをご紹介します。厳選された素材と職人の技が光る、特別なコレクションです。',
      locked: false,
    },
    {
      id: 'block-3',
      type: 'image',
      src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      alt: '春の新作商品イメージ',
      caption: '新作のオーガニックコットンTシャツ',
      locked: false,
    },
    {
      id: 'block-4',
      type: 'heading',
      content: 'こだわりのポイント',
      level: 2,
      locked: false,
    },
    {
      id: 'block-5',
      type: 'list',
      items: [
        'オーガニックコットン100%使用',
        '日本国内で丁寧に縫製',
        '環境に配慮した染色技術',
        '長く愛用できる耐久性',
      ],
      style: 'bullet',
      locked: false,
    },
    {
      id: 'block-6',
      type: 'quote',
      content: '「着心地の良さと、地球への優しさを両立させたい」',
      author: 'デザイナー 山田太郎',
      locked: false,
    },
    {
      id: 'block-7',
      type: 'spacer',
      height: 32,
      locked: true,
    },
    {
      id: 'block-8',
      type: 'button',
      text: 'コレクションを見る',
      url: '/products?collection=spring-2024',
      variant: 'primary',
      locked: false,
    },
  ],
};

