# Quick Start Guide - LixWish Birthday Card Generator

## 🚀 Get Started in 5 Minutes

### 1. **Install & Run**

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) ✨

### 2. **Create Your First Card**

1. Fill in the form:
   - **Name**: Birthday person's name
   - **Age**: Age (number of candles)
   - **Message**: (Optional) Custom message
   - **Slug**: (Optional) Custom URL slug

2. Click "Create Birthday Card"

3. Get your unique access key (6-digit alphanumeric)

4. Share the link with others!

### 3. **Access a Card**

**Option A - Direct Link:**
```
https://example.com/john/ABC123
```
(Opens directly without needing a key)

**Option B - With Key Prompt:**
```
https://example.com/john
```
(Will ask for the 6-digit key)

### 4. **Blow Out Candles** 🎂

1. Click microphone button
2. Allow microphone access
3. Blow on your microphone
4. Candles will blow out one by one
5. Celebrate with confetti! 🎉

---

## 📁 Project Structure

```
app/
├── page.tsx              # Home - Card creator
├── [name]/page.tsx       # Card slug page
├── [name]/[id]/page.tsx  # Card viewer
├── api/cards/            # API endpoints
└── globals.css           # Tailwind styles

components/
├── CardCreator.tsx       # Creation form
├── CardViewer.tsx        # Main display
├── KeyPrompt.tsx         # Key entry
├── Candles.tsx           # Candle animation
├── Confetti.tsx          # Celebration effect
└── MicrophoneButton.tsx  # Microphone control

lib/
├── db.ts                 # Database setup
└── utils.ts              # Utilities
```

---

## 🎂 Features

✅ **Interactive Cards**
- Personalized with name, age, message
- Unique 6-digit access keys
- URL slug-based sharing
- Multiple cards per slug

✅ **Visual Effects**
- Animated cake with candles
- Microphone-based blow detection
- Confetti celebration
- Gradient animations
- Typewriter text

✅ **Security**
- Access key protection
- Context menu blocking
- Developer tools protection

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local`:

```env
# Cloudflare Setup (for production)
CLOUDFLARE_ACCOUNT_ID=xxxxx
CLOUDFLARE_API_TOKEN=xxxxx
DATABASE_ID=xxxxx

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LixWish
```

---

## 🌍 Route Reference

| Route | Purpose |
|-------|---------|
| `/` | Create new card |
| `/{name}` | Enter access key |
| `/{name}/{id}` | View card |

---

## 📚 Documentation

- [Full Setup Guide](./SETUP.md) - Detailed installation
- [Cloudflare Setup](./CLOUDFLARE_SETUP.md) - D1 Database
- [Deployment](./DEPLOYMENT_CHECKLIST.md) - Deployment guide
- [README](./README.md) - Project details

---

## 🛠️ Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npx tsc --noEmit
```

---

## 🎯 Key URL Patterns

### Creating a Card
- **User enters**: Name = "John", Age = 25
- **System generates**: ID = "ABC123", Slug = "john"
- **Result**: Card at `/john/ABC123`

### Sharing
- **Direct link** (no key needed):
  ```
  https://yoursite.com/john/ABC123
  ```

- **Slug only** (key required):
  ```
  https://yoursite.com/john
  ```
  → Prompts for key "ABC123"

### Multiple People
- **John's first card**: `/john/ABC123`
- **John's second card**: `/john/XYZ789`
- **Sarah's card**: `/sarah/DEF456`

---

## 🎤 Microphone Features

### How Blow Detection Works
1. Click microphone button
2. Grant browser microphone access
3. Audio analyzer detects blow patterns
4. Low-frequency sound = blowing detected
5. Each blow = one candle extinguished

### Tips for Best Results
- Blow gently and steadily
- Blow toward microphone
- Avoid background noise
- Use in quiet environment
- Try different blow intensities

---

## 🚀 Deployment Quick Links

### Cloudflare Pages
1. Push code to GitHub
2. Go to Cloudflare Dashboard → Pages
3. Create project from Git
4. Set build command: `npm run build`
5. Deploy!

### Environment in Cloudflare
Add these in Pages → Settings → Environment Variables:
```
CLOUDFLARE_ACCOUNT_ID=xxxxx
CLOUDFLARE_API_TOKEN=xxxxx
DATABASE_ID=xxxxx
```

---

## 🐛 Troubleshooting

### Card not found?
- Check URL slug and ID
- Verify in database
- Check case sensitivity

### Microphone not working?
- Grant browser permissions
- Check microphone in system settings
- Try different browser
- Check browser console for errors

### Confetti not showing?
- Check CSS loaded correctly
- Verify `max-z-index` not exceeded
- Check browser console

### Build fails?
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

## 📸 Example Screenshots Flow

1. **Home** → See card creation form
2. **Created** → Get unique access key
3. **Access** → Enter key to view card
4. **View** → See animated cake and message
5. **Interact** → Click microphone, blow, celebrate!

---

## ✨ Tips & Tricks

### Create Better Cards
- Use short, catchy names for URLs
- Add personalized messages
- Test on mobile for sharing

### Share Effectively
- Use shortened links to slug-only URLs
- Include instructions to enter key
- Test link before sharing

### Customize
- Edit colors in `globals.css`
- Modify animation speeds
- Change text in components
- Add more effects!

---

## 🤝 Support

Need help?
1. Check [SETUP.md](./SETUP.md) for detailed guide
2. Review console errors
3. Check browser compatibility
4. Review [README.md](./README.md)

---

## 📝 License

MIT - Feel free to use, modify, and share!

---

**Happy Birthday Card Making! 🎉**
