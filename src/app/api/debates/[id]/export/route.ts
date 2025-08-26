import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // 디버깅을 위한 로그
    console.log('CSV Export - Debate ID:', params.id);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));

    // 관리자 토큰 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization header or invalid format');
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token:', token.substring(0, 20) + '...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('Decoded token:', decoded);
      
      // 토큰이 해당 투표의 관리자 토큰인지 확인
      if (decoded.debate_id !== params.id || decoded.type !== 'debate_admin') {
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
    const debate = await Debate.findOne({ id: params.id });
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 투표 기록 추출
    const votes: any[] = [];
    
    // vote_options에서 투표 데이터 추출
    debate.vote_options.forEach((option: any) => {
      option.votes.forEach((vote: any) => {
        votes.push({
          _id: vote._id || 'N/A',
          created_at: vote.voted_at,
          voter_name: vote.user_nickname || '익명',
          voter_ip_hash: vote.voter_ip_hash,
          vote_type: option.label
        });
      });
    });
    
    // 투표를 시간 순으로 정렬
    votes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 의견 데이터
    const opinions = debate.opinions || [];

    // CSV 데이터 생성 - 투표 기록
    const voteHeaders = ['투표일시', '투표자명', '선택'];
    const voteRows = votes.map((vote: any) => [
      new Date(vote.created_at).toLocaleString('ko-KR'),
      vote.voter_name || '익명',
      vote.vote_type
    ]);

    // CSV 데이터 생성 - 의견
    const opinionHeaders = ['작성일시', '작성자명', '의견내용'];
    const opinionRows = opinions
      .filter((opinion: any) => !opinion.is_deleted)
      .map((opinion: any) => [
        new Date(opinion.created_at).toLocaleString('ko-KR'),
        opinion.author_nickname || '익명',
        opinion.content || ''
      ]);

    // 통계 정보
    const statsHeaders = ['항목', '수치'];
    const agreeCount = debate.vote_options.find((opt: any) => opt.label === '찬성')?.vote_count || 0;
    const disagreeCount = debate.vote_options.find((opt: any) => opt.label === '반대')?.vote_count || 0;
    const totalVotes = agreeCount + disagreeCount;

    const statsRows = [
      ['총 투표 수', totalVotes.toString()],
      ['찬성', agreeCount.toString()],
      ['반대', disagreeCount.toString()],
      ['찬성률', totalVotes > 0 ? `${((agreeCount / totalVotes) * 100).toFixed(1)}%` : '0%'],
      ['반대율', totalVotes > 0 ? `${((disagreeCount / totalVotes) * 100).toFixed(1)}%` : '0%'],
      ['총 의견 수', opinions.filter((op: any) => !op.is_deleted).length.toString()]
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