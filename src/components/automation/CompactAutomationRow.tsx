'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, Settings2, Check, X, Filter, History, MessageSquare } from 'lucide-react';
import { SchedulePicker } from './SchedulePicker';
import { Input } from '@/components/ui/input';
import { ReplyHistoryTable } from '@/components/twitter/ReplyHistoryTable';
import { showTwitter403Error, showTwitter429Error, showApiError, showTwitterSuccess } from '@/lib/toast-helpers';
import { fireSuccessConfetti } from '@/lib/confetti';

interface CompactAutomationRowProps {
  title: string;
  jobName: string;
  defaultInterval?: string;
  defaultPrompt?: string;
  defaultSearchQuery?: string;
}

export function CompactAutomationRow({
  title,
  jobName,
  defaultInterval = '*/30 * * * *',
  defaultPrompt = '',
  defaultSearchQuery = '',
}: CompactAutomationRowProps) {
  const [interval, setInterval] = useState(defaultInterval);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search filter states (for reply-to-tweets job)
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [minimumLikes, setMinimumLikes] = useState(50);
  const [minimumRetweets, setMinimumRetweets] = useState(10);
  const [searchFromToday, setSearchFromToday] = useState(true);
  const [removeLinks, setRemoveLinks] = useState(true);
  const [removeMedia, setRemoveMedia] = useState(true);

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/automation/settings?job=${jobName}`);
        if (response.ok) {
          const settings = await response.json();

          // Apply loaded settings to state
          if (settings.interval !== undefined) setInterval(settings.interval);
          if (settings.prompt !== undefined) setPrompt(settings.prompt);
          if (settings.enabled !== undefined) setEnabled(settings.enabled);
          if (settings.searchQuery !== undefined) setSearchQuery(settings.searchQuery);
          if (settings.minimumLikes !== undefined) setMinimumLikes(settings.minimumLikes);
          if (settings.minimumRetweets !== undefined) setMinimumRetweets(settings.minimumRetweets);
          if (settings.searchFromToday !== undefined) setSearchFromToday(settings.searchFromToday);
          if (settings.removeLinks !== undefined) setRemoveLinks(settings.removeLinks);
          if (settings.removeMedia !== undefined) setRemoveMedia(settings.removeMedia);
        }
      } catch (error) {
        console.error('Failed to load automation settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [jobName]);

  // Save settings to database
  const saveSettings = async (overrideSettings?: Partial<{
    interval: string;
    prompt: string;
    enabled: boolean;
    searchQuery: string;
    minimumLikes: number;
    minimumRetweets: number;
    searchFromToday: boolean;
    removeLinks: boolean;
    removeMedia: boolean;
  }>) => {
    const settings = {
      interval,
      prompt,
      enabled,
      searchQuery,
      minimumLikes,
      minimumRetweets,
      searchFromToday,
      removeLinks,
      removeMedia,
      ...overrideSettings,
    };

    try {
      await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobName,
          settings,
        }),
      });
    } catch (error) {
      console.error('Failed to save automation settings:', error);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    window.dispatchEvent(new CustomEvent('cat:job-start'));

    try {
      // Build request body with filters (only for reply-to-tweets)
      const body = jobName === 'reply-to-tweets'
        ? {
            minimumLikesCount: minimumLikes,
            minimumRetweetsCount: minimumRetweets,
            searchFromToday,
            removePostsWithLinks: removeLinks,
            removePostsWithMedia: removeMedia,
          }
        : {};

      const response = await fetch(`/api/jobs/trigger?job=${jobName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: data.message });
        showTwitterSuccess(data.message || 'Job completed successfully');
        fireSuccessConfetti(); // Celebrate success!
      } else {
        setTestResult({ success: false, message: data.error || 'Unknown error' });

        // Handle specific error codes with user-friendly toasts
        if (response.status === 403) {
          showTwitter403Error(data.details || data.error);
        } else if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          showTwitter429Error(retryAfter ? parseInt(retryAfter) : undefined);
        } else {
          showApiError(data.error || data.details || 'Job failed to execute');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({ success: false, message: `Failed: ${errorMessage}` });
      showApiError(`Failed to execute job: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  const getScheduleLabel = (cron: string) => {
    const presets: Record<string, string> = {
      '*/5 * * * *': 'Every 5 min',
      '*/15 * * * *': 'Every 15 min',
      '*/30 * * * *': 'Every 30 min',
      '0 * * * *': 'Hourly',
      '0 */4 * * *': 'Every 4 hours',
      '0 9 * * *': 'Daily 9 AM',
      '0 18 * * *': 'Daily 6 PM',
      '0 9 * * 1': 'Mon 9 AM',
    };
    return presets[cron] || cron;
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-border rounded-md bg-surface hover:bg-surface-hover transition-colors">
      {/* Title & Status */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            setEnabled(checked);
            // Save immediately with the new value
            saveSettings({ enabled: checked });
          }}
          disabled={loading}
        />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm truncate">{title}</div>
          <div className="text-[10px] text-secondary">{getScheduleLabel(interval)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Schedule Button */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <Settings2 className="h-3 w-3" />
              <span>Schedule</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-surface border-border" onCloseAutoFocus={() => saveSettings()}>
            <DialogHeader>
              <DialogTitle className="text-base font-black">Schedule</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Choose when this automation runs
              </DialogDescription>
            </DialogHeader>
            <SchedulePicker value={interval} onChange={setInterval} />
          </DialogContent>
        </Dialog>

        {/* Prompt Button */}
        <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>Prompt</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-surface border-border" onCloseAutoFocus={() => saveSettings()}>
            <DialogHeader>
              <DialogTitle className="text-base font-black">System Prompt</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Configure how the AI behaves for this automation
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your system prompt..."
              className="min-h-[200px] bg-background border-border text-sm resize-none"
            />
            <Button onClick={() => { setPromptOpen(false); saveSettings(); }} className="h-8 text-xs">
              Save
            </Button>
          </DialogContent>
        </Dialog>

        {/* Filters Button (only for reply-to-tweets) */}
        {jobName === 'reply-to-tweets' && (
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                <Filter className="h-3 w-3" />
                <span>Filters</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-surface border-border" onCloseAutoFocus={() => saveSettings()}>
              <DialogHeader>
                <DialogTitle className="text-base font-black">Search Filters</DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  Configure tweet search criteria for better targeting
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Search Query
                  </label>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., AI OR artificial intelligence"
                    className="h-8 bg-background border-border text-sm"
                  />
                  <p className="text-[10px] text-secondary">
                    Keywords to search for in tweets
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Min Likes
                    </label>
                    <Input
                      type="number"
                      value={minimumLikes}
                      onChange={(e) => setMinimumLikes(Number(e.target.value))}
                      min={0}
                      className="h-8 bg-background border-border text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Min Retweets
                    </label>
                    <Input
                      type="number"
                      value={minimumRetweets}
                      onChange={(e) => setMinimumRetweets(Number(e.target.value))}
                      min={0}
                      className="h-8 bg-background border-border text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={searchFromToday}
                      onChange={(e) => setSearchFromToday(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Only tweets from today
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={removeLinks}
                      onChange={(e) => setRemoveLinks(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Remove tweets with links
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={removeMedia}
                      onChange={(e) => setRemoveMedia(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Remove tweets with images/videos
                    </span>
                  </label>
                </div>
              </div>

              <Button onClick={() => { setFiltersOpen(false); saveSettings(); }} className="h-8 text-xs">
                Save Filters
              </Button>
            </DialogContent>
          </Dialog>
        )}

        {/* History Button (only for reply-to-tweets) */}
        {jobName === 'reply-to-tweets' && (
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                <History className="h-3 w-3" />
                <span>History</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] max-h-[85vh] bg-surface border-border overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-base font-black">Reply History</DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  View all tweets you&apos;ve replied to with engagement metrics
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(85vh-8rem)]">
                <ReplyHistoryTable />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Test Button */}
        <Button
          onClick={handleTest}
          disabled={testing}
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs gap-1"
        >
          {testing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              <span>Test</span>
            </>
          )}
        </Button>
      </div>

      {/* Test Result Overlay */}
      {testResult && (
        <div className="absolute right-3 top-3">
          {testResult.success ? (
            <Check className="h-4 w-4 text-[#10b981] animate-pulse-success" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
      )}
    </div>
  );
}
