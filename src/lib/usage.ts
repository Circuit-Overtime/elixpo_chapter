import { auth } from '@clerk/nextjs/server'
import { RateLimiterPrisma } from 'rate-limiter-flexible'
import prisma from './db';

const DAILY_CREDIT = 5;         // Users can use only 1 token
const DURATION = 60 * 60 * 24;  // 1 day in seconds

export const getUsageTracker = async () => {
  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: 'Usage',
    points: DAILY_CREDIT,   // Allow 1 point
    duration: DURATION      // Reset that point every 24 hours
  });

  return usageTracker;
};

export const consumeCredits = async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("USER IS NOT AUTHENTICATED");
  }

  const usage = await getUsageTracker();

  try {
    const res = await usage.consume(userId);  // consume 1 token
    return res;
  } catch (err: any) {
    // Rate limit exceeded
    throw new Error("No free credits available. Try again after 24 hours.");
  }
};

export const getUsageStatus = async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("USER IS NOT AUTHENTICATED");
  }

  const usage = await getUsageTracker();
  const res = await usage.get(userId);
  return res;
};
