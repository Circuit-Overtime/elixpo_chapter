import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const TIER_LIMITS = {
  guest:       { images: 10, edits: 3, videos: 2, blueprints: 0 },
  free:        { images: 50, edits: 15, videos: 5, blueprints: 5 },
  atelier:     { images: 200, edits: 60, videos: 20, blueprints: 20 },
  masterpiece: { images: 500, edits: 150, videos: 50, blueprints: 50 },
};

// In-memory store (resets on server restart — D1 replaces this in production)
const usageStore = new Map();

function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(key) {
  const today = getTodayUTC();
  const entry = usageStore.get(key);
  if (!entry || entry.date !== today) {
    const fresh = { images: 0, edits: 0, videos: 0, blueprints: 0, date: today };
    usageStore.set(key, fresh);
    return fresh;
  }
  return entry;
}

function getClientIP(headersList) {
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headersList.get('x-real-ip') || 'unknown';
}

export async function GET(request) {
  const headersList = await headers();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const tier = searchParams.get('tier') || 'guest';
  const ip = getClientIP(headersList);
  const key = userId ? `user:${userId}` : `ip:${ip}`;
  const usage = getUsage(key);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.guest;

  return NextResponse.json({
    usage: { images: usage.images, edits: usage.edits, videos: usage.videos },
    limits,
    tier,
    remaining: {
      images: Math.max(0, limits.images - usage.images),
      edits: Math.max(0, limits.edits - usage.edits),
      videos: Math.max(0, limits.videos - usage.videos),
    },
  });
}

export async function POST(request) {
  const headersList = await headers();
  const body = await request.json();
  const { type, userId, tier: bodyTier } = body;

  if (!type || !['images', 'edits', 'videos'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const ip = getClientIP(headersList);
  const key = userId ? `user:${userId}` : `ip:${ip}`;
  const tier = bodyTier || (userId ? 'free' : 'guest');
  const usage = getUsage(key);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.guest;

  if (usage[type] >= limits[type]) {
    return NextResponse.json({
      error: `Daily ${type} limit reached (${limits[type]}).`,
      usage: { images: usage.images, edits: usage.edits, videos: usage.videos },
      limits,
      tier,
    }, { status: 429 });
  }

  usage[type]++;
  usageStore.set(key, usage);

  return NextResponse.json({
    allowed: true,
    usage: { images: usage.images, edits: usage.edits, videos: usage.videos },
    limits,
    remaining: {
      images: Math.max(0, limits.images - usage.images),
      edits: Math.max(0, limits.edits - usage.edits),
      videos: Math.max(0, limits.videos - usage.videos),
    },
    tier,
  });
}
