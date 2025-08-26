import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import SurveyResultsClient from './SurveyResultsClient';

interface PageProps {
  params: { id: string };
}

export default async function SurveyResultsPage({ params }: PageProps) {
  await connectDB();
  
  const survey = await Survey.findOne({ 
    id: params.id, 
    is_deleted: false 
  })
  .select('id title description tags author_nickname created_at status start_at end_at questions stats')
  .lean()
  .exec();
    
  if (!survey) {
    notFound();
  }

  // 관리자 토큰 확인을 위한 헤더 정보 가져오기
  const headersList = headers();
  const cookie = headersList.get('cookie') || '';
  
  // 쿠키에서 관리자 토큰 확인
  const adminToken = cookie.split(';')
    .find(c => c.trim().startsWith(`survey_author_${params.id}=`))
    ?.split('=')[1];

  // 관리자 토큰이 없으면 설문 페이지로 리다이렉트
  if (!adminToken) {
    redirect(`/surveys/${params.id}`);
  }

  // 서버에서 설문 결과 데이터 가져오기
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const resultsResponse = await fetch(`${baseUrl}/api/surveys/${params.id}/results`, {
      headers: {
        'Cookie': `survey_author_${params.id}=${adminToken}`
      },
      cache: 'no-store'
    });

    if (!resultsResponse.ok) {
      // 인증 실패 시 설문 페이지로 리다이렉트
      redirect(`/surveys/${params.id}`);
    }

    const results = await resultsResponse.json();

    return <SurveyResultsClient 
      survey={JSON.parse(JSON.stringify(survey))} 
      initialResults={results}
      isAuthenticated={true}
    />;
  } catch (error) {
    console.error('결과 조회 실패:', error);
    redirect(`/surveys/${params.id}`);
  }
}

// 동적 렌더링 설정 (관리자 인증 필요)
export const dynamic = 'force-dynamic';