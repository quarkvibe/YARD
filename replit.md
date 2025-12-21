# YARD - Deck of Cards Workout

## Overview

YARD is a brutally simple, masculine fitness app inspired by prison/military PT culture. The workout is a deck of cards: flip cards, do pushups/squats based on card value, complete the deck, track total time, and try to beat best time. Built as an Expo React Native application with a local-first, single-user approach.

**Monetization:**
- **$4.99 one-time download** (configured in App Store Connect / Google Play Console)
- **$2.99/month Rec Yard subscription** (competitive mode with leaderboards, profiles, social features)

## Brand Principles
- **Extremely simple**: "Flip. Move. Finish."
- **Minimal taps, minimal screens, minimal text**
- **No accounts required for base app**
- **Tone**: masculine, institutional, understated, serious, gritty-but-clean
- **No emojis, no playful animations**

## Running on Replit

### Development Mode

1. **Start the Expo development server:**
```bash
npm run expo:dev
```

2. **Start the Express API server (separate terminal):**
```bash
npm run server:dev
```

3. **Access the app:**
   - Open the Expo Go app on your phone
   - Scan the QR code from the terminal
   - Or use the web preview at the Replit URL

### Production Build

```bash
npm run expo:static:build
npm run server:build
npm run server:prod
```

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation with bottom tabs (Home, Workout, History, REC YARD, Settings)
- **State Management**: React useState for local state, useFocusEffect for screen refresh
- **Animations**: React Native Reanimated for card flip animations and micro-interactions
- **Styling**: Custom theme system with YARD design language

### Design Language
- **Colors**: Matte black (#0b0b0b), concrete gray (#1A1A1A), chalk white (#FAFAFA), yard orange (#FF6B35)
- **Typography**: ALL CAPS, condensed, letter-spaced, stencil-inspired
- **Background**: Procedural broken concrete texture with cracks, stains, and vignettes
- **Copy Tone**: Short, cold, institutional - no hype or motivational fluff

### Data Storage
- **Local Storage**: AsyncStorage for all user data (workouts, settings)
- **Secure Storage**: expo-secure-store for sensitive profile data
- **No Authentication**: Single-user app with data persisted locally on device
- **Data Models**: Workout records, rule sets defined in `client/lib/storage.ts`

### Key Design Patterns
- **Path Aliases**: `@/` maps to `./client`, `@shared/` maps to `./shared`
- **Component Structure**: Reusable themed components (ThemedText, ConcreteBackground, PlayingCard, Button)
- **Error Handling**: Custom ErrorBoundary component wrapping the app

## Workout Logic

### Exercise Types
- **PUSHUPS**: All 52 cards are pushups
- **SQUATS**: All 52 cards are squats
- **SUPERSET**: Spades/clubs = pushups, hearts/diamonds = squats (mixed)

### Intensity Levels (Rule Sets)
- **MISDEMEANOR**: A=15, J/Q/K=10, Numbers=face value (396 total reps)
- **HARD TIME**: 1.5x all values (594 total reps)
- **LIFER**: 2x all values (792 total reps)

### Flip Modes
- **FRESH FISH**: One card at a time
- **TRUSTEE**: 2 cards at a time
- **OG**: Flip again if under 20 reps
- **POD FATHER**: Flip while under 30 reps

### Timer
- Timestamp-based timing for accuracy (no drift over long workouts)
- Screen stays awake during active workout (expo-keep-awake)
- Pause/resume functionality

## Screens

1. **Home** - Hub with START WORKOUT button, exercise/intensity config cards, best time display, tally marks for total workouts
2. **Workout** - Card flipping, timer, FLIP button, progress bar, quit confirmation
3. **History** - Past workouts with date, time, ruleset, personal bests per intensity
4. **REC YARD** - Premium competitive module ($1.99/mo subscription)
   - Paywall with feature list
   - Profile setup with photo upload
   - Global leaderboard with verified times
   - Weekly challenges
   - Social feed with likes/comments
   - Badge system (common, rare, epic, legendary)
5. **Settings** - Exercise type, intensity, flip mode, haptics, sound toggles

## Rec Yard Subscription

The $1.99/month subscription is handled by the app stores:

### Setup (App Store Connect)
1. Go to App Store Connect → Your App → Subscriptions
2. Create subscription group "Rec Yard"
3. Add subscription product with $1.99/month pricing
4. Product ID should match `REC_YARD_MONTHLY` in `client/lib/purchases.ts`

### Setup (Google Play Console)
1. Go to Play Console → Your App → Monetization → Subscriptions
2. Create subscription with $1.99/month pricing
3. Product ID should match your code

### Optional: RevenueCat Integration
RevenueCat simplifies cross-platform subscription management. If using:
1. Create account at revenuecat.com
2. Add your app and configure products
3. Replace API keys in `client/lib/purchases.ts`:
```typescript
const REVENUECAT_API_KEY_IOS = "your_ios_key";
const REVENUECAT_API_KEY_ANDROID = "your_android_key";
```

Without RevenueCat, you can use native StoreKit (iOS) or Google Play Billing directly.

## External Dependencies

### Core Framework
- Expo SDK 54 with React Native new architecture enabled
- React 19.1 with experimental React Compiler

### UI & Animation
- `react-native-reanimated` for animations
- `react-native-gesture-handler` for touch interactions
- `expo-haptics` for tactile feedback (optional, default off)
- `expo-linear-gradient` for background effects
- `@expo/vector-icons` (Feather icons)

### Navigation
- `@react-navigation/native` with bottom-tabs and native-stack navigators
- `react-native-screens` and `react-native-safe-area-context`

### Data Layer
- `@react-native-async-storage/async-storage` for local persistence
- `expo-secure-store` for sensitive data
- `zod` for runtime type validation

### Media & Device
- `expo-image-picker` for profile photos
- `expo-keep-awake` for screen wake lock during workouts
- `expo-av` for sound effects (optional)

### Payments (Optional)
- `react-native-purchases` (RevenueCat SDK)

### Server
- Express.js server for API proxy during development
- Drizzle ORM for future database integration

## File Structure

```
YARD/
├── client/
│   ├── App.tsx                    # Root component with providers
│   ├── components/
│   │   ├── ConcreteBackground.tsx # Procedural concrete texture
│   │   ├── PlayingCard.tsx        # Animated playing card
│   │   ├── Button.tsx             # Themed button
│   │   ├── ThemedText.tsx         # Themed typography
│   │   ├── ThemedView.tsx         # Themed container
│   │   └── ErrorBoundary.tsx      # Error handling
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Main hub
│   │   ├── WorkoutScreen.tsx      # Active workout
│   │   ├── HistoryScreen.tsx      # Past workouts
│   │   ├── RecYardScreen.tsx      # Competitive mode
│   │   └── SettingsScreen.tsx     # Configuration
│   ├── navigation/
│   │   ├── RootStackNavigator.tsx
│   │   └── MainTabNavigator.tsx
│   ├── lib/
│   │   ├── storage.ts             # Local data management
│   │   ├── recyard.ts             # Rec Yard profile/social
│   │   ├── purchases.ts           # Subscription management
│   │   └── query-client.ts        # React Query setup
│   ├── constants/
│   │   └── theme.ts               # Colors, spacing, typography
│   └── hooks/
│       ├── useTheme.ts
│       └── useScreenOptions.ts
├── server/
│   ├── index.ts                   # Express server
│   ├── routes.ts                  # API routes
│   └── storage.ts                 # Server-side storage
├── shared/
│   └── schema.ts                  # Shared types/schemas
├── assets/
│   └── images/                    # App icons, splash screens
├── app.json                       # Expo configuration
├── package.json
└── replit.md                      # This file
```

## Environment Variables

For Replit deployment, set these in Secrets:
- `EXPO_PUBLIC_DOMAIN` - Your Replit domain for API calls
- `DATABASE_URL` - PostgreSQL connection (if using server-side features)

## Scripts

```bash
# Development
npm run expo:dev          # Start Expo dev server
npm run server:dev        # Start Express API server

# Building
npm run expo:static:build # Build static Expo bundle
npm run server:build      # Build server for production

# Production
npm run server:prod       # Run production server

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix lint errors
npm run check:types       # TypeScript check
npm run format            # Prettier formatting
```

## Deployment Checklist

### App Store Requirements
- **Privacy Policy URL**: https://flipmovefinish.now/privacy
- **Support URL**: https://flipmovefinish.now/support
- **Marketing URL**: https://flipmovefinish.now

### Pre-Launch
- [ ] Test all workout flows on physical devices
- [ ] Configure App Store Connect subscription ($2.99/month)
- [ ] Configure Google Play subscription
- [ ] Set app price to $4.99 in both stores
- [ ] Add privacy policy URL in App Store Connect
- [ ] Create app screenshots and preview videos
- [ ] Write App Store description with brand tone

### Rec Yard Backend (Future)
For real-time leaderboards and social features:
- [ ] Set up Supabase/Firebase for backend
- [ ] Implement user authentication
- [ ] Create leaderboard API endpoints
- [ ] Add video verification storage
- [ ] Implement anti-cheat measures

## Design Guidelines Reference

See `design_guidelines.md` for complete brand specifications including:
- Color palette with hex values
- Typography hierarchy
- Copy tone examples
- Screen-by-screen specifications
- Accessibility requirements
