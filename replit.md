# Deck of Cards Workout

## Overview

A mobile fitness app where users flip through a virtual deck of cards to perform exercises (pushups and squats) based on card values. The app tracks workout times and personal records. Built as an Expo React Native application with a local-first, single-user approach - all data is stored on-device using AsyncStorage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation with bottom tabs (Stats, Workout, Settings) and native stack navigator
- **State Management**: TanStack React Query for server state, React useState for local state
- **Animations**: React Native Reanimated for smooth card flip animations and UI interactions
- **Styling**: Custom theme system with light/dark mode support defined in `client/constants/theme.ts`

### Data Storage
- **Local Storage**: AsyncStorage for all user data (workouts, settings, profile)
- **No Authentication**: Single-user app with data persisted locally on device
- **Data Models**: Workout records, rule sets, user profile, and app settings defined in `client/lib/storage.ts`

### Backend Architecture
- **Server**: Express.js server exists but primarily serves as API proxy during development
- **Database Schema**: Drizzle ORM with PostgreSQL schema defined in `shared/schema.ts`, though the app currently uses local storage
- **Routes**: Minimal - the app is designed to work offline-first

### Key Design Patterns
- **Path Aliases**: `@/` maps to `./client`, `@shared/` maps to `./shared`
- **Component Structure**: Reusable themed components (ThemedText, ThemedView, Card, Button) with consistent styling
- **Error Handling**: Custom ErrorBoundary component wrapping the app
- **Platform Compatibility**: Platform-specific adaptations for iOS, Android, and web

### Workout Logic
- 52-card deck with suits mapped to exercises (hearts/diamonds vs clubs/spades)
- Card values determine rep counts (customizable via rule sets)
- Timer tracks workout duration with pause/resume functionality
- Personal records tracked per rule set

## External Dependencies

### Core Framework
- Expo SDK 54 with React Native new architecture enabled
- React 19.1 with experimental React Compiler

### UI & Animation
- `react-native-reanimated` for animations
- `react-native-gesture-handler` for touch interactions
- `expo-haptics` for tactile feedback
- `expo-blur` and `expo-glass-effect` for visual effects
- `@expo/vector-icons` (Feather icons)

### Navigation
- `@react-navigation/native` with bottom-tabs and native-stack navigators
- `react-native-screens` and `react-native-safe-area-context`

### Data Layer
- `@react-native-async-storage/async-storage` for local persistence
- `drizzle-orm` with `drizzle-zod` for schema validation (prepared for future server sync)
- `pg` PostgreSQL client (for potential future backend features)
- `zod` for runtime type validation

### Server
- Express.js with `http-proxy-middleware` for development proxy
- WebSocket support via `ws` package