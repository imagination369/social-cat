import { Loader2, Instagram } from 'lucide-react';

export default function InstagramLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-[#f09433]" />
          <Instagram className="h-4 w-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm text-secondary">Grooming the feed... 😸📸</p>
      </div>
    </div>
  );
}
