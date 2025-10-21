import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompactAutomationRow } from '@/components/automation/CompactAutomationRow';
import { Youtube } from 'lucide-react';

export default function YouTubePage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1 animate-fade-in">
          <div className="flex items-center gap-2">
            <Youtube className="h-6 w-6 text-[#FF0000]" />
            <h1 className="font-black text-2xl tracking-tight">😺 YouTube</h1>
          </div>
          <p className="text-xs text-secondary">Monitor and reply to video comments</p>
        </div>

        {/* Compact Automations List */}
        <div className="space-y-2 animate-slide-up">
          <CompactAutomationRow
            title="Check & Reply to Comments"
            jobName="check-youtube-comments"
            defaultInterval="*/30 * * * *"
            defaultPrompt="You are a friendly YouTube creator. Reply to comments on your videos in a helpful, engaging way. Keep responses concise and positive."
          />

          <CompactAutomationRow
            title="Fetch Comments for Analysis"
            jobName="fetch-youtube-comments-analysis"
            defaultInterval="0 */6 * * *"
            defaultPrompt="Analyze YouTube comments to identify common questions, feedback themes, and engagement opportunities."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
