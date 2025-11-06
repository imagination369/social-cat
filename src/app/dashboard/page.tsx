'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCardSkeleton } from '@/components/ui/card-skeleton';
import { CheckCircle2, XCircle, Play } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { isMilestone, fireMilestoneConfetti } from '@/lib/confetti';
import { useClient } from '@/components/providers/ClientProvider';
import { ProductTour } from '@/components/layout/ProductTour';

interface DashboardStats {
  automations: {
    successfulRuns: number;
    failedRuns: number;
    activeJobs: number;
    totalExecutions: number;
  };
  system: {
    database: string;
  };
}

export default function DashboardPage() {
  const { currentClient } = useClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldStartTour, setShouldStartTour] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Include organizationId in request if client is selected
        const url = currentClient?.id
          ? `/api/dashboard/stats?organizationId=${currentClient.id}`
          : '/api/dashboard/stats';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard stats:', data); // Debug log
          setStats(data);
        } else {
          console.error('Failed to fetch stats:', response.status);
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
  }, [currentClient]);

  // Check if user should see the tour
  useEffect(() => {
    if (!loading) {
      const tourCompleted = localStorage.getItem('productTourCompleted');
      if (!tourCompleted) {
        // Small delay to ensure DOM is ready
        setTimeout(() => setShouldStartTour(true), 500);
      }
    }
  }, [loading]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          {/* Main Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>

          {/* System Info Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-24 bg-gray-alpha-200 animate-pulse rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const successfulRuns = stats?.automations?.successfulRuns ?? 0;
  const failedRuns = stats?.automations?.failedRuns ?? 0;
  const activeJobs = stats?.automations?.activeJobs ?? 0;
  const totalExecutions = stats?.automations?.totalExecutions ?? 0;
  const database = stats?.system?.database ?? 'PostgreSQL';

  return (
    <DashboardLayout>
      <ProductTour shouldStart={shouldStartTour} />
      <div className="p-6 space-y-4">
        {/* Main Stats Grid */}
        <div className="dashboard-stats grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Successful Runs */}
          <Card className="relative overflow-hidden rounded-lg rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-slide-up">
            {/* Status bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="card-title">Successful Runs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="card-stat-large tabular-nums">
                <AnimatedCounter
                  value={successfulRuns}
                  onEnd={(value) => {
                    if (isMilestone(value)) fireMilestoneConfetti();
                  }}
                />
              </div>
              <p className="card-label">total successful executions</p>
            </CardContent>
          </Card>

          {/* Failed Runs */}
          <Card className="relative overflow-hidden rounded-lg rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Status bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="card-title">Failed Runs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="card-stat-large tabular-nums">
                <AnimatedCounter value={failedRuns} />
              </div>
              <p className="card-label">total failed executions</p>
            </CardContent>
          </Card>

          {/* Active Jobs */}
          <Card className="relative overflow-hidden rounded-lg rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Status bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="card-title">Active Jobs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="card-stat-large text-blue-600 dark:text-blue-400 tabular-nums">
                <AnimatedCounter value={activeJobs} />
              </div>
              <p className="card-label">currently enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <div className="space-y-3 animate-fade-in">
          <h2 className="section-title tracking-tight">System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-2">
                  <div className="card-label">Total Executions</div>
                  <div className="card-stat-medium tabular-nums">
                    <AnimatedCounter value={totalExecutions} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-2">
                  <div className="card-label">Database</div>
                  <div className="card-stat-medium">
                    {database}
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
