# YARD - Deck of Cards Workout

## Overview

YARD is a brutally simple, masculine fitness app inspired by prison/military PT culture. The workout is a deck of cards: flip cards, do pushups/squats based on card value, complete the deck, track total time, and try to beat best time. Built as an Expo React Native application with a local-first, single-user approach - all data is stored on-device using AsyncStorage.

## Brand Principles
- **Extremely simple**: "Flip. Move. Finish."
- **Minimal taps, minimal screens, minimal text**
- **No accounts required for base app**
- **Tone**: masculine, institutional, understated, serious, gritty-but-clean
- **No emojis, no playful animations**

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation with bottom tabs (Home, Workout, History, REC YARD, Settings)
- **State Management**: React useState for local state, useFocusEffect for screen refresh
- **Animations**: React Native Reanimated for card flip animations
- **Styling**: Custom theme system with YARD design language (matte black, concrete gray, chalk white, yard orange accent)

### Design Language
- **Colors**: Matte black (#0b0b0b), concrete gray (#1A1A1A), chalk white (#FAFAFA), yard orange (#FF6B35)
- **Typography**: ALL CAPS, condensed, letter-spaced, stencil-inspired
- **Copy Tone**: Short, cold, institutional - no hype or motivational fluff

### Data Storage
- **Local Storage**: AsyncStorage for all user data (workouts, settings)
- **No Authentication**: Single-user app with data persisted locally on device
- **Data Models**: Workout records, rule sets defined in `client/lib/storage.ts`

### Key Design Patterns
- **Path Aliases**: `@/` maps to `./client`, `@shared/` maps to `./shared`
- **Component Structure**: Reusable themed components (ThemedText, ThemedView, PlayingCard, Button)
- **Error Handling**: Custom ErrorBoundary component wrapping the app

### Workout Logic
- 52-card deck with suits mapped to exercises (spades/clubs = pushups, hearts/diamonds = squats)
- Card values determine rep counts (configurable via rule sets)
- Timer tracks workout duration with pause/resume functionality
- Personal records tracked per rule set

### Rule Sets
- **STANDARD**: A=1, J/Q/K=10, mixed exercises
- **HARD TIME**: A=11, J/Q/K=15, maximum burn
- **PUSHUPS ONLY**: All suits pushups
- **SQUATS ONLY**: All suits squats

### Screens
1. **Home** - Hub with START WORKOUT button, best time display
2. **Workout** - Card flipping, timer, FLIP button
3. **History** - Past workouts, personal bests per ruleset
4. **REC YARD** - Premium competitive module ($2.99/mo) with profile setup, global leaderboard, verified times, and weekly challenges
5. **Settings** - Ruleset picker, preferences

## External Dependencies

### Core Framework
- Expo SDK 54 with React Native new architecture enabled
- React 19.1 with experimental React Compiler

### UI & Animation
- `react-native-reanimated` for animations
- `react-native-gesture-handler` for touch interactions
- `expo-haptics` for tactile feedback (optional, default off)
- `@expo/vector-icons` (Feather icons)

### Navigation
- `@react-navigation/native` with bottom-tabs and native-stack navigators
- `react-native-screens` and `react-native-safe-area-context`

### Data Layer
- `@react-native-async-storage/async-storage` for local persistence
- `zod` for runtime type validation

### Server
- Express.js server for API proxy during development
