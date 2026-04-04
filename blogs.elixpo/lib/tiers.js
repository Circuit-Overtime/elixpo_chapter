// Tier limits for free and member accounts

export const TIER_LIMITS = {
  free: {
    totalStorageBytes: 50 * 1024 * 1024,       // 50 MB
    imagePerBlogBytes: 2 * 1024 * 1024,         // 2 MB total images per blog
    aiRequestsPerDay: 15,
    coAuthorsPerBlog: 3,
    ownedOrgs: 1,
    canReadMemberOnly: false,
    canMarkMemberOnly: false,
  },
  member: {
    totalStorageBytes: 2 * 1024 * 1024 * 1024,  // 2 GB
    imagePerBlogBytes: 10 * 1024 * 1024,         // 10 MB total images per blog
    aiRequestsPerDay: 50,
    coAuthorsPerBlog: 5,
    ownedOrgs: 5,
    canReadMemberOnly: true,
    canMarkMemberOnly: true,
  },
};

export function getLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
