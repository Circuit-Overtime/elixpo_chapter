# LixWish - Complete Setup & Installation Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Cloudflare D1 Database Setup](#cloudflare-d1-database-setup)
3. [Deployment to Cloudflare](#deployment-to-cloudflare)
4. [Architecture Overview](#architecture-overview)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn
- Git
- Cloudflare Account (for D1 database)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd lixwish

# Install dependencies
npm install
```

### Step 2: Environment Configuration

```bash
# Copy the example environment file
cp .env.local.example .env.local

# Edit .env.local with your Cloudflare credentials
# (You'll get these values from Cloudflare Dashboard)
```

**Edit `./.env.local`:**

```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
DATABASE_ID=your_database_id_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LixWish

# Feature Flags
NEXT_PUBLIC_ENABLE_TELEMETRY=false
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app should now be running locally with hot-reload enabled.

---

## Cloudflare D1 Database Setup

### Step 1: Install Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler@latest

# Or use npx
npx wrangler --version
```

### Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate. After authentication, your credentials will be stored locally.

### Step 3: Create D1 Database

```bash
# Create a new D1 database
wrangler d1 create lixwish

# Wrangler will output your database ID - SAVE THIS!
```

You'll see output like:
```
✓ Created database 'lixwish' in account <account_id>
  Database ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Copy Database ID to Configuration

```bash
# Update your wrangler.toml with the database ID
# Also update .env.local with the DATABASE_ID

# Example:
# DATABASE_ID=12345678-abcd-efgh-ijkl-mnopqrstuvwx
```

### Step 5: Initialize Database Schema

```bash
# Execute the schema.sql file to create tables
wrangler d1 execute lixwish --file ./schema.sql

# Verify tables were created
wrangler d1 execute lixwish --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see:
```
┌───────────────────┐
│ name              │
├───────────────────┤
│ birthday_cards    │
└───────────────────┘
```

### Step 6: Test with Sample Data

```bash
# View sample data
wrangler d1 execute lixwish --command "SELECT * FROM birthday_cards LIMIT 1;"
```

---

## Deployment to Cloudflare

### Option 1: Cloudflare Pages (Recommended)

#### Prerequisites

- Your project pushed to GitHub, GitLab, or Bitbucket
- Cloudflare account with Pages access

#### Setup Steps

1. **Go to Cloudflare Dashboard**
   - Navigate to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Select "Pages" from the sidebar

2. **Create a New Project**
   - Click "Create a project"
   - Select "Connect to Git"
   - Authorize and select your repository
   - Choose the `lixwish` repository

3. **Configure Build Settings**
   - Framework: Next.js
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Root directory: `/`

4. **Environment Variables**
   - Add the same variables from `.env.local` to Cloudflare Pages environment

5. **Bind D1 Database**
   - In Pages project settings
   - Go to "Functions" → "D1 Database Bindings"
   - Bind the `lixwish` database

6. **Deploy**
   - Push changes to your Git repository
   - Cloudflare will automatically build and deploy

### Option 2: Manual Deployment with Wrangler

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .next

# Or if using Workers with D1
wrangler deploy
```

---

## Architecture Overview

### Directory Structure

```
lixwish/
├── app/                        # Next.js app directory
│   ├── layout.tsx             # Root layout with providers
│   ├── page.tsx               # Home page (card creator)
│   ├── globals.css            # Global Tailwind styles
│   ├── [name]/                # Dynamic slug route
│   │   ├── page.tsx           # Slug landing page (key prompt)
│   │   └── [id]/              # Dynamic card ID route
│   │       └── page.tsx       # Card viewer (with ID verification)
│   └── api/                   # API routes
│       └── cards/
│           ├── route.ts       # POST/GET cards
│           └── [slug]/route.ts# GET cards by slug
├── components/                # React components
│   ├── CardCreator.tsx        # Birthday card creation form
│   ├── CardViewer.tsx         # Main card display
│   ├── KeyPrompt.tsx          # Key entry modal
│   ├── Candles.tsx            # Animated candles
│   ├── Confetti.tsx           # Confetti effect
│   ├── MicrophoneButton.tsx   # Microphone/blow detection
│   └── ContextMenuProtection.tsx  # Anti-dev-tools
├── lib/                       # Utilities
│   ├── db.ts                  # D1 database helpers
│   └── utils.ts               # Utility functions
├── public/                    # Static assets
├── wrangler.toml              # Cloudflare configuration
├── schema.sql                 # D1 database schema
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies

```

### Data Flow

1. **Card Creation**:
   - User fills form on `/`
   - Form submits to `POST /api/cards`
   - API generates 6-digit ID
   - Redirects to `/{slug}/{id}`

2. **Card Access**:
   - User visits `/{slug}`
   - Shown `KeyPrompt` component
   - User enters 6-digit key
   - Redirected to `/{slug}/{id}` after verification

3. **Card Viewing**:
   - User at `/{slug}/{id}` with valid key
   - Component fetches card data from D1
   - Displays `CardViewer` with effects
   - Microphone detection for candle blowing

### Database Schema

```sql
CREATE TABLE birthday_cards (
  id TEXT PRIMARY KEY,           -- 6-digit alphanumeric key
  name TEXT NOT NULL,            -- Birthday person's name
  age INTEGER NOT NULL,          -- Age (for candle count)
  message TEXT,                  -- Birthday message
  slug TEXT NOT NULL,            -- URL-friendly slug
  created_at DATETIME,           -- Creation timestamp
  updated_at DATETIME            -- Last update timestamp
);

CREATE INDEX idx_slug ON birthday_cards(slug);
```

### API Endpoints

#### POST /api/cards
Create a new birthday card.

**Request:**
```json
{
  "name": "John",
  "age": 25,
  "message": "Happy Birthday!",
  "slug": "john-birthday"  // Optional
}
```

**Response:**
```json
{
  "id": "ABC123",
  "name": "John",
  "age": 25,
  "message": "Happy Birthday!",
  "slug": "john-birthday",
  "created_at": "2024-02-17T10:30:00Z"
}
```

#### GET /api/cards/{slug}
Get all cards for a slug.

**Response:**
```json
[
  {
    "id": "ABC123",
    "name": "John",
    "age": 25,
    ...
  }
]
```

#### GET /api/cards/{slug}?id={id}
Get specific card with ID verification.

---

## URL Structure

| URL | Purpose | View |
|-----|---------|------|
| `/` | Create card | Form |
| `/{slug}` | Access card (key required) | KeyPrompt |
| `/{slug}/{id}` | View card | CardViewer |

**Example Flow:**
```
1. Create card for "john" with age 25
   → Generates ID: "ABC123"
   → Redirects to: /john/ABC123

2. Share link: https://example.com/john/ABC123
   → Direct access to card (no key needed)

3. Share only slug: https://example.com/john
   → Shows KeyPrompt
   → User enters: ABC123
   → Redirected to: /john/ABC123
```

---

## Troubleshooting

### Common Issues

#### 1. "Database not found" Error

**Solution:**
```bash
# Check your DATABASE_ID in .env.local
# Verify database exists
wrangler d1 list

# Recreate if needed
wrangler d1 create lixwish
```

#### 2. Microphone Not Detecting Blow

**Possible Causes:**
- Microphone permissions not granted
- Browser doesn't support Web Audio API
- Threshold too high

**Solutions:**
```bash
# Check browser support
# Chrome/Edge 90+, Firefox 88+, Safari 14+

# In browser console:
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Microphone accessible'))
  .catch(err => console.error('Microphone access denied'))

# Lower the threshold in MicrophoneButton.tsx if needed
const threshold = 100; // Try lowering this value
```

#### 3. Tailwind CSS Not Applied

**Solution:**
```bash
# Rebuild Tailwind
npm run build

# Clear cache
rm -rf .next
npm run dev
```

#### 4. CORS Issues

**Solution:**
```bash
# Add CORS headers in next.config.ts
# (Already configured in the provided config)

headers: async () => {
  return [{ 
    source: '/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' }
    ]
  }]
}
```

#### 5. Deployment Fails

**Debug Steps:**
```bash
# Build locally
npm run build

# Check for errors
npm run lint

# Test with Wrangler
wrangler pages deploy .next

# Check Cloudflare logs
wrangler tail
```

---

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**: Next.js automatically code-splits components
2. **Image Optimization**: Use `next/image` for images
3. **CSS**: Tailwind purges unused CSS in production

### Database Optimizations

1. **Indexes**: Database has indexes on `slug` and `created_at`
2. **Caching**: Use Next.js revalidation for card data

```typescript
export const revalidate = 3600; // Revalidate every hour
```

### Deployment Optimizations

1. **Minification**: Automatic in production build
2. **CDN**: Cloudflare Pages uses global CDN
3. **Edge Computing**: Leverage Cloudflare Workers for compute

---

## Security Considerations

✅ **Implemented:**
- Access key protection (6-digit alphanumeric)
- Context menu blocking
- Developer tools blocking
- Security headers in Next.js config
- HTTPS only on production
- CSRF protection

📋 **Additional Recommendations:**
- Implement rate limiting on API routes
- Add CAPTCHA for card creation if needed
- Regular security audits
- Keep dependencies updated
- Monitor for suspicious activity

---

## Getting Help

For issues or questions:

1. **Check the logs**:
   ```bash
   wrangler tail
   ```

2. **Review Cloudflare docs**:
   - [D1 Documentation](https://developers.cloudflare.com/d1/)
   - [Pages Documentation](https://developers.cloudflare.com/pages/)
   - [Workers Documentation](https://developers.cloudflare.com/workers/)

3. **Next.js Documentation**:
   - [Next.js Docs](https://nextjs.org/docs)
   - [Tailwind CSS](https://tailwindcss.com/docs)

---

## License

MIT - Feel free to use and modify this project!
