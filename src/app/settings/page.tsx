'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Twitter, Youtube, Instagram, Check, X, Loader2, Cat } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TwitterStatus {
  connected: boolean;
  account: {
    providerAccountId: string;
    hasRefreshToken: boolean;
    isExpired: boolean;
  } | null;
}

export default function SettingsPage() {
  const { status } = useSession();
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(true);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [catMascotEnabled, setCatMascotEnabled] = useState(true);

  // Load cat mascot preference from localStorage
  useEffect(() => {
    const hidden = localStorage.getItem('cat-mascot-hidden') === 'true';
    setCatMascotEnabled(!hidden);
  }, []);

  const handleCatMascotToggle = (enabled: boolean) => {
    setCatMascotEnabled(enabled);
    localStorage.setItem('cat-mascot-hidden', enabled ? 'false' : 'true');
    // Reload to apply changes
    window.location.reload();
  };

  // Fetch Twitter connection status on mount (only if authenticated)
  useEffect(() => {
    // Wait for session to load before making API calls
    if (status === 'loading') {
      return; // Still checking session, wait
    }

    if (status === 'authenticated') {
      fetchTwitterStatus();
    } else {
      // Not logged in, skip API call to avoid 401 error
      setTwitterConnected(false);
      setTwitterLoading(false);
    }
  }, [status]);

  // Listen for OAuth success message from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'twitter-auth-success') {
        fetchTwitterStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchTwitterStatus = async () => {
    try {
      setTwitterLoading(true);
      const response = await fetch('/api/auth/twitter/status', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: TwitterStatus = await response.json();
        setTwitterConnected(data.connected);
      } else {
        setTwitterConnected(false);
      }
    } catch (error) {
      console.error('Error fetching Twitter status:', error);
      setTwitterConnected(false);
    } finally {
      setTwitterLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    if (platform === 'twitter') {
      // Check if user is logged in first
      if (status !== 'authenticated') {
        // Open login page in popup
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const loginPopup = window.open(
          '/auth/signin?callbackUrl=/settings',
          'Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll to check if login was successful
        const checkLogin = setInterval(async () => {
          try {
            // Check if popup is closed
            if (loginPopup?.closed) {
              clearInterval(checkLogin);
              // Refresh the page to update session
              window.location.reload();
            }
          } catch {
            // Ignore cross-origin errors
          }
        }, 500);

        return;
      }

      if (twitterConnected) {
        // Disconnect
        try {
          const response = await fetch('/api/auth/twitter/status', {
            method: 'DELETE',
          });
          if (response.ok) {
            setTwitterConnected(false);
          }
        } catch (error) {
          console.error('Failed to disconnect Twitter:', error);
        }
      } else {
        // Open Twitter OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          '/api/auth/twitter/authorize',
          'Twitter Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }

    if (platform === 'youtube') {
      if (youtubeConnected) {
        setYoutubeConnected(false);
        // TODO: Clear YouTube credentials
      } else {
        // Open YouTube/Google OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          '/api/auth/youtube/authorize',
          'YouTube Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }

    if (platform === 'instagram') {
      // Instagram coming soon
      alert('Instagram integration coming soon. Requires Meta Business account.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">⚙️😼 Settings</h1>
          <p className="text-xs text-secondary">Connect your social media accounts</p>
        </div>

        {/* Platform Connections - One Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Twitter */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">Twitter</CardTitle>
                </div>
                {twitterConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {twitterLoading
                  ? 'Checking...'
                  : twitterConnected
                  ? 'Connected'
                  : status !== 'authenticated'
                  ? 'Login required'
                  : 'Not connected'}
              </div>
              <Button
                onClick={() => handleConnect('twitter')}
                variant={twitterConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                disabled={twitterLoading || status === 'loading'}
              >
                {twitterLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading
                  </>
                ) : twitterConnected ? (
                  'Disconnect'
                ) : status !== 'authenticated' ? (
                  'Login to Connect'
                ) : (
                  'Connect'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* YouTube */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">YouTube</CardTitle>
                </div>
                {youtubeConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {youtubeConnected ? 'Connected' : 'Not connected'}
              </div>
              <Button
                onClick={() => handleConnect('youtube')}
                variant={youtubeConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
              >
                {youtubeConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">Instagram</CardTitle>
                </div>
                {instagramConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {instagramConnected ? 'Connected' : 'Coming soon'}
              </div>
              <Button
                onClick={() => handleConnect('instagram')}
                variant={instagramConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                disabled={!instagramConnected}
              >
                {instagramConnected ? 'Disconnect' : 'Coming Soon'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* App Preferences */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm">App Preferences</h2>
          <Card className="border-border bg-surface">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cat className="h-4 w-4 text-accent" />
                  <div>
                    <div className="text-sm font-medium">Cat Mascot</div>
                    <div className="text-[10px] text-secondary">
                      Show the interactive cat companion in the bottom-right corner
                    </div>
                  </div>
                </div>
                <Switch
                  checked={catMascotEnabled}
                  onCheckedChange={handleCatMascotToggle}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
