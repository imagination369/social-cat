'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Twitter, Youtube } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { isMilestone, fireMilestoneConfetti } from '@/lib/confetti';

interface DashboardStats {
  twitter: {
    tweetsPosted: number;
    repliesPosted: number;
  };
  youtube: {
    commentsReplied: number;
  };
  system: {
    activeJobs: number;
    totalExecutions: number;
    database: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">🐱 Dashboard</h1>
          <p className="text-sm text-secondary">
            Monitor your social media automations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Twitter Stats */}
          <Card className="border-border bg-surface hover:bg-surface-hover transition-all hover:scale-[1.02] border-l-4 border-l-[#1DA1F2] animate-slide-up">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                <CardTitle className="text-sm font-medium text-secondary">Twitter</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <div className="text-2xl font-black">
                  <AnimatedCounter
                    value={stats?.twitter.tweetsPosted || 0}
                    onEnd={(value) => {
                      if (isMilestone(value)) fireMilestoneConfetti();
                    }}
                  />
                </div>
                <p className="text-xs text-secondary">tweets posted</p>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="text-lg font-black">
                  <AnimatedCounter value={stats?.twitter.repliesPosted || 0} />
                </div>
                <p className="text-xs text-secondary">replies posted</p>
              </div>
            </CardContent>
          </Card>

          {/* YouTube Stats */}
          <Card className="border-border bg-surface hover:bg-surface-hover transition-all hover:scale-[1.02] border-l-4 border-l-[#FF0000] animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-[#FF0000]" />
                <CardTitle className="text-sm font-medium text-secondary">YouTube</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black">
                <AnimatedCounter value={stats?.youtube.commentsReplied || 0} />
              </div>
              <p className="text-xs text-secondary">comments replied</p>
            </CardContent>
          </Card>

          {/* Instagram Stats */}
          <Card className="border-border bg-surface hover:bg-surface-hover transition-all hover:scale-[1.02] border-l-4 border-l-[#f09433] animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-secondary">Instagram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-secondary">—</div>
              <p className="text-xs text-secondary">coming soon</p>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-black text-lg tracking-tight">System</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border bg-surface hover:bg-surface-hover transition-all hover:scale-[1.02]">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <div className="text-xs text-secondary">Active Jobs</div>
                  <div className="text-xl font-black text-[#10b981]">
                    <AnimatedCounter value={stats?.system.activeJobs || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface hover:bg-surface-hover transition-all hover:scale-[1.02]">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <div className="text-xs text-secondary">Total Executions</div>
                  <div className="text-xl font-black">
                    <AnimatedCounter value={stats?.system.totalExecutions || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface hover:bg-surface-hover transition-all hover:scale-[1.02]">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <div className="text-xs text-secondary">Database</div>
                  <div className="text-xl font-black">
                    {stats?.system.database || 'SQLite'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
