# 🚀 Deployment Guide for Public Demos

This guide will help you deploy the application for public demos and presentations.

## Quick Start

### 1. Pre-Deployment Checklist

Run the readiness checker:
```bash
node scripts/check-demo-readiness.js
```

Or manually verify:
- ✅ All migrations are run in Supabase
- ✅ Demo data is seeded
- ✅ Environment variables are configured
- ✅ No hardcoded credentials in code

### 2. Environment Setup

#### Required Environment Variables

**Supabase (Required)**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_CONTACT_CENTER_SECRET_KEY=your-service-role-key
USE_SUPABASE=true
```

**Optional (for full feature set)**
```env
# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-key
USE_LANGGRAPH=true

# Twilio (for phone/WhatsApp)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+your-phone-number

# Vapi (for voice AI)
VAPI_API_KEY=your-vapi-key
VAPI_ASSISTANT_ID=your-assistant-id
USE_VAPI=true

# SendGrid (for email)
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Database Setup

#### Run All Migrations

1. Open Supabase SQL Editor
2. Run migrations in order:
   - `001_initial_schema.sql`
   - `002_seed_demo_data.sql`
   - `003_seed_conversations.sql`
   - `004_banking_schema.sql`
   - `005_banking_demo_data.sql`
   - `006_add_missing_cc_step1.sql`
   - `007_cc_voice_transcripts.sql`
   - `008_outbound_workflows.sql`
   - `010_cc_automation_center.sql`
   - `011_cc_call_analysis.sql`
   - `012_banking_knowledge_base.sql`

#### Verify Demo Data

After running migrations, verify:
- At least 10-15 conversations exist
- Multiple agents are created
- Multiple customers exist
- Knowledge base has 20+ articles

### 4. Deploy to Vercel (Recommended)

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for demo deployment"
git push origin main
```

#### Step 2: Connect to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build` (or `pnpm build`)
   - Output Directory: `.next`
   - Install Command: `npm install` (or `pnpm install`)

#### Step 3: Add Environment Variables
1. Go to Project Settings → Environment Variables
2. Add all required variables (see section 2)
3. For each variable, select:
   - Production
   - Preview (optional)
   - Development (optional)

#### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Your app will be live at: `https://your-project.vercel.app`

### 5. Post-Deployment Verification

#### Test Key Pages
- [ ] Homepage: `/`
- [ ] Login: `/login`
- [ ] Inbox: `/inbox`
- [ ] Conversation Detail: `/conversations/[id]`
- [ ] Automation: `/automation`
- [ ] Knowledge Base: `/knowledge`
- [ ] Quality: `/quality`

#### Test API Endpoints
```bash
# Test conversations API
curl https://your-app.vercel.app/api/conversations

# Test knowledge base
curl https://your-app.vercel.app/api/knowledge/search

# Test automation
curl https://your-app.vercel.app/api/automation/inbox \
  -H "x-user-role: admin"
```

#### Check Browser Console
- Open browser DevTools
- Check for JavaScript errors
- Verify no 404s for assets
- Check network requests succeed

### 6. Demo Mode Configuration

The app automatically enables demo mode when:
- `NEXT_PUBLIC_DEMO_MODE=true` is set, OR
- `NODE_ENV !== "production"`

Demo mode features:
- ✅ Demo-level authentication (header-based)
- ✅ Graceful error handling
- ✅ Fallback to sample data
- ✅ User-friendly error messages

### 7. Troubleshooting

#### Issue: Blank Pages
**Solution:**
- Check browser console for errors
- Verify environment variables are set
- Check database migrations are run
- Verify `USE_SUPABASE=true` is set

#### Issue: "Table does not exist"
**Solution:**
- Run missing migrations in Supabase
- Check migration order
- Verify Supabase connection

#### Issue: Authentication Errors
**Solution:**
- Verify demo mode is enabled
- Check auth context is working
- Ensure `x-user-role: admin` header is set (for API calls)

#### Issue: Slow Performance
**Solution:**
- Check database query performance
- Verify indexes are created
- Check network latency to Supabase
- Consider enabling caching

### 8. Security Notes

⚠️ **For Public Demos:**
- ✅ Demo-level auth is acceptable
- ✅ No real customer data should be used
- ✅ API keys are server-side only
- ✅ Sensitive data is redacted in logs

⚠️ **For Production:**
- ❌ Replace demo auth with real authentication (JWT, OAuth)
- ❌ Implement proper authorization
- ❌ Use secret management (not .env.local)
- ❌ Enable rate limiting
- ❌ Add CSRF protection

### 9. Demo Script

Suggested demo flow:

1. **Start at Login** (`/login`)
   - Show demo credentials
   - Select role (admin recommended)

2. **Inbox** (`/inbox`)
   - Show conversation list
   - Filter by industry/status
   - Click a conversation

3. **Conversation Detail** (`/conversations/[id]`)
   - Show messages
   - Show summary tab
   - Show automation items

4. **Automation Center** (`/automation`)
   - Show events
   - Show inbox items
   - Demonstrate filtering

5. **Knowledge Base** (`/knowledge`)
   - Show articles
   - Search functionality
   - Category filtering

6. **Quality Dashboard** (`/quality`)
   - Agent performance
   - Rankings
   - Metrics

### 10. Maintenance

#### Regular Checks
- Monitor error logs
- Check database performance
- Verify API endpoints are working
- Update demo data periodically

#### Updates
- Pull latest changes from main branch
- Run new migrations if added
- Update environment variables if needed
- Redeploy after changes

---

## 📞 Support

If you encounter issues:
1. Check `docs/DEMO_READINESS.md` for detailed checklist
2. Review error logs in Vercel dashboard
3. Check Supabase logs
4. Verify all environment variables are set correctly

---

**Last Updated**: December 2025
**Status**: Ready for deployment

