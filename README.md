# Family Expense Manager - PWA

A Progressive Web App for managing shared family expenses, built with Next.js, React, Tailwind CSS, and shadcn/ui. Optimized for mobile devices.

## Tech Stack

- ✅ **Next.js 14** - React framework with App Router
- ✅ **React 18** - UI library
- ✅ **TypeScript** - Type safety
- ✅ **Tailwind CSS** - Utility-first CSS framework
- ✅ **shadcn/ui** - Beautiful, accessible component library
- ✅ **next-pwa** - PWA support with service worker
- ✅ **Radix UI** - Headless UI primitives
- ✅ **Lucide React** - Icon library

## Features

- 📱 Mobile-first responsive design
- 🎨 Modern, clean UI with shadcn/ui components
- ⚡ Progressive Web App (PWA) support
- 💰 Expense tracking interface
- 👥 Multi-member expense splitting
- 📊 Summary cards and filters
- 🎯 Category-based expense organization
- ♿ Fully accessible components
- 🎭 Smooth animations and transitions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Icon Files (Optional)

Icon files are optional - the app works perfectly without them! When you're ready, you can add:

- `public/icon-192.png` - 192x192 pixels
- `public/icon-512.png` - 512x512 pixels

Place them in the `public` directory. The manifest already references them.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

### 5. Testing on Mobile

1. Make sure your computer and mobile device are on the same network
2. Find your computer's local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
3. Start the dev server and access it from your mobile browser using: `http://YOUR_IP:3000`
4. On mobile, you can "Add to Home Screen" to install as a PWA

## Project Structure

```
.
├── app/
│   ├── globals.css          # Global styles with Tailwind
│   ├── layout.tsx            # Root layout
│   ├── manifest.ts           # PWA manifest
│   └── page.tsx              # Main page component
├── components/
│   └── ui/                   # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── checkbox.tsx
├── lib/
│   └── utils.ts              # Utility functions
├── public/                   # Static assets
│   ├── icon-192.png          # App icon (optional)
│   └── icon-512.png          # App icon (optional)
├── next.config.js            # Next.js configuration with PWA
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── components.json           # shadcn/ui configuration
└── package.json              # Dependencies
```

## Current Status

✅ **UI Complete** - All interface elements are in place with shadcn/ui
⏳ **Functionality** - Not yet implemented (as requested)

## UI Components

- **Header**: App title and menu button with gradient background
- **Summary Cards**: Total spent, you paid, you owe with gradient styling
- **Filter Tabs**: All, Today, This Week, This Month
- **Expense List**: Empty state (ready for expenses)
- **Add Expense Dialog**: Full form with categories, split options using shadcn/ui Dialog
- **Side Menu**: Navigation menu with smooth animations
- **FAB**: Floating action button for quick expense addition

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

## Next Steps

When ready to add functionality:
1. Set up state management (Zustand, Redux, or Context API)
2. Implement data storage (IndexedDB or localStorage)
3. Add expense CRUD operations
4. Implement expense splitting calculations
5. Add family member management
6. Create reports and analytics
7. Add data persistence and sync

## Notes

- The app uses Next.js App Router (app directory)
- All components are built with shadcn/ui for consistency
- PWA features are configured with next-pwa
- Service worker is automatically generated in production builds
- All interactions are touch-optimized for mobile
- Components follow accessibility best practices
