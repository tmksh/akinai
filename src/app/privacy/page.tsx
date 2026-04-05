import Link from 'next/link';

export const metadata = {
  title: 'プライバシーポリシー | AKINAI',
  description: 'AKINAIのプライバシーポリシーをご確認ください。',
};

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. 取得する情報',
      content: `当社は、以下の情報をお客様から取得することがあります。\n\n・お名前、会社名、メールアドレス、電話番号等の連絡先情報\n・サービスのご利用に関するデータ（ログイン情報、操作履歴、設定情報等）\n・お支払いに関する情報（クレジットカード情報等は決済代行会社が管理します）\n・お問い合わせ内容・サポート履歴\n・ブラウザの種類・バージョン、アクセスログ等の技術情報`,
    },
    {
      title: '2. 情報の利用目的',
      content: `取得した情報は以下の目的で利用します。\n\n・サービスの提供・運営・改善\n・お客様からのお問い合わせへの対応\n・ご利用状況の分析・統計処理（個人を特定しない形式）\n・新機能・サービス変更・重要なお知らせのご連絡\n・利用規約違反・不正利用の防止および対応`,
    },
    {
      title: '3. 情報の第三者提供',
      content: `当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。\n\n・お客様の同意がある場合\n・法令に基づく開示が必要な場合\n・人の生命、身体または財産の保護のために必要な場合\n・サービス提供に必要な業務委託先（クラウドサービス事業者等）への提供（適切な監督を行います）`,
    },
    {
      title: '4. 情報の管理',
      content: `当社は、お客様の個人情報を正確かつ最新の状態に保つとともに、不正アクセス・紛失・破損・改ざん・漏洩等を防止するために、適切なセキュリティ対策を実施します。\n\nデータは国内または適切な水準の保護措置が講じられた国に保管されます。`,
    },
    {
      title: '5. Cookie の使用',
      content: `本サービスでは、サービスの利便性向上・利用状況の分析を目的として Cookie を使用する場合があります。ブラウザの設定により Cookie を無効にすることができますが、一部の機能が正常に動作しなくなる場合があります。`,
    },
    {
      title: '6. お客様の権利',
      content: `お客様は、当社が保有するご自身の個人情報について、開示・訂正・削除・利用停止を求める権利を有します。ご希望の場合は、下記お問い合わせ先までご連絡ください。合理的な期間内にご対応いたします。`,
    },
    {
      title: '7. 未成年者の個人情報',
      content: `本サービスは法人・事業者向けのサービスです。18歳未満の方が本サービスをご利用される場合は、保護者の同意を得たうえでご利用ください。`,
    },
    {
      title: '8. プライバシーポリシーの改定',
      content: `当社は、法令の変更やサービス内容の変更に応じて、本プライバシーポリシーを予告なく改定することがあります。重要な変更がある場合は、サービス上でお知らせします。改定後に本サービスを継続してご利用いただいた場合、改定後のポリシーに同意されたものとみなします。`,
    },
    {
      title: '9. お問い合わせ',
      content: `本プライバシーポリシーに関するご質問・個人情報の取り扱いに関するご相談は、以下のお問い合わせフォームよりご連絡ください。`,
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
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-3" style={{ color: '#0ea5e9' }}>Privacy Policy</p>
          <h1 className="text-4xl font-black tracking-tight mb-4" style={{ color: '#1e3a5f' }}>プライバシーポリシー</h1>
          <p className="text-sm" style={{ color: '#4a6fa5' }}>最終更新日：2026年1月1日</p>
        </div>

        <div className="rounded-2xl p-8 shadow-lg space-y-8" style={{ background: '#ffffff', border: '1px solid #bae6fd' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#4a6fa5' }}>
            AKINAI（以下「当社」）は、お客様の個人情報の保護を重要な責務と考え、以下のプライバシーポリシーに従って適切に取り扱います。本サービスをご利用いただくことで、本ポリシーの内容にご同意いただいたものとみなします。
          </p>

          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-base font-bold mb-3" style={{ color: '#1e3a5f' }}>{section.title}</h2>
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#4a6fa5' }}>
                {section.content}
                {section.title === '9. お問い合わせ' && (
                  <div className="mt-3">
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-1 font-semibold text-sky-500 hover:text-sky-600 transition-colors underline underline-offset-2"
                    >
                      お問い合わせフォームはこちら →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
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
