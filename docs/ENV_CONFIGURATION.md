# Environment Configuration Priority

This project uses multiple `.env` files that are loaded in this order:

1. **`.env.local`** - Local development overrides (gitignored, never deployed)
2. **`.env`** - Committed defaults and shared config

## Local Development Setup

Create a `.env.local` file for local-only settings:

```bash
# SSL Certificate Workaround - ONLY FOR LOCAL DEVELOPMENT
NODE_TLS_REJECT_UNAUTHORIZED=0
DISABLE_SSL_VERIFY=true
```

## Why This Works

- `.env.local` is **automatically ignored** by Git (see `.gitignore`)
- Next.js and Node.js load `.env.local` **after** `.env`, so it overrides
- Vercel **never deploys** `.env.local` files
- Production uses `.env` (clean) + Vercel environment variables

## Safety Guarantees

✅ `.env.local` is in `.gitignore` - can't accidentally commit
✅ `.env.local` is never deployed to Vercel
✅ `.env` (committed) has no SSL bypass settings
✅ Production environment is always secure

## What Gets Deployed

When you deploy to Vercel:
- ✅ Uses `.env` (safe, committed version)
- ✅ Uses Vercel environment variables (set in dashboard)
- ❌ Never uses `.env.local` (local only)

## Root Cause

The SSL certificate error (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`) typically happens due to:
- Corporate proxies/firewalls
- VPN configurations
- Missing system root certificates
- macOS Keychain issues

**Proper long-term fix:** Add OpenAI's certificates to your system trust store. The `.env.local` workaround is safe but circumvents certificate validation.
