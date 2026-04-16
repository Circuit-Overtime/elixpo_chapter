# LixWish - Birthday Card Generator (Next.js + Cloudflare D1)

A modern, interactive birthday card generator built with Next.js, React, and Cloudflare D1 database.

## Features

✨ **Interactive Birthday Cards**
- Create personalized birthday cards with name, age, and custom messages
- Unique 6-digit alphanumeric access keys for security
- URL slug-based sharing (e.g., `/john` or `/john-birthday`)
- Multiple cards can exist under the same slug with different access keys

🎂 **Visual Effects**
- Animated birthday cake with candles (count matches age)
- Microphone detection to blow out candles
- Confetti celebration effect
- Gradient animated backgrounds
- Smooth typewriter text effect

🔒 **Security & Privacy**
- Access key protection prevents unauthorized viewing
- Context menu and developer tools blocking
- No external dependencies for core functionality

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: Cloudflare D1 (Serverless SQL)
- **Deployment**: Cloudflare Pages/Workers
- **Icons**: Lucide React

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home - Card creator
│   ├── globals.css             # Global Tailwind styles
│   ├── [name]/
│   │   ├── page.tsx            # Card slug page (key prompt)
│   │   └── [id]/
│   │       └── page.tsx        # Card viewer (with access)
│   └── api/
│       └── cards/
│           ├── route.ts        # Create/list cards API
│           └── [slug]/route.ts # Get card by slug API
├── components/
│   ├── CardCreator.tsx         # Card creation form
│   ├── CardViewer.tsx          # Main card view
│   ├── KeyPrompt.tsx           # Access key input
│   ├── Candles.tsx             # Animated candles
│   ├── Confetti.tsx            # Confetti effect
│   ├── MicrophoneButton.tsx    # Microphone access & blow detection
│   └── ContextMenuProtection.tsx  # Dev tools blocking
├── lib/
│   ├── db.ts                   # Database initialization
│   └── utils.ts                # Utility functions
├── public/                      # Static assets
├── wrangler.toml               # Cloudflare configuration
├── schema.sql                  # D1 database schema
└── CLOUDFLARE_SETUP.md         # Deployment guide
```

## Getting Started

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   # Update with your configuration
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Creating a Card

1. Fill in the form with:
   - Birthday person's name
   - Their age
   - (Optional) Custom message
   - (Optional) Custom URL slug

2. Click "Create Birthday Card"

3. Get a shareable link with a unique 6-digit access key

### Accessing a Card

1. Go to the shared link (e.g., `https://example.com/john`)
2. Enter the 6-digit access key
3. Click "Access Card"
4. Click the microphone button and blow on your microphone
5. Watch the candles blow out and celebrate with confetti!

## Cloudflare D1 Setup

See [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) for detailed deployment instructions.

Quick start:
```bash
# Create database
wrangler d1 create lixwish

# Initialize schema
wrangler d1 execute lixwish --file ./schema.sql

# Deploy
npm run build
wrangler deploy
```

## API Reference

### Create Card
```
POST /api/cards
Content-Type: application/json

{
  "name": "John",
  "age": 25,
  "message": "Happy Birthday!",
  "slug": "john-birthday" // optional
}

Response:
{
  "id": "ABC123",
  "name": "John",
  "age": 25,
  "message": "Happy Birthday!",
  "slug": "john-birthday",
  "created_at": "2024-02-17T..."
}
```

### Get Cards by Slug
```
GET /api/cards/john-birthday

Response:
[
  {
    "id": "ABC123",
    "name": "John",
    "age": 25,
    ...
  }
]
```

### Get Specific Card
```
GET /api/cards/john-birthday?id=ABC123

Response:
{
  "id": "ABC123",
  "name": "John",
  ...
}
```

## URL Structure

- `/` - Card creator home page
- `/{slug}` - Card access page (prompts for key)
- `/{slug}/{id}` - Card viewer (requires valid ID)

Example:
- Create a card for "john" → generates ID "ABC123"
- Share: `https://example.com/john/ABC123`
- Without ID: `https://example.com/john` → prompts for access key "ABC123"

## Styling

The application uses Tailwind CSS v4 with custom animations:

- `.animate-blob` - Floating blob animation
- `.animate-float` - Gentle floating motion
- `.animate-fadeInScale` - Fade in with scale effect
- `.animate-slideInUp` - Slide in from bottom

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

Requires:
- JavaScript enabled
- Microphone permissions (for candle blowing)
- Modern CSS support (CSS Grid, Flexbox, CSS Variables)

## License

MIT - Feel free to use this project for creating birthday cards!

## Contributing

Contributions welcome! Feel free to submit issues and pull requests.

## Future Enhancements

- [ ] Email sharing with embedded preview
- [ ] Multiple backgrounds/themes
- [ ] Custom color schemes
- [ ] Voice recording greeting
- [ ] Photo upload support
- [ ] Social media integration
- [ ] Analytics dashboard
- [ ] Custom domain support
