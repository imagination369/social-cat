import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompactAutomationRow } from '@/components/automation/CompactAutomationRow';
import { Twitter } from 'lucide-react';

export default function TwitterPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1 animate-fade-in">
          <div className="flex items-center gap-2">
            <Twitter className="h-6 w-6 text-[#1DA1F2]" />
            <h1 className="font-black text-2xl tracking-tight">🐱 Twitter</h1>
          </div>
          <p className="text-xs text-secondary">Automate tweet generation and posting</p>
        </div>

        {/* Compact Automations List */}
        <div className="space-y-2 animate-slide-up">
          <CompactAutomationRow
            title="Post Tweets"
            jobName="ai-tweet-generation"
            defaultInterval="0 10 * * *"
            defaultPrompt="You are a thought leader in tech. Create insightful tweets about AI, software development, and innovation. Be authentic and engaging."
          />

          <CompactAutomationRow
            title="Reply to Tweets"
            jobName="reply-to-tweets"
            defaultInterval="*/15 * * * *"
            defaultSearchQuery="AI OR artificial intelligence"
            defaultPrompt="You are a thoughtful Twitter user who engages authentically with interesting content. Reply naturally as if you're having a genuine conversation with someone interesting.

Style:
- Write like a real person, not a bot or brand account
- Be conversational and casual (contractions are good!)
- Keep it under 280 characters
- Match the energy and tone of the original tweet

Content:
- Add genuine insight, a follow-up question, or personal perspective
- Share a related thought or build on their idea
- If they're asking something, give a helpful answer
- Avoid generic praise like 'Great post!' or 'Thanks for sharing!'

Don't:
- Sound promotional, salesy, or overly enthusiastic
- Use hashtags or emoji unless the original tweet does
- Make it about yourself unless contextually relevant
- Be controversial, political, or offensive

Goal: Have a real conversation, not broadcast content."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
