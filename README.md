# LimeLink

Free, unlimited file sharing powered by GoFile.io. No size limits, no registration required.

## Features

- **Unlimited File Size** - No restrictions on file sizes
- **Multi-file Upload** - Upload up to 20 files at once
- **Password Protection** - Secure your shared files (requires API token)
- **Link Expiration** - Set auto-delete after 1-90 days (requires API token)
- **QR Code Sharing** - Easy mobile sharing with QR codes
- **Dark/Light Mode** - Beautiful interface in any lighting
- **Security Built-in** - Rate limiting, XSS protection, secure headers

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd limelink
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```env
# Optional: GoFile API Token (enables password protection & expiration)
# Get your free token at: https://gofile.io/myProfile
GOFILE_TOKEN=your_token_here
GOFILE_ACCOUNT_ID=your_account_id_here

# Rate Limiting
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000

# Security
ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/limelink)

### Manual Deploy

1. Push to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables:
   - `GOFILE_TOKEN` (optional)
   - `GOFILE_ACCOUNT_ID` (optional)
   - `ALLOWED_ORIGINS` = `https://your-domain.vercel.app`
4. Deploy!

## Getting a GoFile API Token (Free)

1. Go to [gofile.io](https://gofile.io)
2. Create a free account
3. Navigate to [My Profile](https://gofile.io/myProfile)
4. Copy your API token
5. Add to `.env.local` or Vercel environment variables

**Without a token:** Files upload anonymously and may be auto-deleted after inactivity.

**With a token:** You get password protection, expiration control, and files linked to your account.

## Project Structure

```
limelink/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── server/route.ts    # Get upload server
│   │   │   └── upload/route.ts    # Handle file uploads
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main upload page
│   ├── components/
│   │   ├── ui/                    # UI primitives
│   │   ├── file-dropzone.tsx      # Drag & drop zone
│   │   ├── upload-progress.tsx    # Progress indicators
│   │   ├── upload-options.tsx     # Password/expiration
│   │   ├── share-link.tsx         # Share results + QR
│   │   ├── theme-toggle.tsx       # Dark/light switch
│   │   └── theme-provider.tsx     # Theme context
│   ├── lib/
│   │   ├── gofile.ts              # GoFile API client
│   │   ├── security.ts            # Rate limiting, XSS, etc.
│   │   └── utils.ts               # Utility functions
│   └── middleware.ts              # Security headers
├── .env.example                   # Environment template
├── .env.local                     # Local environment (git-ignored)
└── package.json
```

## Security Features

- **Rate Limiting** - Prevents abuse (configurable requests/window)
- **XSS Protection** - Input sanitization on all user data
- **CORS Validation** - Origin checking for API routes
- **Security Headers** - X-Frame-Options, CSP, etc.
- **File Validation** - MIME type checking, filename sanitization
- **No Secrets in Code** - All credentials via environment variables

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Components**: Radix UI primitives
- **Icons**: Lucide React
- **QR Codes**: qrcode library
- **Validation**: Zod
- **Storage**: GoFile.io API

## License

MIT
