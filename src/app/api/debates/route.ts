import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';

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
    const category = searchParams.get('category');
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
    
    if (category && category !== 'all') {
      query.category = category;
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
        sortOption = { 'stats.total_votes': -1 };
        break;
      case 'ending':
        sortOption = { end_at: 1 };
        break;
      case 'recent':
      default:
        sortOption = { created_at: -1 };
    }
    
    // Execute query
    const [debates, total] = await Promise.all([
      Debate.find(query)
        .select('-admin_password_hash -voter_ips -opinions.author_ip_hash')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Debate.countDocuments(query)
    ]);
    
    // Update status for each debate
    const debatesWithStatus = debates.map(debate => {
      const now = new Date();
      let currentStatus = debate.status;
      
      if (now < debate.start_at) {
        currentStatus = 'scheduled';
      } else if (now >= debate.start_at && now <= debate.end_at) {
        currentStatus = 'active';
      } else {
        currentStatus = 'ended';
      }
      
      return {
        ...debate,
        status: currentStatus,
        is_active: currentStatus === 'active',
        is_ended: currentStatus === 'ended'
      };
    });
    
    return NextResponse.json({
      debates: debatesWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Debate list error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}