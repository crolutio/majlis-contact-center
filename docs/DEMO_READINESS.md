# Demo Readiness Checklist

This document ensures the application is ready for public demos and presentations.

## ✅ Pre-Deployment Checklist

### 1. Security & Credentials
- [x] No hardcoded API keys in source code
- [x] All credentials use environment variables
- [x] Demo-level authentication (header-based) is acceptable for demos
- [ ] Verify `.env.local` is NOT committed to git (check `.gitignore`)
- [ ] All API routes have basic error handling
- [ ] Sensitive data redaction is in place (audit logging)

### 2. Database & Data
- [ ] Run all migrations in Supabase:
  - [ ] `001_initial_schema.sql`
  - [ ] `002_seed_demo_data.sql`
  - [ ] `003_seed_conversations.sql`
  - [ ] `004_banking_schema.sql`
  - [ ] `005_banking_demo_data.sql`
  - [ ] `006_add_missing_cc_step1.sql`
  - [ ] `007_cc_voice_transcripts.sql`
  - [ ] `008_outbound_workflows.sql`
  - [ ] `010_cc_automation_center.sql`
  - [ ] `011_cc_call_analysis.sql`
  - [ ] `012_banking_knowledge_base.sql`
- [ ] Verify demo data exists:
  - [ ] At least 10-15 conversations
  - [ ] Multiple agents
  - [ ] Multiple customers
  - [ ] Knowledge base articles (20+)
  - [ ] Automation events (if applicable)

### 3. Environment Variables
Required environment variables for deployment:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_CONTACT_CENTER_SECRET_KEY=your-service-role-key
USE_SUPABASE=true

# OpenAI (optional - for AI features)
OPENAI_API_KEY=your-openai-key
USE_LANGGRAPH=true

# Twilio (optional - for phone/WhatsApp)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-phone-number
TWILIO_WHATSAPP_NUMBER=whatsapp:+your-number

# Vapi (optional - for voice AI)
VAPI_API_KEY=your-vapi-key
VAPI_ASSISTANT_ID=your-assistant-id
USE_VAPI=true

# SendGrid (optional - for email)
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@yourdomain.com

# Internal keys (for demo auth)
AUTOMATION_INTERNAL_KEY=your-internal-key
OUTBOUND_INTERNAL_KEY=your-internal-key
```

### 4. Features to Test
- [ ] **Inbox**: Conversations load and filter correctly
- [ ] **Conversation Detail**: Messages display, summary works
- [ ] **Live Console**: Real-time updates work
- [ ] **Automation Center**: Events and inbox items display
- [ ] **Knowledge Base**: Articles load and search works
- [ ] **Quality Dashboard**: Agent performance displays
- [ ] **Outbound**: Campaigns and jobs work (if enabled)
- [ ] **Settings**: Configuration pages load

### 5. Error Handling
- [ ] Error boundaries catch React errors gracefully
- [ ] API errors return user-friendly messages
- [ ] Missing data shows helpful messages (not blank screens)
- [ ] Database connection errors are handled
- [ ] Network errors show retry options

### 6. UI/UX Polish
- [ ] Loading states for all async operations
- [ ] Empty states with helpful messages
- [ ] Consistent error messages
- [ ] Responsive design works on mobile/tablet
- [ ] No console errors in browser
- [ ] No broken links or 404s

### 7. Performance
- [ ] Page load times < 3 seconds
- [ ] API responses are reasonably fast
- [ ] Images/assets are optimized
- [ ] No memory leaks (check with React DevTools)

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for demo deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy

3. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables from section 3 above
   - Redeploy after adding variables

### Option 2: Other Platforms

For other platforms (Netlify, Railway, etc.):
- Follow platform-specific deployment guides
- Ensure Node.js 18+ is supported
- Add all environment variables
- Configure build command: `npm run build`
- Configure start command: `npm start`

## 🎯 Demo Mode Configuration

The application supports demo mode with:
- **Demo Authentication**: Header-based (`x-user-role: admin`)
- **Demo Data**: Pre-seeded conversations and customers
- **Graceful Degradation**: Features work even if some services are unavailable

### Enabling Demo Mode

No special configuration needed - the app automatically:
- Uses demo-level auth when no real auth is configured
- Falls back to sample data if database is unavailable
- Shows helpful error messages instead of crashing

## 📋 Post-Deployment Verification

After deployment, verify:

1. **Homepage loads**: `/`
2. **Login works**: `/login` (or auto-login in demo mode)
3. **Dashboard loads**: `/dashboard` or `/inbox`
4. **Key pages work**:
   - `/inbox` - Conversations list
   - `/conversations/[id]` - Conversation detail
   - `/automation` - Automation center
   - `/knowledge` - Knowledge base
   - `/quality` - Quality dashboard
5. **API endpoints respond**:
   - `/api/conversations` - Returns conversations
   - `/api/knowledge/search` - Returns articles
   - `/api/automation/inbox` - Returns inbox items

## 🐛 Troubleshooting

### Issue: Blank pages
- **Check**: Browser console for errors
- **Fix**: Verify environment variables are set
- **Fix**: Check database migrations are run

### Issue: "Table does not exist" errors
- **Fix**: Run missing migrations in Supabase SQL Editor
- **Check**: Verify `USE_SUPABASE=true` is set

### Issue: Authentication errors
- **Fix**: Ensure demo mode is working (check auth context)
- **Fix**: Verify `x-user-role: admin` header is set (if using API directly)

### Issue: Slow performance
- **Check**: Database query performance
- **Fix**: Add indexes if needed
- **Fix**: Check network latency to Supabase

## 📝 Demo Script

Suggested demo flow:

1. **Start at Inbox** (`/inbox`)
   - Show conversation list
   - Filter by industry/status
   - Click a conversation

2. **Conversation Detail** (`/conversations/[id]`)
   - Show messages
   - Show summary
   - Show automation items

3. **Automation Center** (`/automation`)
   - Show events
   - Show inbox items
   - Demonstrate filtering

4. **Knowledge Base** (`/knowledge`)
   - Show articles
   - Search functionality
   - Category filtering

5. **Quality Dashboard** (`/quality`)
   - Agent performance
   - Rankings
   - Metrics

## 🔒 Security Notes for Demos

- ✅ Demo-level authentication is acceptable for public demos
- ✅ No real customer data should be used
- ✅ API keys are server-side only (not exposed to client)
- ✅ Sensitive data is redacted in logs
- ⚠️ For production, implement proper authentication (JWT, OAuth, etc.)

## 📞 Support

If issues arise during demo:
- Check browser console for errors
- Check server logs (Vercel logs, etc.)
- Verify environment variables
- Check database connectivity
- Review this checklist

---

**Last Updated**: December 2025
**Status**: Ready for demo deployment

