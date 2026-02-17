import { NextRequest, NextResponse } from 'next/server';
import { generateUniqueId, createSlug } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { name, age, message, slug } = await request.json();

    if (!name || !age) {
      return NextResponse.json(
        { error: 'Name and age are required' },
        { status: 400 }
      );
    }

    const cardId = generateUniqueId(6);
    const cardSlug = slug || createSlug(name);

    // Store in Cloudflare D1
    // This would be implemented in your Cloudflare worker environment
    // For now, returning the card data
    const cardData = {
      id: cardId,
      name,
      age,
      message,
      slug: cardSlug,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(cardData, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const cardId = searchParams.get('id');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Fetch from Cloudflare D1
    // This would query: SELECT * FROM birthday_cards WHERE slug = ? AND (id = ? OR ?)
    // For now, returning mock data
    const cardData = {
      id: cardId || 'ABC123',
      name: 'Birthday Person',
      age: 25,
      message: 'Happy Birthday!',
      slug,
    };

    return NextResponse.json(cardData);
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    );
  }
}
