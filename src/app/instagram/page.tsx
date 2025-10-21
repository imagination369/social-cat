import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompactAutomationRow } from '@/components/automation/CompactAutomationRow';
import { Instagram } from 'lucide-react';

export default function InstagramPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-black text-2xl tracking-tight">😸 Instagram</h1>
          </div>
          <p className="text-xs text-secondary">Monitor and reply to comments & DMs</p>
        </div>

        {/* Compact Automations List */}
        <div className="space-y-2 animate-slide-up">
          <CompactAutomationRow
            title="Reply to Comments"
            jobName="instagram-reply-comments"
            defaultInterval="*/30 * * * *"
            defaultPrompt="You are a friendly Instagram creator. Reply to comments on your posts in an engaging, authentic way. Keep it brief and positive."
          />

          <CompactAutomationRow
            title="Reply to DMs"
            jobName="instagram-reply-dms"
            defaultInterval="*/15 * * * *"
            defaultPrompt="You are a helpful assistant. Reply to Instagram direct messages professionally and helpfully. Be concise and friendly."
          />
        </div>

        {/* Setup Notice */}
        <div className="mt-6 p-3 border border-border rounded-md bg-surface">
          <p className="text-xs text-secondary">
            <strong>Note:</strong> Instagram requires a Business or Creator account linked to a Facebook Page.
            Configure in Settings once credentials are added.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
