'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Leaf, Sparkles, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const values = [
  {
    icon: Leaf,
    title: 'サステナビリティ',
    description: '環境に配慮した素材選びと製造プロセスを大切にしています。オーガニックコットンやリサイクル素材を積極的に採用しています。',
  },
  {
    icon: Heart,
    title: '職人の技',
    description: '一つひとつの商品に込められた職人の想い。丁寧な手仕事と伝統的な技術を現代のデザインに融合させています。',
  },
  {
    icon: Sparkles,
    title: '品質へのこだわり',
    description: '長く愛用していただける品質を追求。厳選した素材と確かな縫製で、時間とともに味わいが増す商品を提供します。',
  },
  {
    icon: Users,
    title: 'コミュニティ',
    description: 'お客様、職人、生産者をつなぐコミュニティを大切に。フェアトレードを実践し、関わるすべての人の幸せを目指します。',
  },
];

const team = [
  {
    name: '田中 美咲',
    role: 'ファウンダー / デザイナー',
    image: 'https://picsum.photos/seed/team1/400/400',
    description: '10年間のアパレル業界経験を経て、サステナブルなファッションの実現を目指して起業。',
  },
  {
    name: '山本 健太',
    role: 'プロダクトマネージャー',
    image: 'https://picsum.photos/seed/team2/400/400',
    description: '品質管理のスペシャリスト。世界中の工場を訪問し、最高の製品づくりをサポート。',
  },
  {
    name: '佐藤 あゆみ',
    role: 'マーケティング',
    image: 'https://picsum.photos/seed/team3/400/400',
    description: 'ブランドストーリーを伝えるクリエイティブディレクション。SNSでの発信を担当。',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <Image
          src="https://picsum.photos/seed/about-hero/1600/900"
          alt="About Hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            私たちについて
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            心地よい暮らしと持続可能な未来のために
          </p>
        </div>
      </section>

      {/* ストーリー */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              私たちのストーリー
            </h2>
          </div>
          <div className="prose prose-lg prose-slate mx-auto">
            <p>
              商いストアは、2020年に東京で誕生しました。
              「本当に良いものを、適正な価格で届けたい」という想いから始まったこのショップは、
              今では多くのお客様に愛される存在となりました。
            </p>
            <p>
              私たちが大切にしているのは、モノの背景にあるストーリーです。
              誰がどのような想いで作ったのか、どのような素材が使われているのか、
              そして使い終わった後はどうなるのか。
              そのすべてを考慮した上で、自信を持ってお届けできる商品だけを取り扱っています。
            </p>
            <p>
              大量生産・大量消費の時代に疑問を感じていませんか？
              私たちは、長く使える上質なモノを選ぶことが、結果的に環境にも財布にも優しいと信じています。
              「安いから買う」ではなく「好きだから買う」。
              そんなお買い物体験を提供することが、私たちの使命です。
            </p>
          </div>
        </div>
      </section>

      {/* バリュー */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              私たちの価値観
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              商いストアのすべての活動の根底にある4つの価値観
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-50 rounded-full flex items-center justify-center">
                  <value.icon className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 数字で見る商い */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-500 to-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              数字で見る商いストア
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10,000+', label: '満足いただいたお客様' },
              { value: '50+', label: '提携する職人・工房' },
              { value: '98%', label: 'リピート率' },
              { value: '4.9', label: '平均評価' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-4xl md:text-5xl font-bold mb-2">
                  {stat.value}
                </p>
                <p className="text-white/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* チーム */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              チーム
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              商いストアを支えるメンバーをご紹介します
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <div className="relative w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {member.name}
                </h3>
                <p className="text-orange-500 text-sm font-medium mb-2">
                  {member.role}
                </p>
                <p className="text-sm text-slate-600">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            一緒に、心地よい暮らしを
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            私たちの想いに共感してくださった方、ぜひ一度商品をご覧ください。
            きっとお気に入りが見つかるはずです。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop/products">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 gap-2">
                商品を見る
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/shop/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                お問い合わせ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

