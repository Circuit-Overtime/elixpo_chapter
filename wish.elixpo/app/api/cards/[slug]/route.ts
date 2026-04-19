import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('id');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Fetch cards from Cloudflare D1 with given slug
    // Query: SELECT * FROM birthday_cards WHERE slug = ?
    // If cardId provided: AND id = cardId
    const cards = [
      {
        id: 'ABC123',
        name: 'Birthday Person',
        age: 25,
        message: 'Happy Birthday!',
        slug,
        created_at: new Date().toISOString(),
      },
    ];

    if (cardId) {
      const card = cards.find((c) => c.id === cardId);
      if (!card) {
        return NextResponse.json(
          { error: 'Card not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(card);
    }

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}
