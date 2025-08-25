import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Survey from '@/models/Survey';
import Response from '@/models/Response';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // 관리자 토큰 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // 토큰이 해당 설문의 관리자 토큰인지 확인
      if (decoded.surveyId !== params.id || decoded.role !== 'admin') {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 설문 조회
    const survey = await Survey.findById(params.id);
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 응답 조회
    const responses = await Response.find({ survey_id: params.id })
      .sort({ created_at: -1 });

    // CSV 헤더 생성
    const headers = ['응답ID', '응답일시', 'IP주소'];
    
    // 질문별 헤더 추가
    survey.questions.forEach((question: any, index: number) => {
      headers.push(`Q${index + 1}. ${question.title}`);
    });

    // CSV 데이터 생성
    const rows = responses.map((response: any) => {
      const row = [
        response._id.toString(),
        new Date(response.created_at).toLocaleString('ko-KR'),
        response.respondent_ip || ''
      ];

      // 각 질문에 대한 응답 추가
      survey.questions.forEach((question: any) => {
        const answer = response.answers.find((a: any) => 
          a.question_id.toString() === question._id.toString()
        );

        if (!answer) {
          row.push('');
        } else {
          switch (question.type) {
            case 'single_choice':
              const singleChoice = question.choices.find((c: any) => 
                answer.choice_ids?.includes(c._id.toString())
              );
              row.push(singleChoice?.label || '');
              break;
              
            case 'multiple_choice':
              const multipleChoices = question.choices
                .filter((c: any) => answer.choice_ids?.includes(c._id.toString()))
                .map((c: any) => c.label)
                .join('; ');
              row.push(multipleChoices || '');
              break;
              
            case 'short_text':
            case 'long_text':
              row.push(answer.text_answer || '');
              break;
              
            case 'rating':
              row.push(answer.rating_answer?.toString() || '');
              break;
              
            default:
              row.push('');
          }
        }
      });

      return row;
    });

    // BOM 추가 (엑셀에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    
    // CSV 문자열 생성
    const csvContent = BOM + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // 응답 헤더 설정
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    responseHeaders.set('Content-Disposition', `attachment; filename="survey_${params.id}_results_${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'CSV 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}