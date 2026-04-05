import Link from 'next/link';

export const metadata = {
  title: '利用規約 | AKINAI',
  description: 'AKINAIの利用規約をご確認ください。',
};

export default function TermsPage() {
  const sections = [
    {
      title: '第1条（適用）',
      content: `本利用規約（以下「本規約」）は、AKINAI（以下「当社」）が提供するB2B向けECおよびCMSプラットフォーム「AKINAI」（以下「本サービス」）の利用に関する条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」）には、本規約に従って本サービスをご利用いただきます。`,
    },
    {
      title: '第2条（利用登録）',
      content: `1. 本サービスへの登録は、所定の方法で申し込みを行い、当社が承認することで完了します。\n2. 当社は、以下に該当すると判断した場合、利用登録を拒否することがあります。\n\n・虚偽の情報を申告した場合\n・過去に本規約に違反したことがある場合\n・その他、当社が不適切と判断した場合`,
    },
    {
      title: '第3条（ユーザーIDおよびパスワード）',
      content: `1. ユーザーは、自己の責任においてユーザーIDおよびパスワードを管理するものとします。\n2. ユーザーIDおよびパスワードを第三者に譲渡・貸与・共用してはなりません。\n3. ユーザーID・パスワードの不正利用による損害について、当社は一切の責任を負いません。`,
    },
    {
      title: '第4条（利用料金）',
      content: `1. 本サービスの利用料金は、当社が別途定める料金プランに従います。\n2. ユーザーは、選択したプランの料金を所定の方法で支払うものとします。\n3. 支払い済みの料金は、理由の如何にかかわらず返金いたしません（法令に別途定めがある場合を除く）。`,
    },
    {
      title: '第5条（禁止事項）',
      content: `ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。\n\n・法令または公序良俗に違反する行為\n・当社または第三者の知的財産権・プライバシー・名誉を侵害する行為\n・本サービスを不正に複製・改変・リバースエンジニアリングする行為\n・本サービスのサーバーや設備に過度な負荷をかける行為\n・スパム・フィッシング等の迷惑行為\n・その他、当社が不適切と判断する行為`,
    },
    {
      title: '第6条（サービスの変更・停止）',
      content: `1. 当社は、事前の通知なしに本サービスの内容を変更・追加・削除することがあります。\n2. 以下の場合、当社は事前通知なしに本サービスを一時停止または終了することがあります。\n\n・システムのメンテナンス・障害対応\n・天災・停電等の不可抗力\n・その他、当社が必要と判断した場合\n\n3. 本サービスの変更・停止によりユーザーに生じた損害について、当社は責任を負いません。`,
    },
    {
      title: '第7条（知的財産権）',
      content: `本サービスおよびこれに関連するすべてのコンテンツ（ソフトウェア、デザイン、テキスト等）の知的財産権は当社に帰属します。ユーザーは、本規約で明示的に許可された範囲を超えて、これらを使用・複製・配布することはできません。\n\nただし、ユーザーが本サービスに登録したデータ・コンテンツの知的財産権はユーザーに帰属します。`,
    },
    {
      title: '第8条（免責事項）',
      content: `1. 当社は、本サービスの完全性・正確性・有用性について保証しません。\n2. 本サービスの利用または利用不能によって生じた損害（逸失利益・データ損失等を含む）について、当社の故意または重大な過失がある場合を除き、責任を負いません。\n3. 当社の責任が認められる場合でも、その賠償額は当該月の利用料金を上限とします。`,
    },
    {
      title: '第9条（契約解除）',
      content: `1. ユーザーは、所定の手続きにより、いつでも本サービスの利用を解約できます。\n2. ユーザーが本規約に違反した場合、当社は事前通知なしにアカウントを停止・削除することがあります。\n3. 解約後のデータについては、当社所定の保存期間経過後に削除されます。`,
    },
    {
      title: '第10条（準拠法・管轄）',
      content: `本規約の解釈は日本法に準拠します。本サービスに関して生じた紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。`,
    },
    {
      title: '付則',
      content: `本規約は2026年1月1日より施行します。`,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 40%, #f8faff 100%)' }}>
      {/* ナビ */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'rgba(255,255,255,0.85)', borderColor: '#bae6fd' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tight" style={{
            background: 'linear-gradient(90deg, #0ea5e9, #2563eb)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            AKINAI
          </Link>
          <Link href="/" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-sky-50" style={{ color: '#2563eb' }}>
            ← トップページへ
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-3" style={{ color: '#0ea5e9' }}>Terms of Service</p>
          <h1 className="text-4xl font-black tracking-tight mb-4" style={{ color: '#1e3a5f' }}>利用規約</h1>
          <p className="text-sm" style={{ color: '#4a6fa5' }}>最終更新日：2026年1月1日</p>
        </div>

        <div className="rounded-2xl p-8 shadow-lg space-y-8" style={{ background: '#ffffff', border: '1px solid #bae6fd' }}>
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-base font-bold mb-3" style={{ color: '#1e3a5f' }}>{section.title}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#4a6fa5' }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:text-sky-600 transition-colors"
            style={{ color: '#0ea5e9' }}
          >
            本規約に関するお問い合わせはこちら →
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-8 border-t mt-16" style={{ borderColor: '#bae6fd' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: '#4a6fa5' }}>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-sky-400 transition-colors">お問い合わせ</Link>
            <Link href="/privacy" className="hover:text-sky-400 transition-colors">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-sky-400 transition-colors">利用規約</Link>
          </div>
          <p>&copy; 2026 AKINAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
