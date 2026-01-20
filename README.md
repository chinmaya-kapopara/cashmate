# CashMate

A Progressive Web App for managing shared family expenses, built with Next.js, React, Tailwind CSS, and Supabase. Track income and expenses, manage multiple books, collaborate with family members, and view detailed activity logs.

## Tech Stack

- ✅ **Next.js 16** - React framework with App Router
- ✅ **React 19** - UI library
- ✅ **TypeScript** - Type safety
- ✅ **Tailwind CSS v4** - Utility-first CSS framework
- ✅ **shadcn/ui** - Beautiful, accessible component library
- ✅ **next-pwa** - PWA support with service worker
- ✅ **Supabase** - Backend as a Service (Authentication, Database, Realtime)
- ✅ **Radix UI** - Headless UI primitives
- ✅ **Lucide React** - Icon library
- ✅ **Sonner** - Toast notifications

## Features

- 📱 **Mobile-first PWA** - Install as an app on your device
- 🔐 **Authentication** - Secure user authentication with Supabase
- 📚 **Multiple Books** - Organize transactions into separate books
- 👥 **Role-Based Access** - Owner, Admin, Editor, and Viewer roles
- 💰 **Income & Expense Tracking** - Track all financial transactions
- 🏷️ **Party Management** - Organize transactions by parties
- 📊 **Real-time Updates** - See changes instantly across all devices
- 🔍 **Advanced Filtering** - Filter by date, type, member, and party
- 📈 **Activity Log** - Track all changes and activities
- 🔔 **Notifications** - Browser and in-app notifications for activities
- 📅 **Date Management** - Flexible date filtering with dd-mm-yyyy format
- 🔄 **Transaction History** - View complete history of transaction changes
- 🎨 **Modern UI** - Clean, intuitive interface with light grey backgrounds

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase project (free tier works)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Database Setup

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the SQL script from `supabase-setup.sql` to set up all tables, RLS policies, and functions

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
.
├── app/
│   ├── auth/
│   │   └── page.tsx           # Authentication page
│   ├── globals.css            # Global styles with Tailwind v4
│   ├── layout.tsx              # Root layout with metadata
│   ├── manifest.ts             # PWA manifest
│   └── page.tsx                # Main application page
├── components/
│   ├── landing-page.tsx        # Landing page component
│   └── ui/                     # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── sonner.tsx
├── lib/
│   ├── supabase.ts             # Supabase client
│   └── utils.ts                # Utility functions
├── public/                     # Static assets
│   ├── cashmate_wallet_logo.png
│   └── cashmate_wallet_logo_2.png
├── supabase/
│   └── setup.sql               # Database setup script
├── next.config.js              # Next.js configuration with PWA
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Key Features Explained

### Role-Based Access Control

- **Owner**: Full control - can add/remove members, edit roles, manage books
- **Admin**: Can add/remove members, edit transactions, manage parties
- **Editor**: Can add/edit/delete transactions, manage parties
- **Viewer**: Read-only access - can view transactions and history

### Books

- Create multiple books to organize different expense categories
- Each book has its own transactions, parties, and members
- Switch between books easily
- Books are private to their members

### Transactions

- Add income and expense transactions
- Set amount, description, party, and date
- View running balance for each transaction
- Edit and delete transactions (based on role)
- View complete transaction history

### Activity Log

- Track all activities: transactions, member changes, party changes, book changes
- Real-time updates when activities occur
- Filter by activity type
- Browser notifications support

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11.3+)
- Samsung Internet

## Deployment

The app is configured for deployment on Vercel. Make sure to:

1. Set all environment variables in Vercel dashboard

## Notes

- The app uses Next.js App Router (app directory)
- All components are built with shadcn/ui for consistency
- PWA features are configured with next-pwa
- Service worker is automatically generated in production builds
- All interactions are touch-optimized for mobile
- Components follow accessibility best practices
- Dates are displayed and input in dd-mm-yyyy format
- Real-time subscriptions keep data synchronized across devices