import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  const messages = [
    'Stretching and yawning... 😺',
    'Pouncing on your stats... 🐾',
    'Chasing the data... 🐱',
    'Hunting for automations... 😸',
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-secondary">{randomMessage}</p>
      </div>
    </div>
  );
}
