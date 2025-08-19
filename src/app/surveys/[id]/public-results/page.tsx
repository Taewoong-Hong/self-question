import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import PublicResultsClient from './PublicResultsClient';

interface PageProps {
  params: { id: string };
}

export default async function PublicResultsPage({ params }: PageProps) {
  await connectDB();
  
  const survey = await Survey.findOne({ 
    id: params.id, 
    is_deleted: false 
  })
  .select('id title description tags author_nickname created_at status start_at end_at questions stats public_results')
  .lean() // 이미 lean() 사용 중 - POJO로 변환됨
  .exec();
    
  if (!survey) {
    notFound();
  }

  // public_results가 false인 경우
  if (survey.public_results === false) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">비공개 결과</h1>
          <p className="text-zinc-400">이 설문의 결과는 작성자만 확인할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // 서버에서 공개 결과 데이터 가져오기
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const resultsResponse = await fetch(`${baseUrl}/api/surveys/${params.id}/public-results`, {
      cache: 'no-store'
    });

    if (!resultsResponse.ok) {
      if (resultsResponse.status === 403) {
        return (
          <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold mb-4">비공개 결과</h1>
              <p className="text-zinc-400">이 설문의 결과는 작성자만 확인할 수 있습니다.</p>
            </div>
          </div>
        );
      }
      throw new Error('결과 조회 실패');
    }

    const results = await resultsResponse.json();
    
    // 디버깅: results 구조 확인
    console.log('Results from API:', JSON.stringify(results, null, 2));
    
    return <PublicResultsClient 
      survey={JSON.parse(JSON.stringify(survey))} 
      results={results}
    />;
  } catch (error) {
    console.error('결과 조회 실패:', error);
    notFound();
  }
}

// 동적 렌더링 설정
export const dynamic = 'force-dynamic';