export interface PostMetrics {
  id?: string;
  view_count: number;
  follower_count_at_scrape: number;
  viral_coefficient?: number;
  is_outlier?: boolean;
}

/**
 * calculateVC: (views / max(followers, 1))
 */
export function calculateVC(views: number, followers: number): number {
  if (views == null) views = 0;
  if (followers == null) followers = 0;
  return Number((views / Math.max(followers, 1)).toFixed(3));
}

/**
 * getAccountMedian: Calculate the median VC of the last 10 posts for a given account.
 * Expects an array of posts sorted by date/scraped_at (newest first).
 */
export function getAccountMedian(posts: { viral_coefficient: number }[]): number {
  if (!posts || posts.length === 0) return 0;
  
  // Consider only the last 10 posts based on the prompt window
  const recentPosts = posts.slice(0, 10);
  
  const vcs = recentPosts
    .map((p) => p.viral_coefficient)
    .filter((vc) => vc != null && !isNaN(vc))
    .sort((a, b) => a - b);

  if (vcs.length === 0) return 0;

  const mid = Math.floor(vcs.length / 2);
  
  if (vcs.length % 2 === 0) {
    return Number(((vcs[mid - 1] + vcs[mid]) / 2).toFixed(3));
  }
  return Number(vcs[mid].toFixed(3));
}

/**
 * detectOutliers: Mark as is_outlier if VC > 2.0 * median OR VC >= 2.0 (based on latest design update)
 */
export function detectOutliers(
  posts: PostMetrics[],
  median: number,
  multiplier: number = 2.0
): PostMetrics[] {
  return posts.map((post) => {
    const vc = post.viral_coefficient ?? calculateVC(post.view_count, post.follower_count_at_scrape);
    
    // An outlier is defined based on the prompt formula + the fixed global floor rule we discussed
    const is_outlier = vc >= 2.0 || vc > (median * multiplier);
    
    return {
      ...post,
      viral_coefficient: vc,
      is_outlier
    };
  });
}
