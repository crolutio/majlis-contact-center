# 🎯 Demo Quick Start Guide

Get your application ready for public demos in 5 minutes!

## ✅ What's Already Done

- ✅ Error boundaries added (`app/error.tsx`, `app/global-error.tsx`)
- ✅ 404 page created (`app/not-found.tsx`)
- ✅ Demo configuration system (`lib/demo-config.ts`)
- ✅ Comprehensive documentation (`docs/DEMO_READINESS.md`)
- ✅ Deployment guide (`DEPLOYMENT_GUIDE.md`)
- ✅ Security: `.env.local` is in `.gitignore`

## 🚀 Quick Setup (5 Steps)

### Step 1: Run Database Migrations

1. Open Supabase SQL Editor
2. Run these migrations in order:
   ```
   001_initial_schema.sql
   002_seed_demo_data.sql
   003_seed_conversations.sql
   004_banking_schema.sql
   005_banking_demo_data.sql
   006_add_missing_cc_step1.sql
   007_cc_voice_transcripts.sql
   008_outbound_workflows.sql
   010_cc_automation_center.sql
   011_cc_call_analysis.sql
   012_banking_knowledge_base.sql
   ```

### Step 2: Configure Environment Variables

Create `.env.local` (if not exists) with:
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_CONTACT_CENTER_SECRET_KEY=your-service-role-key
USE_SUPABASE=true

# Optional (for full features)
OPENAI_API_KEY=your-key (optional)
USE_LANGGRAPH=true (optional)
```

### Step 3: Test Locally

```bash
npm install
npm run dev
```

Visit: http://localhost:3000

Login with:
- Email: `demo@majlisconnect.com`
- Password: `demo123`
- Role: `admin`

### Step 4: Deploy to Vercel

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Ready for demo"
   git push
   ```

2. Connect to Vercel:
   - Go to https://vercel.com
   - Import your GitHub repo
   - Add environment variables
   - Deploy!

3. Configure Twilio Webhooks (for phone/WhatsApp demos):
   - See [`docs/TWILIO_WEBHOOK_SETUP.md`](./docs/TWILIO_WEBHOOK_SETUP.md)
   - Set webhook URLs to your Vercel URL
   - **✅ Your app accepts calls/messages from ANY number** (no restrictions!)

### Step 5: Verify

Test these pages:
- ✅ `/login` - Login works
- ✅ `/inbox` - Conversations load
- ✅ `/conversations/[id]` - Detail page works
- ✅ `/automation` - Automation center loads
- ✅ `/knowledge` - Knowledge base works
- ✅ `/quality` - Quality dashboard works

## 🎨 Demo Features

Your demo includes:

1. **Inbox** - Multi-industry conversation management
2. **Conversation Detail** - Full conversation view with analysis
3. **Automation Center** - Event tracking and inbox items
4. **Knowledge Base** - 20+ banking support articles
5. **Quality Dashboard** - Agent performance metrics
6. **Live Console** - Real-time call monitoring (if Twilio configured)

## 🔒 Security

- ✅ No hardcoded credentials
- ✅ Environment variables only
- ✅ Demo-level auth (acceptable for demos)
- ✅ Sensitive data redaction in place

## 📚 Documentation

- **Full Checklist**: `docs/DEMO_READINESS.md`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Architecture**: `BACKEND_ARCHITECTURE.md`

## 🐛 Troubleshooting

**Blank pages?**
- Check browser console
- Verify environment variables
- Run migrations

**"Table does not exist"?**
- Run missing migrations
- Check `USE_SUPABASE=true`

**Slow performance?**
- Check database indexes
- Verify Supabase connection

## 🎯 Demo Script

1. Start at `/login` - Show demo credentials
2. Go to `/inbox` - Show conversations
3. Click a conversation - Show detail page
4. Visit `/automation` - Show automation center
5. Visit `/knowledge` - Show knowledge base
6. Visit `/quality` - Show agent performance

---

**Ready to demo!** 🚀

For detailed information, see `DEPLOYMENT_GUIDE.md`

