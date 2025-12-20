# Fitness Card Deck - Design Guidelines

## App Overview
A prison-style fitness app where users flip through a virtual deck of cards to perform pushups and squats based on card values. Track workout times and beat personal records.

## Architecture Decisions

### Authentication
**No Authentication Required**
- Single-user, local-first app with data stored on device
- Include a **Profile screen** with:
  - User avatar (generate 1 motivational fitness-themed avatar preset)
  - Display name field
  - Personal records display
  - App preferences (theme, sound effects, haptics)

### Navigation Structure
**Tab Navigation** (3 tabs)
- **Workout** (center tab) - Core action, card flipping interface
- **Stats** (left tab) - Workout history and personal records
- **Settings** (right tab) - Rules configuration and profile

## Screen Specifications

### 1. Workout Screen (Center Tab)
**Purpose**: Primary card-flipping workout interface

**Layout**:
- Header: Transparent, no navigation elements
- Main Content: Non-scrollable, fixed layout
  - Large card display area (center)
  - Current exercise label (above card)
  - Rep counter (below card)
  - Timer display (top right corner, always visible)
  - Progress indicator showing cards remaining
- Floating Elements:
  - "Flip" button (bottom center, elevated with shadow)
  - "Reset Deck" button (top left, subtle text button)
  - "Pause/Resume" button (integrated with timer)
- Safe Area Insets: top: insets.top + Spacing.xl, bottom: tabBarHeight + Spacing.xl

**Components**:
- Animated card component with flip animation
- Large circular timer (MM:SS format)
- Exercise type badge (Pushups/Squats)
- Card value display (large, prominent typography)
- Progress bar or fraction (e.g., "23/52 cards")
- Primary action button (Flip Card)

**States**:
- Pre-workout: Deck face-down, "Start Workout" button
- Active: Card flipping, timer running, rep counter incrementing
- Paused: Timer stopped, overlay with resume/end options
- Complete: Celebration state, time display, "Save & View Stats" button

### 2. Stats Screen (Left Tab)
**Purpose**: View workout history and personal records

**Layout**:
- Header: Default navigation, title "Stats"
- Main Content: Scrollable list
  - Personal Records card at top (fastest times for each rule set)
  - Workout history list below (chronological, newest first)
- Safe Area Insets: top: Spacing.xl, bottom: tabBarHeight + Spacing.xl

**Components**:
- PR summary cards (highlight best times)
- List items showing: date, rule set used, time completed, total reps
- Empty state with motivational message for first-time users
- Filter options (All time, This week, This month)

### 3. Settings Screen (Right Tab)
**Purpose**: Configure workout rules and app preferences

**Layout**:
- Header: Default navigation, title "Settings"
- Main Content: Scrollable form sections
  - Profile section (avatar, name)
  - Rule Sets section (select/customize card values)
  - Preferences section (theme, sounds, haptics)
  - About section (app version, instructions)
- Safe Area Insets: top: Spacing.xl, bottom: tabBarHeight + Spacing.xl

**Components**:
- Profile avatar (tappable to change)
- Text input for name
- Rule set cards (preset options: Standard, Endurance, Sprint)
- Custom rule builder with card suit assignments
- Toggle switches for preferences
- Instructional modal explaining rules

### 4. Rule Set Modal (Native Modal)
**Purpose**: Explain and customize workout rules

**Layout**:
- Header: Modal with close button (top left), title "Workout Rules"
- Main Content: Scrollable
  - Rule set explanation
  - Card value mappings (e.g., Ace = 1, Face cards = 10)
  - Suit assignments (which suits = pushups vs squats)
- Action buttons at bottom (Save, Cancel)

**Components**:
- Visual card examples
- Editable value fields
- Exercise type toggles per suit

## Design System

### Color Palette
**Primary Colors**:
- Accent: Bold, energetic orange (#FF6B35) - for CTAs and active states
- Background: Deep navy (#1A1D29) - main background
- Surface: Charcoal (#2A2D3A) - cards, elevated surfaces
- Success: Vibrant green (#4CAF50) - completed workouts, PRs

**Semantic Colors**:
- Pushups: Red accent (#E74C3C)
- Squats: Blue accent (#3498DB)
- Text Primary: White (#FFFFFF)
- Text Secondary: Light gray (#B0B3B8)

### Typography
**Font Family**: System (SF Pro for iOS, Roboto for Android)
- Hero (Card Values): 72pt, Bold
- Timer: 48pt, Medium, Monospace
- Headers: 28pt, Bold
- Body: 16pt, Regular
- Captions: 14pt, Regular

### Spacing
- xl: 32px (screen margins)
- lg: 24px (section spacing)
- md: 16px (component spacing)
- sm: 8px (tight spacing)

### Visual Design
- Card component: Rounded corners (16px), subtle gradient, playing card aesthetic
- Floating buttons: Elevation shadow (shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2)
- Interactive feedback: Scale animation on press (0.95), haptic feedback on card flip
- Timer: Circular progress indicator around digits
- Progress bar: Segmented (52 segments for full deck)

### Assets Required
1. **User Avatar**: 1 fitness-themed preset (simple illustration of a person exercising or abstract fitness icon)
2. **Card Suits**: Standard playing card suits (♠️ ♥️ ♦️ ♣️) using unicode or simple vector icons
3. **Exercise Icons**: Feather icons from @expo/vector-icons:
   - "activity" for workout
   - "bar-chart-2" for stats
   - "settings" for settings
   - "play" for start/resume
   - "pause" for pause
   - "rotate-cw" for reset

### Accessibility
- High contrast between text and backgrounds
- Minimum touch targets: 44x44pt
- Timer and card values must be readable at arm's length during exercise
- Haptic feedback on all interactions
- VoiceOver labels for all interactive elements
- Sound cues for card flips (optional, toggleable)

### Interaction Design
- **Card Flip**: Swipe up or tap "Flip" button triggers 3D flip animation
- **Timer**: Auto-starts on first card flip, pauses when app backgrounds
- **Workout End**: Automatic when deck completes, shows celebration animation
- **PR Notification**: Toast/banner when personal record is beaten
- All buttons have pressed state (slight scale + opacity change)