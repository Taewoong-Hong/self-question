'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Opinion {
  id: string;
  author_nickname?: string;
  content: string;
  created_at: string;
}

interface OpinionSectionProps {
  debateId: string;
}

export default function OpinionSection({ debateId }: OpinionSectionProps) {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpinions();
    // 30초마다 의견 새로고침
    const interval = setInterval(fetchOpinions, 30000);
    return () => clearInterval(interval);
  }, [debateId]);

  const fetchOpinions = async () => {
    try {
      const response = await fetch(`/api/debates/${debateId}/opinions`);
      if (!response.ok) throw new Error('Failed to fetch opinions');
      const data = await response.json();
      setOpinions(data.opinions || []);
    } catch (error) {
      console.error('Error fetching opinions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <OpinionSkeleton />;
  }

  if (opinions.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">의견 ({opinions.length})</h2>
      
      <div className="space-y-4">
        {opinions.map((opinion) => (
          <div key={opinion.id} className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-start justify-between mb-1.5 sm:mb-2">
              <span className="text-sm sm:text-base font-medium text-zinc-300">
                {opinion.author_nickname || '익명'}
              </span>
              <span className="text-xs sm:text-sm text-zinc-500">
                {formatDistanceToNow(new Date(opinion.created_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </span>
            </div>
            <p className="text-sm sm:text-base text-zinc-400 whitespace-pre-wrap">{opinion.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 스켈레톤 UI
function OpinionSkeleton() {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-24 mb-4"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
              <div className="h-4 bg-zinc-800 rounded w-20 mb-2"></div>
              <div className="h-4 bg-zinc-800 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}