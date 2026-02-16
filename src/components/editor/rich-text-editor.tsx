'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Highlighter,
  Minus,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// ------- Toolbar Button -------
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  tooltip,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            isActive && 'bg-slate-200 dark:bg-slate-600 text-orange-600 dark:text-orange-400',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ------- Toolbar -------
function Toolbar({ editor }: { editor: Editor }) {
  const addImage = useCallback(() => {
    const url = window.prompt('画像のURLを入力してください');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('リンクURLを入力', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-slate-50/80 dark:bg-slate-800/60 px-2 py-1.5">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          tooltip="元に戻す"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          tooltip="やり直す"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          tooltip="太字"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          tooltip="斜体"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          tooltip="下線"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          tooltip="取り消し線"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          tooltip="ハイライト"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          tooltip="インラインコード"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          tooltip="見出し1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          tooltip="見出し2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          tooltip="見出し3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          tooltip="箇条書き"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          tooltip="番号付きリスト"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          tooltip="引用"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tooltip="水平線"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          tooltip="左揃え"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          tooltip="中央揃え"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          tooltip="右揃え"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Media / Link */}
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          tooltip="リンク"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} tooltip="画像を挿入">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Clear formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          tooltip="書式をクリア"
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

// ------- Main Component -------
interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = '本文を入力...',
  disabled = false,
  className,
  minHeight = '300px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TiptapImage.configure({ inline: false, allowBase64: true }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-orange-600 underline cursor-pointer' },
      }),
      Highlight.configure({ multicolor: false }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none outline-none px-4 py-3',
          'prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
          'prose-p:leading-relaxed prose-p:my-2',
          'prose-blockquote:border-l-4 prose-blockquote:border-orange-300 prose-blockquote:pl-4 prose-blockquote:italic',
          'prose-img:rounded-lg prose-img:shadow-md prose-img:my-4',
          'prose-a:text-orange-600 prose-a:underline',
          'prose-code:bg-slate-100 prose-code:dark:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          'prose-hr:border-slate-200 prose-hr:dark:border-slate-700',
        ),
        style: `min-height: ${minHeight}`,
      },
    },
    immediatelyRender: false,
  });

  // 外部から content が変わったとき（初期読込時など）だけ同期
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // disabled 切り替え
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className={cn('rounded-xl border bg-background', className)} style={{ minHeight }}>
        <div className="flex items-center justify-center h-full py-12 text-muted-foreground text-sm">
          エディタを読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-background overflow-hidden shadow-sm', className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ------- Utilities: HTML ↔ Blocks conversion -------

interface ContentBlock {
  id: string;
  type: string;
  content?: string;
  level?: number;
  order: number;
  src?: string;
  alt?: string;
  items?: string[];
  textAlign?: string;
}

/**
 * DB のブロック配列 → TipTap で使える HTML 文字列
 */
export function blocksToHtml(blocks: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  return blocks
    .sort((a, b) => a.order - b.order)
    .map((block) => {
      switch (block.type) {
        case 'heading': {
          const tag = `h${block.level || 2}`;
          const align = block.textAlign ? ` style="text-align: ${block.textAlign}"` : '';
          return `<${tag}${align}>${block.content || ''}</${tag}>`;
        }
        case 'paragraph': {
          const align = block.textAlign ? ` style="text-align: ${block.textAlign}"` : '';
          return `<p${align}>${block.content || ''}</p>`;
        }
        case 'image':
          return `<img src="${block.src || ''}" alt="${block.alt || ''}" />`;
        case 'blockquote':
          return `<blockquote><p>${block.content || ''}</p></blockquote>`;
        case 'bulletList':
          return `<ul>${(block.items || []).map((item) => `<li><p>${item}</p></li>`).join('')}</ul>`;
        case 'orderedList':
          return `<ol>${(block.items || []).map((item) => `<li><p>${item}</p></li>`).join('')}</ol>`;
        case 'horizontalRule':
          return '<hr />';
        case 'codeBlock':
          return `<pre><code>${block.content || ''}</code></pre>`;
        default:
          return block.content ? `<p>${block.content}</p>` : '';
      }
    })
    .join('');
}

/**
 * TipTap の HTML → DB 用のブロック配列
 */
export function htmlToBlocks(html: string): ContentBlock[] {
  if (!html || html === '<p></p>') return [];

  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  if (!parser) return [];

  const doc = parser.parseFromString(html, 'text/html');
  const blocks: ContentBlock[] = [];
  let order = 0;

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    const id = `block-${order}`;
    const textAlign = (node as HTMLElement).style?.textAlign || undefined;

    if (/^h[1-6]$/.test(tag)) {
      blocks.push({
        id,
        type: 'heading',
        content: node.innerHTML,
        level: parseInt(tag[1]),
        order: order++,
        ...(textAlign && { textAlign }),
      });
    } else if (tag === 'p') {
      const imgChild = node.querySelector('img');
      if (imgChild && node.childNodes.length === 1) {
        blocks.push({
          id,
          type: 'image',
          src: imgChild.getAttribute('src') || '',
          alt: imgChild.getAttribute('alt') || '',
          order: order++,
        });
      } else {
        blocks.push({
          id,
          type: 'paragraph',
          content: node.innerHTML,
          order: order++,
          ...(textAlign && { textAlign }),
        });
      }
    } else if (tag === 'img') {
      blocks.push({
        id,
        type: 'image',
        src: node.getAttribute('src') || '',
        alt: node.getAttribute('alt') || '',
        order: order++,
      });
    } else if (tag === 'blockquote') {
      blocks.push({
        id,
        type: 'blockquote',
        content: node.textContent || '',
        order: order++,
      });
    } else if (tag === 'ul') {
      const items = Array.from(node.querySelectorAll('li')).map((li) => li.textContent || '');
      blocks.push({ id, type: 'bulletList', items, order: order++ });
    } else if (tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li')).map((li) => li.textContent || '');
      blocks.push({ id, type: 'orderedList', items, order: order++ });
    } else if (tag === 'hr') {
      blocks.push({ id, type: 'horizontalRule', order: order++ });
    } else if (tag === 'pre') {
      blocks.push({
        id,
        type: 'codeBlock',
        content: node.textContent || '',
        order: order++,
      });
    }
  };

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      processNode(node as Element);
    }
  });

  return blocks;
}
