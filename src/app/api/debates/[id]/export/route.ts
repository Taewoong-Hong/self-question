import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Debate from '@/models/Debate';
import DebateVote from '@/models/DebateVote';
import DebateOpinion from '@/models/DebateOpinion';
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
      
      // 토큰이 해당 투표의 관리자 토큰인지 확인
      if (decoded.debateId !== params.id || decoded.role !== 'admin') {
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

    // 투표 조회
    const debate = await Debate.findById(params.id);
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 투표 기록 조회
    const votes = await DebateVote.find({ debate_id: params.id })
      .sort({ created_at: -1 });

    // 의견 조회
    const opinions = await DebateOpinion.find({ debate_id: params.id })
      .sort({ created_at: -1 });

    // CSV 데이터 생성 - 투표 기록
    const voteHeaders = ['투표ID', '투표일시', '투표자명', 'IP주소', '선택'];
    const voteRows = votes.map((vote: any) => {
      const choice = debate.vote_options.find((opt: any) => 
        vote.selected_options.includes(opt._id.toString())
      );
      
      return [
        vote._id.toString(),
        new Date(vote.created_at).toLocaleString('ko-KR'),
        vote.user_nickname || '익명',
        vote.voter_ip || '',
        choice?.label || ''
      ];
    });

    // CSV 데이터 생성 - 의견
    const opinionHeaders = ['의견ID', '작성일시', '작성자명', 'IP주소', '의견내용'];
    const opinionRows = opinions.map((opinion: any) => [
      opinion._id.toString(),
      new Date(opinion.created_at).toLocaleString('ko-KR'),
      opinion.author_nickname || '익명',
      opinion.author_ip || '',
      opinion.content || ''
    ]);

    // 통계 정보
    const statsHeaders = ['항목', '수치'];
    const agreeCount = votes.filter((v: any) => 
      v.selected_options.some((opt: string) => 
        debate.vote_options.find((o: any) => o._id.toString() === opt && o.label === '찬성')
      )
    ).length;
    
    const disagreeCount = votes.filter((v: any) => 
      v.selected_options.some((opt: string) => 
        debate.vote_options.find((o: any) => o._id.toString() === opt && o.label === '반대')
      )
    ).length;

    const statsRows = [
      ['총 투표 수', votes.length.toString()],
      ['찬성', agreeCount.toString()],
      ['반대', disagreeCount.toString()],
      ['찬성률', votes.length > 0 ? `${((agreeCount / votes.length) * 100).toFixed(1)}%` : '0%'],
      ['반대율', votes.length > 0 ? `${((disagreeCount / votes.length) * 100).toFixed(1)}%` : '0%'],
      ['총 의견 수', opinions.length.toString()]
    ];

    // BOM 추가 (엑셀에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    
    // CSV 문자열 생성
    const csvContent = BOM + [
      // 투표 정보
      `"투표 제목: ${debate.title}"`,
      `"생성일: ${new Date(debate.created_at).toLocaleString('ko-KR')}"`,
      `"작성자: ${debate.author_nickname || '익명'}"`,
      '',
      // 통계
      '=== 통계 ===',
      statsHeaders.map(h => `"${h}"`).join(','),
      ...statsRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      // 투표 기록
      '=== 투표 기록 ===',
      voteHeaders.map(h => `"${h}"`).join(','),
      ...voteRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
      '',
      // 의견
      '=== 의견 ===',
      opinionHeaders.map(h => `"${h}"`).join(','),
      ...opinionRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // 응답 헤더 설정
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    responseHeaders.set('Content-Disposition', `attachment; filename="debate_${params.id}_results_${new Date().toISOString().split('T')[0]}.csv"`);

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