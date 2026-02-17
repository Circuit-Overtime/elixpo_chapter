# Pre-Deployment Checklist

## Code Quality

- [ ] Run `npm run lint` - All errors must be fixed
- [ ] Run `npm run build` - Build must be successful
- [ ] Test locally with `npm run dev`
- [ ] All TypeScript types are correct
- [ ] No console errors in browser
- [ ] No console warnings in browser

## Features Testing

### Card Creation
- [ ] Can create card with name and age
- [ ] Optional message field works
- [ ] Optional custom slug works
- [ ] 6-digit ID is generated correctly
- [ ] Slug auto-generation from name works

### Card Access
- [ ] Can access card via `/{slug}` and enter key
- [ ] Can access card via direct link `/{slug}/{id}`
- [ ] Invalid key shows error
- [ ] Loading state displays while fetching

### Card Viewing
- [ ] Page renders correctly
- [ ] Typewriter effect on message works
- [ ] Cake and candles render
- [ ] Candles count matches age
- [ ] Microphone permissions request works

### Microphone Features
- [ ] Microphone button appears
- [ ] Can grant microphone access
- [ ] Blow detection works
- [ ] Each blow extinguishes one candle
- [ ] All candles blown triggers confetti
- [ ] Confetti animation displays correctly

### UI/UX
- [ ] Responsive on mobile (375px - 2560px)
- [ ] Dark mode looks correct
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts (CLS)
- [ ] Color contrast meets accessibility standards

### Security
- [ ] Right-click menu is blocked
- [ ] F12 (dev tools) shows message
- [ ] Ctrl+U (view source) is blocked
- [ ] Ctrl+Shift+I (inspect) shows message
- [ ] Context menu protection works on all functions

## Database

- [ ] D1 database created in Cloudflare
- [ ] Schema initialized with tables
- [ ] Sample data inserted and retrievable
- [ ] Indexes created on `slug` and `created_at`
- [ ] Connection string verified in config

## Environment Configuration

- [ ] `.env.local` file created
- [ ] `DATABASE_ID` set correctly
- [ ] `CLOUDFLARE_ACCOUNT_ID` set correctly
- [ ] `CLOUDFLARE_API_TOKEN` set correctly
- [ ] `NEXT_PUBLIC_APP_URL` set correctly
- [ ] All required environment variables are defined

## Deployment

### Pre-Deployment
- [ ] All branches merged to main
- [ ] `README.md` is up to date
- [ ] `SETUP.md` is complete and accurate
- [ ] `CLOUDFLARE_SETUP.md` has all needed info
- [ ] No hardcoded secrets in code

### Cloudflare Pages/Workers
- [ ] Project created in Cloudflare Dashboard
- [ ] Git repository connected
- [ ] Build command correct: `npm run build`
- [ ] Output directory correct: `.next`
- [ ] D1 database bound in project settings
- [ ] Environment variables added to Pages
- [ ] Custom domain configured (if applicable)

### Post-Deployment
- [ ] Test main URL loads
- [ ] Test card creation endpoint
- [ ] Test card retrieval endpoints
- [ ] Verify D1 connection works
- [ ] Check Cloudflare logs for errors
- [ ] Monitor performance metrics
- [ ] Test on multiple browsers

## Performance

- [ ] First Contentful Paint (FCP) < 2s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Input Delay (FID) < 100ms
- [ ] Total Blocking Time (TBT) < 300ms

## Accessibility

- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Motion respects `prefers-reduced-motion`

## Monitoring

- [ ] Error tracking enabled (if applicable)
- [ ] Analytics configured (if applicable)
- [ ] Database performance monitored
- [ ] API response times monitored
- [ ] Error rates tracked

## Documentation

- [ ] README updated with current features
- [ ] API documentation complete
- [ ] Setup guide is clear
- [ ] Deployment steps documented
- [ ] Troubleshooting section added
- [ ] Future enhancements listed

## Browser Compatibility

Test on:
- [ ] Chrome/Chromium 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

## Mobile Testing

- [ ] iPhone 12/13/14/15
- [ ] Android 10+
- [ ] iPad
- [ ] Tablets (landscape & portrait)

## Before Going Live

1. ✅ All checklist items completed
2. ✅ Final testing on production-like environment
3. ✅ Backup of configuration
4. ✅ Rollback plan prepared
5. ✅ Team notification prepared
6. ✅ Post-launch monitoring plan ready

## Post-Launch Monitoring

- [ ] Monitor error rates for 24 hours
- [ ] Check database performance
- [ ] Verify API response times
- [ ] Review user feedback
- [ ] Monitor resource usage
- [ ] Check for security issues
