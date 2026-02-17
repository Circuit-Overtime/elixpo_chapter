/**
 * Cloudflare D1 Integration Guide
 * 
 * This application uses Cloudflare D1 (Serverless SQL Database) for storage.
 * 
 * Setup Steps:
 * 
 * 1. Install Cloudflare Wrangler CLI:
 *    npm install -g wrangler
 * 
 * 2. Authenticate with Cloudflare:
 *    wrangler login
 * 
 * 3. Create a D1 Database:
 *    wrangler d1 create lixwish
 * 
 * 4. Initialize the schema:
 *    wrangler d1 execute lixwish --file ./schema.sql
 * 
 * 5. Update wrangler.toml with your database ID:
 *    - Replace YOUR_DATABASE_ID with the actual ID from step 3
 * 
 * 6. Update .env.local with your configuration:
 *    DATABASE_ID=your_database_id
 *    CLOUDFLARE_ACCOUNT_ID=your_account_id
 *    CLOUDFLARE_API_TOKEN=your_api_token
 * 
 * 7. Deploy to Cloudflare Pages:
 *    wrangler deploy
 * 
 * Database Schema:
 * - birthday_cards: Main table storing all birthday cards
 *   - id: Unique 6-digit alphanumeric identifier
 *   - name: Birthday person's name
 *   - age: Age of the birthday person
 *   - message: Birthday message
 *   - slug: URL-friendly name (e.g., "john-birthday")
 *   - created_at: Timestamp of card creation
 * 
 * URL Structure:
 * - Create card: GET /
 * - View card (with key prompt): GET /{slug}
 * - View card (with access): GET /{slug}/{id}
 * 
 * API Endpoints:
 * - POST /api/cards - Create a new birthday card
 * - GET /api/cards/{slug} - Get cards by slug
 * - GET /api/cards/{slug}?id={id} - Get specific card with ID verification
 */
