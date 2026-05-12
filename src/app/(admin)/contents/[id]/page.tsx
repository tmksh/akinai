import { redirect } from 'next/navigation';

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/contents/${id}/edit`);
}
