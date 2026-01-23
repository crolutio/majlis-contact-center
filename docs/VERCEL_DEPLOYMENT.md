# 🚀 Vercel Deployment Guide

Complete guide to deploy your contact center application to Vercel with Twilio webhooks configured for public demos.

## Prerequisites

- ✅ GitHub account
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Twilio account with phone number
- ✅ Supabase project with migrations run

## Step 1: Prepare Your Repository

### 1.1 Push to GitHub

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Verify .gitignore

Ensure `.env.local` is in `.gitignore` (it should be):
```bash
cat .gitignore | grep .env.local
```

## Step 2: Deploy to Vercel

### 2.1 Import Project

1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (or `pnpm build`)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (or `pnpm install`)

### 2.2 Add Environment Variables

Before deploying, add all required environment variables in Vercel:

**Go to**: Project Settings → Environment Variables

Add these variables:

#### Required (Supabase)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_CONTACT_CENTER_SECRET_KEY=your-service-role-key
USE_SUPABASE=true
```

#### Optional (for full features)
```env
# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-key
USE_LANGGRAPH=true

# Twilio (for phone/WhatsApp - REQUIRED for demos)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+your-phone-number
TWILIO_WHATSAPP_NUMBER=whatsapp:+your-whatsapp-number

# Vapi (for voice AI)
VAPI_API_KEY=your-vapi-key
VAPI_ASSISTANT_ID=your-assistant-id
VAPI_PHONE_NUMBER_ID=your-phone-number-id
USE_VAPI=true

# SendGrid (for email)
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@yourdomain.com

# Internal keys (for demo auth)
AUTOMATION_INTERNAL_KEY=your-internal-key
OUTBOUND_INTERNAL_KEY=your-internal-key
```

**Important**: 
- Select **Production**, **Preview**, and **Development** for each variable
- Click **"Save"** after adding each variable

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

## Step 3: Configure Twilio Webhooks

### 3.1 Get Your Vercel URL

After deployment, your app URL will be:
```
https://your-project.vercel.app
```

### 3.2 Configure Phone Number Webhook

1. **Go to Twilio Console**: https://console.twilio.com
2. **Navigate to**: Phone Numbers → Manage → Active Numbers
3. **Click** on your phone number
4. **Scroll to "Voice & Fax"** section
5. **Set "A CALL COMES IN"** webhook:
   ```
   https://your-project.vercel.app/api/twilio/incoming-call
   ```
   - Method: **HTTP POST**
6. **Set "STATUS CALLBACK URL"** (optional):
   ```
   https://your-project.vercel.app/api/twilio/webhook
   ```
   - Method: **HTTP POST**
7. **Click "Save"**

### 3.3 Configure WhatsApp Webhook

1. **In Twilio Console**, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. **Or go to**: **Phone Numbers** → **Manage** → **Active Numbers**
3. **Click** on your WhatsApp-enabled number
4. **Scroll to "Messaging"** section
5. **Set "A MESSAGE COMES IN"** webhook:
   ```
   https://your-project.vercel.app/api/twilio/whatsapp/incoming
   ```
   - Method: **HTTP POST**
6. **Set "STATUS CALLBACK URL"** (optional):
   ```
   https://your-project.vercel.app/api/twilio/whatsapp/webhook
   ```
   - Method: **HTTP POST**
7. **Click "Save"**

### 3.4 Verify Webhook Configuration

**For Phone Calls:**
- Call your Twilio number from any phone
- Check Vercel logs: Project → Logs
- Check Supabase: `cc_conversations` table should have a new row

**For WhatsApp:**
- Send a WhatsApp message to your Twilio WhatsApp number from any WhatsApp number
- Check Vercel logs
- Check Supabase: `cc_conversations` table should have a new row

## Step 4: Update Environment Variables (if needed)

If you need to update `NEXT_PUBLIC_APP_URL`:

1. Go to Vercel Project Settings → Environment Variables
2. Add or update:
   ```env
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   ```
3. **Redeploy** (Vercel will auto-redeploy, or click "Redeploy")

## Step 5: Test Your Deployment

### 5.1 Test Web Pages

Visit these URLs:
- ✅ `https://your-project.vercel.app/` → Should redirect to login
- ✅ `https://your-project.vercel.app/login` → Login page loads
- ✅ `https://your-project.vercel.app/inbox` → Inbox loads (after login)
- ✅ `https://your-project.vercel.app/automation` → Automation center loads
- ✅ `https://your-project.vercel.app/knowledge` → Knowledge base loads

### 5.2 Test API Endpoints

```bash
# Test conversations API
curl https://your-project.vercel.app/api/conversations

# Test knowledge base
curl https://your-project.vercel.app/api/knowledge/search
```

### 5.3 Test Phone Calls

1. **Call your Twilio number** from any phone
2. **Check Vercel logs** for incoming call
3. **Check Supabase** for new conversation
4. **Check inbox** in the app - conversation should appear

### 5.4 Test WhatsApp

1. **Send WhatsApp message** to your Twilio WhatsApp number from any WhatsApp number
2. **Check Vercel logs** for incoming message
3. **Check Supabase** for new conversation
4. **Check inbox** in the app - conversation should appear

## Step 6: Enable Public Demo Access

### 6.1 Verify No Number Restrictions

✅ **Already Done!** The code accepts calls/messages from **ANY** number:
- `app/api/twilio/incoming-call/route.ts` - Accepts calls from any number
- `app/api/twilio/whatsapp/incoming/route.ts` - Accepts messages from any WhatsApp number

### 6.2 Share Your Demo

Your demo is now accessible to anyone:

**Phone Demo:**
- Share your Twilio phone number: `+1XXXXXXXXXX`
- Anyone can call this number
- Calls will be handled automatically

**WhatsApp Demo:**
- Share your Twilio WhatsApp number: `+1XXXXXXXXXX`
- Anyone can message this number
- Messages will be handled automatically

## Troubleshooting

### Issue: Webhooks not receiving requests

**Solution:**
1. Check Vercel URL is correct in Twilio console
2. Verify webhook URL is accessible (try in browser - should return 405 Method Not Allowed, not 404)
3. Check Vercel logs for errors
4. Verify environment variables are set correctly

### Issue: "Table does not exist" errors

**Solution:**
1. Run all migrations in Supabase SQL Editor
2. Verify `USE_SUPABASE=true` is set
3. Check Supabase connection in Vercel logs

### Issue: Calls/Messages not appearing in inbox

**Solution:**
1. Check Vercel logs for errors
2. Verify webhooks are configured correctly
3. Check Supabase `cc_conversations` table directly
4. Verify database migrations are run

### Issue: Slow response times

**Solution:**
1. Check Vercel function logs for cold starts
2. Consider upgrading Vercel plan for better performance
3. Check Supabase connection latency
4. Enable Vercel Edge Functions if needed

## Security Notes

⚠️ **For Public Demos:**
- ✅ Webhooks are public endpoints (required by Twilio)
- ✅ No authentication needed for webhooks (Twilio validates requests)
- ✅ Demo-level auth is acceptable for UI access
- ✅ API keys are server-side only (not exposed)

⚠️ **For Production:**
- ❌ Add rate limiting to webhook endpoints
- ❌ Implement proper authentication for UI
- ❌ Use secret management (not environment variables in UI)
- ❌ Add request validation and signing

## Next Steps

1. ✅ Share your demo URL with stakeholders
2. ✅ Share your Twilio phone number for phone demos
3. ✅ Share your WhatsApp number for WhatsApp demos
4. ✅ Monitor Vercel logs for any issues
5. ✅ Monitor Supabase for data growth

## Support

If you encounter issues:
1. Check Vercel logs: Project → Logs
2. Check Supabase logs: Project → Logs
3. Review this guide
4. Check `DEMO_READINESS.md` for pre-deployment checklist

---

**Your demo is now live!** 🎉

Anyone can call or message your Twilio numbers, and the system will handle them automatically.

