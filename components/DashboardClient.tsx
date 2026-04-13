'use client';
import { useState, useCallback } from 'react';
import SetupPanel from '@/components/SetupPanel';
import FeedPanel from '@/components/FeedPanel';

export default function DashboardClient() {
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  // Set of niche_accounts.id that are currently "active" in the feed.
  // Starts empty — SetupPanel initialises it once accounts load.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleAccountsChanged = useCallback(() => {
    setFeedRefreshKey(k => k + 1);
  }, []);

  return (
    <>
      <div className="w-full lg:w-[400px] xl:w-[450px] p-6 lg:p-8 lg:overflow-y-auto custom-scrollbar z-10 shrink-0">
        <SetupPanel
          onAccountsChanged={handleAccountsChanged}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
      <div className="flex-1 p-6 lg:p-8 lg:overflow-y-auto custom-scrollbar z-10">
        <FeedPanel refreshKey={feedRefreshKey} selectedIds={selectedIds} />
      </div>
    </>
  );
}
