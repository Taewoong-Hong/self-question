import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import DebateClient from './DebateClient';

interface PageProps {
  params: { id: string };
}

// SSG로 정적 정보 렌더링
export default async function DebatePage({ params }: PageProps) {
  await connectDB();
  
  const debate = await Debate.findOne({ 
    id: params.id, 
    is_deleted: false 
  })
  .select('id title description tags author_nickname created_at status start_at end_at is_anonymous allow_comments')
  .lean()
  .exec();
    
  if (!debate) {
    notFound();
  }
  
  // 서버에서 데이터를 가져와서 클라이언트 컴포넌트에 전달
  return <DebateClient debate={JSON.parse(JSON.stringify(debate))} />;
}

// 메타데이터 생성 (SEO)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const debate = await Debate.findOne({ id: params.id });
  
  return {
    title: debate?.title || '투표',
    description: debate?.description || '투표에 참여해보세요',
    openGraph: {
      title: debate?.title || '투표',
      description: debate?.description || '투표에 참여해보세요',
      type: 'website',
    },
  };
}

// 빌드 시 정적 생성할 페이지 경로 지정
export async function generateStaticParams() {
  await connectDB();
  
  // 최근 100개 투표만 SSG로 미리 생성
  const debates = await Debate.find({ is_deleted: false })
    .select('id')
    .sort({ created_at: -1 })
    .limit(100)
    .lean();
    
  return debates.map((debate) => ({
    id: debate.id,
  }));
}

// 1시간마다 재생성
export const revalidate = 3600;