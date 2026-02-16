/**
 * コンテンツタイプの定義（管理画面・APIの共通の「値」の一覧）
 *
 * ここが type の「値」の唯一の定義場所です。
 * - 管理画面: このキー（article, news, ...）がDBの contents.type に保存される
 * - フロント: 一覧APIは ?type=news のようにこのキーで絞り込む
 * - フロントで使う値の一覧は GET /api/v1/content-types で取得できる
 */
import {
  FileText,
  Newspaper,
  Star,
  HelpCircle,
  ImageIcon,
  BookOpen,
  Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type EditorType = 'text' | 'qa' | 'gallery';

export interface ContentTypeConfig {
  label: string;
  icon: LucideIcon;
  editor: EditorType;
}

/** キー = API/DBで使う値（value）、label = 表示名 */
export const contentTypeConfig: Record<string, ContentTypeConfig> = {
  article: { label: '記事', icon: FileText, editor: 'text' },
  news: { label: 'ニュース', icon: Newspaper, editor: 'text' },
  page: { label: '固定ページ', icon: FileText, editor: 'text' },
  feature: { label: '特集', icon: Star, editor: 'text' },
  qa: { label: 'Q&A', icon: HelpCircle, editor: 'qa' },
  gallery: { label: 'ギャラリー', icon: ImageIcon, editor: 'gallery' },
  faq: { label: 'FAQ', icon: HelpCircle, editor: 'qa' },
  guide: { label: 'ガイド', icon: BookOpen, editor: 'text' },
  announcement: { label: 'お知らせ', icon: Megaphone, editor: 'text' },
};

export const getContentTypeConfig = (type: string): ContentTypeConfig => {
  return contentTypeConfig[type] || { label: type, icon: FileText, editor: 'text' as const };
};

export const getEditorType = (type: string): EditorType => {
  return getContentTypeConfig(type).editor;
};
