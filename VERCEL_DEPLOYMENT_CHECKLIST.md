# ✅ Vercel Deployment Checklist

Quick checklist for deploying to Vercel with public demo access.

## Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] All migrations run in Supabase
- [ ] Demo data verified in Supabase
- [ ] `.env.local` is in `.gitignore` (not committed)

## Vercel Setup

- [ ] Project imported from GitHub
- [ ] Framework preset: Next.js
- [ ] Build command: `npm run build` (or `pnpm build`)
- [ ] All environment variables added:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - [ ] `SUPABASE_CONTACT_CENTER_SECRET_KEY`
  - [ ] `USE_SUPABASE=true`
  - [ ] `TWILIO_ACCOUNT_SID` (for phone/WhatsApp)
  - [ ] `TWILIO_AUTH_TOKEN` (for phone/WhatsApp)
  - [ ] `TWILIO_PHONE_NUMBER` (for phone)
  - [ ] `TWILIO_WHATSAPP_NUMBER` (for WhatsApp)
  - [ ] `NEXT_PUBLIC_APP_URL` (your Vercel URL)
  - [ ] Other optional variables as needed

## Deployment

- [ ] Initial deployment successful
- [ ] App URL accessible: `https://your-project.vercel.app`
- [ ] No build errors in Vercel logs

## Twilio Webhook Configuration

- [ ] Phone number webhook configured:
  - [ ] "A CALL COMES IN": `https://your-project.vercel.app/api/twilio/incoming-call`
  - [ ] Method: HTTP POST
- [ ] WhatsApp webhook configured:
  - [ ] "A MESSAGE COMES IN": `https://your-project.vercel.app/api/twilio/whatsapp/incoming`
  - [ ] Method: HTTP POST

## Testing

- [ ] Homepage loads: `/`
- [ ] Login page works: `/login`
- [ ] Dashboard loads: `/inbox` (after login)
- [ ] API endpoints respond:
  - [ ] `/api/conversations`
  - [ ] `/api/knowledge/search`
- [ ] Phone call test:
  - [ ] Call Twilio number from any phone
  - [ ] Check Vercel logs for webhook
  - [ ] Check Supabase for new conversation
  - [ ] Check inbox in app
- [ ] WhatsApp test:
  - [ ] Send WhatsApp to Twilio number from any WhatsApp number
  - [ ] Check Vercel logs for webhook
  - [ ] Check Supabase for new conversation
  - [ ] Check inbox in app

## Public Demo Access

- [ ] ✅ **Confirmed**: App accepts calls/messages from ANY number
- [ ] Phone number shared for demos
- [ ] WhatsApp number shared for demos
- [ ] Demo URL shared: `https://your-project.vercel.app`

## Post-Deployment

- [ ] Monitor Vercel logs for errors
- [ ] Monitor Supabase for data
- [ ] Test with multiple numbers (verify no restrictions)
- [ ] Document any issues encountered

---

**✅ Ready for public demos!**

For detailed instructions, see:
- [`docs/VERCEL_DEPLOYMENT.md`](./docs/VERCEL_DEPLOYMENT.md)
- [`docs/TWILIO_WEBHOOK_SETUP.md`](./docs/TWILIO_WEBHOOK_SETUP.md)

