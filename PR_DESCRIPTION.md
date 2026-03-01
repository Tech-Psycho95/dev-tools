# Pull Request: DNS Lookup Simulator Feature

## Summary

This PR introduces a new **DNS Lookup Simulator** tool that allows users to query DNS records for any domain directly from the BetterBugs.io development tools suite.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ARCHITECTURE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     HTTP Request      ┌─────────────────────┐
  │              │ ──────────────────►   │                     │
  │   Frontend   │  /api/dns-lookup?     │   Backend API       │
  │   (React)    │   domain=example.com  │   (Next.js Route)   │
  │              │   &type=A             │                     │
  └──────────────┘                       └─────────────────────┘
         ▲                                         │
         │                                         │ DoH Request
         │                                         ▼
         │                               ┌─────────────────────┐
         │                               │   DNS-over-HTTPS    │
         │  JSON Response                │   Provider          │
         │  {                            │   ┌───────────────┐ │
         │    success: true,             │   │  Cloudflare   │ │
         │    domain: "example.com",     │   │  (Primary)    │ │
         │    records: [...],            │   └───────────────┘ │
         │    queryTime: 45,             │   ┌───────────────┐ │
         │    provider: "cloudflare"     │   │  Google       │ │
         │  }                            │   │  (Fallback)   │ │
         │                               │   └───────────────┘ │
         └───────────────────────────────└─────────────────────┘
```

## Changes Made

### Backend (`app/api/dns-lookup/route.ts`)

- **New API endpoint**: `GET /api/dns-lookup`
- **Query parameters**:
  - `domain` (required): Domain name to lookup
  - `type` (optional): Record type - A, AAAA, CNAME, MX, TXT, NS (default: A)
  - `provider` (optional): DNS provider - cloudflare or google (default: cloudflare)
- **Features**:
  - Secure DNS-over-HTTPS (DoH) queries
  - Automatic provider fallback (Cloudflare → Google)
  - Domain validation and sanitization
  - Structured JSON response with TTL and priority values
  - Proper error handling with descriptive messages
  - Response caching (5 minutes)

### Frontend (`app/components/developmentToolsComponent/dnsLookupSimulator.tsx`)

- **Input controls**:
  - Domain name text input with Enter key support
  - Record type dropdown (A, AAAA, CNAME, MX, TXT, NS)
  - DNS provider selector (Cloudflare, Google)
- **Results display**:
  - Clean table layout with color-coded record types
  - Human-readable TTL formatting (e.g., "1h 30m" instead of "5400")
  - Priority column for MX records
  - Query metadata (domain, type, provider, query time)
- **UX polish**:
  - Loading spinner during lookups
  - Copy-to-clipboard for individual values and all records
  - Informative error states and empty result handling
  - Record type explanations in info section

### Configuration (`app/libs/constants.tsx`)

- Added `DnsLookupSimulator` component import
- Added `DNS_LOOKUP_SIMULATOR: '/dns-lookup-simulator'` to PATHS
- Added route configuration to `developmentToolsRoutes`

### Content (`app/libs/developmentToolsConstant.tsx`)

- Added complete tool documentation including:
  - Hero section title and description
  - Related tools list
  - About section explaining the tool
  - Step-by-step usage guide
  - Common use cases
  - SEO meta tags

## Testing Steps

### Manual Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the tool**:
   - Go to `http://localhost:3000/dns-lookup-simulator`

3. **Test basic lookup**:
   - Enter `google.com` in the domain field
   - Keep record type as `A`
   - Click "Lookup"
   - Verify: IPv4 addresses appear in results table

4. **Test different record types**:
   | Domain | Record Type | Expected Result |
   |--------|-------------|-----------------|
   | google.com | A | IPv4 addresses |
   | google.com | AAAA | IPv6 addresses |
   | google.com | MX | Mail servers with priority |
   | google.com | NS | Name servers |
   | google.com | TXT | SPF, verification records |
   | www.google.com | CNAME | Canonical name (if any) |

5. **Test provider switching**:
   - Perform lookup with Cloudflare
   - Switch to Google DNS
   - Perform same lookup
   - Verify: Both return consistent results

6. **Test error handling**:
   - Enter invalid domain: `not-a-real-domain.xyz`
   - Verify: Error message displays
   - Enter empty domain and click Lookup
   - Verify: Validation error appears

7. **Test copy functionality**:
   - Perform a successful lookup
   - Click copy button on individual record
   - Verify: Value copied to clipboard
   - Click "Copy All" button
   - Verify: All records copied in zone file format

8. **Test keyboard navigation**:
   - Enter domain in input field
   - Press Enter
   - Verify: Lookup is triggered

### API Testing

```bash
# Basic A record lookup
curl "http://localhost:3000/api/dns-lookup?domain=google.com&type=A"

# MX record lookup
curl "http://localhost:3000/api/dns-lookup?domain=google.com&type=MX"

# Using Google DNS provider
curl "http://localhost:3000/api/dns-lookup?domain=example.com&type=TXT&provider=google"

# Invalid domain test
curl "http://localhost:3000/api/dns-lookup?domain=invalid"

# Missing domain test
curl "http://localhost:3000/api/dns-lookup?type=A"
```

## Screenshots

> Add screenshots here showing:
> - Initial empty state
> - Successful A record lookup
> - MX record lookup with priorities
> - Error state display
> - Mobile responsive view

## Checklist

- [x] Code follows project conventions
- [x] Component matches existing UI patterns
- [x] API handles errors gracefully
- [x] Loading states implemented
- [x] Copy-to-clipboard functionality working
- [x] Mobile responsive design
- [x] SEO metadata added
- [x] Related tools linked
- [ ] Screenshots added to PR

## Related Issues

Closes #[issue-number]

## Notes for Reviewers

- The backend uses DNS-over-HTTPS (DoH) which provides secure, privacy-respecting DNS queries
- Provider fallback ensures reliability even if primary DNS service is unavailable
- TTL values are displayed in both human-readable format and raw seconds for technical users
- MX records are automatically sorted by priority (lowest first)
