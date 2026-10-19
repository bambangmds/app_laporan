import React from 'react';
import { useOnlineStatus } from '../usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom duration-300">
      <WifiOff className="w-4 h-4 animate-pulse text-amber-200" />
      <span>Mode Offline — Data lokal dari cache sedang digunakan.</span>
    </div>
  );
};
