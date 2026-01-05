'use client';

import { useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Smartphone, 
  Tablet, 
  Monitor,
  Plus,
  Trash2,
  GripVertical,
  Lock,
  Unlock,
  Type,
  AlignLeft,
  Image as ImageIcon,
  MousePointer,
  Quote,
  List,
  Minus,
  MoreVertical,
  Undo2,
  Redo2,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { 
  ContentBlock, 
  ContentPage, 
  sampleContent,
} from '@/types/content-blocks';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceType, { width: number; height: number }> = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

export default function ContentEditorPage() {
  const [content, setContent] = useState<ContentPage>(sampleContent);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceType>('mobile');
  const [isSaving, setIsSaving] = useState(false);

  // ブロックの更新
  const updateBlock = useCallback((blockId: string, updates: Partial<ContentBlock>) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId ? { ...block, ...updates } as ContentBlock : block
      ),
    }));
  }, []);

  // ブロックの削除
  const deleteBlock = useCallback((blockId: string) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== blockId),
    }));
    setSelectedBlockId(null);
  }, []);

  // ブロックの追加
  const addBlock = useCallback((type: ContentBlock['type'], afterBlockId?: string) => {
    const newBlock = createNewBlock(type);
    setContent(prev => {
      if (!afterBlockId) {
        return { ...prev, blocks: [...prev.blocks, newBlock] };
      }
      const index = prev.blocks.findIndex(b => b.id === afterBlockId);
      const newBlocks = [...prev.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return { ...prev, blocks: newBlocks };
    });
    setSelectedBlockId(newBlock.id);
  }, []);

  // ブロックのロック切り替え
  const toggleLock = useCallback((blockId: string) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId ? { ...block, locked: !block.locked } : block
      ),
    }));
  }, []);

  // 保存処理
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-slate-100">
        {/* ヘッダー */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/contents">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>戻る</TooltipContent>
              </Tooltip>
            </Link>
            
            <div className="h-8 w-px bg-border" />
            
            <div>
              <h1 className="font-semibold text-sm">{content.title}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(content.updatedAt).toLocaleString('ja-JP')} 更新
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 編集ツールバー */}
            <div className="flex items-center gap-1 mr-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>元に戻す</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>やり直す</TooltipContent>
              </Tooltip>
            </div>
            
            <Badge variant={content.status === 'published' ? 'default' : 'secondary'} className="mr-2">
              {content.status === 'published' ? '公開中' : '下書き'}
            </Badge>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              設定
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              プレビュー
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </header>

        {/* メインエリア */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側: エディタ */}
          <div className="w-[45%] overflow-auto p-6 bg-slate-50">
            <div className="max-w-lg mx-auto space-y-3">
              {/* タイトル編集 */}
              <Card className="p-4 bg-white border-0 shadow-sm">
                <label className="text-xs text-muted-foreground uppercase font-medium mb-2 block">
                  ページタイトル
                </label>
                <Input
                  value={content.title}
                  onChange={(e) => setContent(prev => ({ ...prev, title: e.target.value }))}
                  className="text-xl font-bold border-0 bg-transparent px-0 focus-visible:ring-0"
                  placeholder="タイトルを入力..."
                />
              </Card>

              {/* ブロック一覧 */}
              {content.blocks.map((block) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onUpdate={(updates) => updateBlock(block.id, updates)}
                  onDelete={() => deleteBlock(block.id)}
                  onToggleLock={() => toggleLock(block.id)}
                  onAddAfter={(type) => addBlock(type, block.id)}
                />
              ))}

              {/* ブロック追加ボタン */}
              <AddBlockButton onAdd={(type) => addBlock(type)} />
            </div>
          </div>

          {/* 右側: プレビュー */}
          <div className="w-[55%] bg-slate-200/50 flex flex-col">
            {/* デバイス切り替え */}
            <div className="h-12 flex items-center justify-center gap-1 bg-white/80 backdrop-blur border-b">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={device === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDevice('mobile')}
                    className={device === 'mobile' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>モバイル</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={device === 'tablet' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDevice('tablet')}
                    className={device === 'tablet' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>タブレット</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={device === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDevice('desktop')}
                    className={device === 'desktop' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>デスクトップ</TooltipContent>
              </Tooltip>
            </div>

            {/* プレビューエリア */}
            <div className="flex-1 flex items-start justify-center p-8 overflow-auto">
              <DevicePreview 
                device={device} 
                content={content}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ブロックエディタコンポーネント
function BlockEditor({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onToggleLock,
  onAddAfter,
}: {
  block: ContentBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onAddAfter: (type: ContentBlock['type']) => void;
}) {
  return (
    <Card 
      className={`relative p-4 cursor-pointer transition-all border-0 shadow-sm bg-white ${
        isSelected ? 'ring-2 ring-orange-500 shadow-md' : 'hover:shadow-md'
      } ${block.locked ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* ブロックヘッダー */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <GripVertical className="h-4 w-4 cursor-grab opacity-40 hover:opacity-100" />
        <span className="uppercase font-medium tracking-wide">{getBlockTypeLabel(block.type)}</span>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
            >
              {block.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-40" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{block.locked ? 'ロック解除' : 'ロック'}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddAfter('paragraph')}>
              <Plus className="h-4 w-4 mr-2" />
              下にブロック追加
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ブロックコンテンツ編集 */}
      {!block.locked && (
        <BlockContent block={block} onUpdate={onUpdate} />
      )}
      {block.locked && (
        <div className="text-sm text-muted-foreground italic py-2">
          🔒 このブロックはロックされています
        </div>
      )}
    </Card>
  );
}

// ブロックコンテンツ編集
function BlockContent({
  block,
  onUpdate,
}: {
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-2">
          <Select
            value={String(block.level)}
            onValueChange={(v) => onUpdate({ level: Number(v) as 1 | 2 | 3 })}
          >
            <SelectTrigger className="w-20 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
              <SelectItem value="3">H3</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="text-lg font-bold border-slate-200"
            placeholder="見出しを入力..."
          />
        </div>
      );

    case 'paragraph':
      return (
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="本文を入力..."
          className="min-h-[80px] resize-none border-slate-200"
        />
      );

    case 'image':
      return (
        <div className="space-y-2">
          <Input
            value={block.src}
            onChange={(e) => onUpdate({ src: e.target.value })}
            placeholder="画像URL"
            className="text-sm border-slate-200"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={block.alt}
              onChange={(e) => onUpdate({ alt: e.target.value })}
              placeholder="代替テキスト"
              className="text-sm border-slate-200"
            />
            <Input
              value={block.caption || ''}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="キャプション"
              className="text-sm border-slate-200"
            />
          </div>
          {block.src && (
            <img 
              src={block.src} 
              alt={block.alt} 
              className="w-full h-32 object-cover rounded-lg"
            />
          )}
        </div>
      );

    case 'button':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="ボタンテキスト"
              className="text-sm border-slate-200"
            />
            <Select
              value={block.variant}
              onValueChange={(v) => onUpdate({ variant: v as 'primary' | 'secondary' | 'outline' })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="リンクURL"
            className="text-sm border-slate-200"
          />
        </div>
      );

    case 'quote':
      return (
        <div className="space-y-2">
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="引用文を入力..."
            className="italic min-h-[60px] border-slate-200"
          />
          <Input
            value={block.author || ''}
            onChange={(e) => onUpdate({ author: e.target.value })}
            placeholder="引用元（任意）"
            className="text-sm border-slate-200"
          />
        </div>
      );

    case 'list':
      return (
        <div className="space-y-2">
          <Select
            value={block.style}
            onValueChange={(v) => onUpdate({ style: v as 'bullet' | 'number' })}
          >
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bullet">箇条書き</SelectItem>
              <SelectItem value="number">番号付き</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={block.items.join('\n')}
            onChange={(e) => onUpdate({ items: e.target.value.split('\n').filter(Boolean) })}
            placeholder="1行ずつ入力..."
            className="min-h-[80px] border-slate-200"
          />
        </div>
      );

    case 'spacer':
      return (
        <div className="flex items-center gap-2 py-2">
          <span className="text-sm text-muted-foreground">高さ:</span>
          <Input
            type="number"
            value={block.height}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            className="w-20 h-7 text-sm border-slate-200"
          />
          <span className="text-sm text-muted-foreground">px</span>
        </div>
      );

    case 'divider':
      return (
        <div className="py-2">
          <hr className="border-slate-300" />
        </div>
      );

    default:
      return null;
  }
}

// ブロック追加ボタン
function AddBlockButton({ onAdd }: { onAdd: (type: ContentBlock['type']) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-slate-300 bg-white/50 hover:bg-white">
          <Plus className="h-4 w-4 mr-2" />
          ブロックを追加
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem onClick={() => onAdd('heading')}>
          <Type className="h-4 w-4 mr-2 text-blue-500" />
          見出し
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('paragraph')}>
          <AlignLeft className="h-4 w-4 mr-2 text-slate-500" />
          本文
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('image')}>
          <ImageIcon className="h-4 w-4 mr-2 text-green-500" />
          画像
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('button')}>
          <MousePointer className="h-4 w-4 mr-2 text-orange-500" />
          ボタン
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('quote')}>
          <Quote className="h-4 w-4 mr-2 text-purple-500" />
          引用
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('list')}>
          <List className="h-4 w-4 mr-2 text-cyan-500" />
          リスト
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAdd('divider')}>
          <Minus className="h-4 w-4 mr-2 text-slate-400" />
          区切り線
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('spacer')}>
          <div className="h-4 w-4 mr-2 border-2 border-dashed border-slate-400 rounded" />
          スペーサー
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// デバイスプレビュー
function DevicePreview({ 
  device, 
  content,
  selectedBlockId,
  onSelectBlock,
}: { 
  device: DeviceType; 
  content: ContentPage;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
}) {
  const size = deviceSizes[device];

  return (
    <div className="relative flex-shrink-0">
      {/* モバイルフレーム */}
      {device === 'mobile' && (
        <div className="relative">
          {/* iPhone風フレーム */}
          <div 
            className="bg-slate-900 rounded-[50px] p-3 shadow-2xl"
            style={{ width: size.width + 24, height: size.height + 24 }}
          >
            {/* Dynamic Island */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-full z-10" />
            {/* 画面 */}
            <div 
              className="bg-white rounded-[42px] overflow-hidden relative"
              style={{ width: size.width, height: size.height }}
            >
              <div className="overflow-auto h-full">
                <PreviewContent 
                  content={content} 
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* タブレットフレーム */}
      {device === 'tablet' && (
        <div 
          className="bg-slate-900 rounded-[24px] p-3 shadow-2xl"
          style={{ 
            width: size.width * 0.65 + 24, 
            height: size.height * 0.65 + 24,
          }}
        >
          <div 
            className="bg-white rounded-lg overflow-hidden"
            style={{ width: size.width * 0.65, height: size.height * 0.65 }}
          >
            <div className="overflow-auto h-full" style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: size.width, height: size.height / 0.65 }}>
              <PreviewContent 
                content={content} 
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
              />
            </div>
          </div>
        </div>
      )}

      {/* デスクトップフレーム */}
      {device === 'desktop' && (
        <div 
          className="shadow-2xl rounded-lg overflow-hidden"
          style={{ 
            width: size.width * 0.55, 
            height: size.height * 0.55 + 28,
          }}
        >
          {/* ブラウザヘッダー */}
          <div className="h-7 bg-slate-200 flex items-center gap-2 px-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded h-4 mx-4 px-2 text-[10px] text-slate-400 flex items-center">
              example.com/{content.slug}
            </div>
          </div>
          <div 
            className="bg-white overflow-auto"
            style={{ 
              width: size.width * 0.55, 
              height: size.height * 0.55,
            }}
          >
            <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: size.width }}>
              <PreviewContent 
                content={content} 
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// プレビューコンテンツ
function PreviewContent({ 
  content,
  selectedBlockId,
  onSelectBlock,
}: { 
  content: ContentPage;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
}) {
  return (
    <div className="p-6 font-sans">
      {content.blocks.map((block) => (
        <div 
          key={block.id}
          onClick={() => onSelectBlock(block.id)}
          className={`cursor-pointer transition-all rounded ${
            selectedBlockId === block.id 
              ? 'ring-2 ring-orange-500 ring-offset-2 bg-orange-50/50' 
              : 'hover:bg-slate-50'
          }`}
        >
          <PreviewBlock block={block} />
        </div>
      ))}
    </div>
  );
}

// プレビューブロック
function PreviewBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      const HeadingTag = `h${block.level}` as 'h1' | 'h2' | 'h3';
      const headingStyles = {
        1: 'text-2xl font-bold mb-4 text-slate-900',
        2: 'text-xl font-semibold mb-3 text-slate-800',
        3: 'text-lg font-medium mb-2 text-slate-700',
      };
      return <HeadingTag className={headingStyles[block.level]}>{block.content || '見出しを入力...'}</HeadingTag>;

    case 'paragraph':
      return <p className="text-slate-600 leading-relaxed mb-4">{block.content || '本文を入力...'}</p>;

    case 'image':
      return (
        <figure className="mb-4">
          {block.src ? (
            <img 
              src={block.src} 
              alt={block.alt}
              className="w-full rounded-xl"
            />
          ) : (
            <div className="w-full h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {block.caption && (
            <figcaption className="text-sm text-slate-500 mt-2 text-center">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'button':
      const buttonStyles = {
        primary: 'bg-orange-500 text-white hover:bg-orange-600',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
        outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-50',
      };
      return (
        <div className="mb-4">
          <button className={`px-6 py-3 rounded-xl font-medium transition-colors ${buttonStyles[block.variant]}`}>
            {block.text}
          </button>
        </div>
      );

    case 'quote':
      return (
        <blockquote className="border-l-4 border-orange-500 pl-4 italic text-slate-600 mb-4 bg-orange-50/50 py-3 pr-3 rounded-r-lg">
          <p>{block.content || '引用文を入力...'}</p>
          {block.author && (
            <cite className="text-sm text-slate-500 not-italic mt-2 block">— {block.author}</cite>
          )}
        </blockquote>
      );

    case 'list':
      const ListTag = block.style === 'number' ? 'ol' : 'ul';
      return (
        <ListTag className={`mb-4 pl-5 ${block.style === 'number' ? 'list-decimal' : 'list-disc'}`}>
          {block.items.length > 0 ? (
            block.items.map((item, i) => (
              <li key={i} className="text-slate-600 mb-1">{item}</li>
            ))
          ) : (
            <li className="text-slate-400">リストアイテムを入力...</li>
          )}
        </ListTag>
      );

    case 'spacer':
      return <div style={{ height: block.height }} className="bg-slate-50/50" />;

    case 'divider':
      return <hr className="my-6 border-slate-200" />;

    default:
      return null;
  }
}

// ユーティリティ関数
function getBlockTypeLabel(type: ContentBlock['type']): string {
  const labels: Record<ContentBlock['type'], string> = {
    heading: '見出し',
    paragraph: '本文',
    image: '画像',
    button: 'ボタン',
    spacer: 'スペーサー',
    divider: '区切り線',
    quote: '引用',
    list: 'リスト',
  };
  return labels[type];
}

function createNewBlock(type: ContentBlock['type']): ContentBlock {
  const id = `block-${Date.now()}`;
  const base = { id, locked: false };

  switch (type) {
    case 'heading':
      return { ...base, type: 'heading', content: '', level: 2 };
    case 'paragraph':
      return { ...base, type: 'paragraph', content: '' };
    case 'image':
      return { ...base, type: 'image', src: '', alt: '' };
    case 'button':
      return { ...base, type: 'button', text: 'ボタン', url: '', variant: 'primary' };
    case 'quote':
      return { ...base, type: 'quote', content: '' };
    case 'list':
      return { ...base, type: 'list', items: [], style: 'bullet' };
    case 'spacer':
      return { ...base, type: 'spacer', height: 32, locked: false };
    case 'divider':
      return { ...base, type: 'divider' };
    default:
      return { ...base, type: 'paragraph', content: '' };
  }
}



