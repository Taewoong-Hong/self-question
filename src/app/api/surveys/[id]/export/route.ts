import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import Response from '@/models/Response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeCSV(value: any): string {
  if (value == null) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // 인증 토큰 확인 - 쿠키 또는 Authorization 헤더에서 확인
    const cookieStore = request.cookies;
    const authorCookie = cookieStore.get(`survey_author_${params.id}`)?.value;  // 작성자 쿠키
    const adminCookie = cookieStore.get('admin_token')?.value;  // 슈퍼 관리자 쿠키
    
    console.log('[RT] export survey', params.id, 'author?', !!authorCookie, 'admin?', !!adminCookie);
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    // 쿠키 우선, 그 다음 Authorization 헤더
    const authToken = authorCookie || adminCookie || headerToken;
    
    if (!authToken) {
      console.log('[RT] No auth token found');
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 401 }
      );
    }
    
    const survey = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    }).select('_id title questions admin_token');
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 토큰 검증 - 슈퍼 관리자면 항상 허용
    if (adminCookie) {
      console.log('[RT] Admin access granted');
      // 슈퍼 관리자는 모든 설문 접근 가능
    } else if (survey.admin_token !== authToken) {
      console.log('[RT] Author token mismatch');
      return NextResponse.json(
        { error: '작성자 권한이 없습니다' },
        { status: 401 }
      );
    }

    // 응답 데이터 가져오기
    const responses = await Response.find({
      survey_ref: survey._id
    }).select('answers created_at respondent_ip').sort({ created_at: 1 });

    // CSV 헤더 생성
    const headers = ['응답 시간', 'IP'];
    survey.questions.forEach((question: any) => {
      headers.push(escapeCSV(question.title));
    });

    // CSV 데이터 생성
    const rows: string[] = [headers.join(',')];

    responses.forEach((response) => {
      const row: string[] = [
        escapeCSV(new Date(response.created_at).toLocaleString('ko-KR')),
        escapeCSV(response.respondent_ip)
      ];

      survey.questions.forEach((question: any) => {
        const answer = response.answers.find((a: any) => 
          a.question_id.toString() === question._id.toString()
        );

        if (!answer) {
          row.push('');
        } else {
          switch (answer.question_type) {
            case 'single_choice':
              // 선택한 옵션의 라벨 찾기
              const selectedChoice = question.properties?.choices?.find(
                (c: any) => c.id === answer.choice_id
              );
              row.push(escapeCSV(selectedChoice?.label || answer.choice_id || ''));
              break;

            case 'multiple_choice':
              // 선택한 옵션들의 라벨 찾기
              if (Array.isArray(answer.choice_ids)) {
                const selectedLabels = answer.choice_ids.map((choiceId: string) => {
                  const choice = question.properties?.choices?.find(
                    (c: any) => c.id === choiceId
                  );
                  return choice?.label || choiceId;
                });
                row.push(escapeCSV(selectedLabels.join('; ')));
              } else {
                row.push('');
              }
              break;

            case 'rating':
              row.push(escapeCSV(answer.rating || ''));
              break;

            case 'short_text':
            case 'long_text':
              row.push(escapeCSV(answer.text || ''));
              break;

            default:
              row.push('');
          }
        }
      });

      rows.push(row.join(','));
    });

    // CSV 파일 생성 및 반환
    const csv = rows.join('\n');
    const buffer = Buffer.from('\uFEFF' + csv, 'utf-8'); // BOM 추가 (Excel 한글 깨짐 방지)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="survey_${params.id}_results.csv"`,
      },
    });
    
  } catch (error: any) {
    console.error('Survey export error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}