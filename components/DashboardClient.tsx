'use client';
import { useState, useCallback } from 'react';
import SetupPanel from '@/components/SetupPanel';
import FeedPanel from '@/components/FeedPanel';

/**
 * Client wrapper that holds shared state between SetupPanel and FeedPanel.
 * When the user adds/removes a tracked account, SetupPanel calls onAccountsChanged(),
 * which bumps feedRefreshKey — causing FeedPanel to re-fetch its posts live.
 */
export default function DashboardClient() {
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const handleAccountsChanged = useCallback(() => {
    setFeedRefreshKey(k => k + 1);
  }, []);

  return (
    <>
      <div className="w-full lg:w-[400px] xl:w-[450px] p-6 lg:p-8 lg:overflow-y-auto custom-scrollbar z-10 shrink-0">
        <SetupPanel onAccountsChanged={handleAccountsChanged} />
      </div>
      <div className="flex-1 p-6 lg:p-8 lg:overflow-y-auto custom-scrollbar z-10">
        <FeedPanel refreshKey={feedRefreshKey} />
      </div>
    </>
  );
}
