import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Filters
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const sort = searchParams.get('sort') || 'recent';
    
    // Build query
    const query: any = {
      is_deleted: false,
      is_hidden: false
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }
    
    // Sort options
    let sortOption: any = {};
    switch (sort) {
      case 'popular':
        sortOption = { 'stats.response_count': -1 };
        break;
      case 'closing':
        sortOption = { 'settings.close_at': 1 };
        break;
      case 'recent':
      default:
        sortOption = { created_at: -1 };
    }
    
    // Execute query
    const [surveys, total] = await Promise.all([
      Survey.find(query)
        .select('-admin_password_hash -admin_token -admin_token_expires -voter_ips')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Survey.countDocuments(query)
    ]);
    
    // Update status for each survey
    const surveysWithStatus = surveys.map(survey => {
      const now = new Date();
      let currentStatus = survey.status;
      
      if (survey.settings.close_at && now > survey.settings.close_at) {
        currentStatus = 'closed';
      }
      
      return {
        ...survey,
        status: currentStatus,
        is_closed: currentStatus === 'closed'
      };
    });
    
    return NextResponse.json({
      surveys: surveysWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Survey list error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}