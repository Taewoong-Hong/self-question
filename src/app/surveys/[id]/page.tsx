import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import SurveyClient from './SurveyClient';
import mongoose from 'mongoose';

interface PageProps {
  params: { id: string };
}

// SSG로 정적 정보 렌더링
export default async function SurveyPage({ params }: PageProps) {
  await connectDB();
  
  // ID 형식 확인 (16자리 hex string)
  if (!/^[a-f0-9]{16}$/i.test(params.id)) {
    notFound();
  }

  const survey = await Survey.findOne({ 
    id: params.id, 
    is_deleted: false 
  })
  .select('id title description tags author_nickname created_at status start_at end_at questions public_results')
  .lean()
  .exec();
    
  if (!survey) {
    notFound();
  }
  
  // 서버에서 데이터를 가져와서 클라이언트 컴포넌트에 전달
  // 서버에서 데이터를 가져와서 클라이언트 컴포넌트에 전달
  const surveyData = {
    ...survey
  };
  
  return <SurveyClient survey={JSON.parse(JSON.stringify(surveyData))} />;
}

// 메타데이터 생성 (SEO)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  
  if (!/^[a-f0-9]{16}$/i.test(params.id)) {
    return {
      title: '설문',
      description: '설문에 참여해보세요',
    };
  }
  
  const survey = await Survey.findOne({ id: params.id });
  
  return {
    title: survey?.title || '설문',
    description: survey?.description || '설문에 참여해보세요',
    openGraph: {
      title: survey?.title || '설문',
      description: survey?.description || '설문에 참여해보세요',
      type: 'website',
    },
  };
}

// 빌드 시 정적 생성할 페이지 경로 지정
export async function generateStaticParams() {
  await connectDB();
  
  // 최근 100개 설문만 SSG로 미리 생성
  const surveys = await Survey.find({ is_deleted: false })
    .select('id')
    .sort({ created_at: -1 })
    .limit(100)
    .lean();
    
  return surveys.map((survey) => ({
    id: survey.id,
  }));
}

// 1시간마다 재생성
export const revalidate = 3600;