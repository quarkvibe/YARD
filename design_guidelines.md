# YARD - Design Guidelines

## App Overview
YARD is a brutally simple, masculine fitness app inspired by prison/military PT culture. The workout is a deck of cards: flip cards, do pushups/squats based on card value, complete the deck, track total time, and try to beat best time.

## Brand Principles
- **Extremely simple**: "Flip. Move. Finish."
- **Minimal taps, minimal screens, minimal text**
- **No accounts required for base app**
- **Tone**: masculine, institutional, understated, serious, gritty-but-clean
- **Accessibility**: readable large timer, big buttons, high contrast

## Architecture Decisions

### Authentication
**No Authentication Required**
- Single-user, local-first app with data stored on device
- REC TIME (competitive mode) is a feature stub for future implementation

### Navigation Structure
**Single-screen focus with modal navigation**
- **Home** - Primary hub with START WORKOUT button
- **Workout** - Full-screen card flipping interface  
- **Finish** - Workout completion summary
- **History** - Past workout records
- **Settings** - Rules and preferences
- **Rec Time** - Competitive mode (stub)

## Design Language

### Color Palette
**Primary Colors**:
- Background: Matte black (#0b0b0b)
- Surface: Concrete gray (#1A1A1A, #2A2A2A)
- Text: Chalk white (#FAFAFA)
- Accent: Yard orange (#FF6B35) - used sparingly for Start/Finish/New Record

**Semantic Colors**:
- Pushups: Red (#E74C3C)
- Squats: Blue (#3498DB)
- Success/New Record: Green (#4CAF50)
- Text Secondary: Gray (#A0A0A0)

### Typography
- **ALL CAPS** for headers and buttons
- **Condensed/stencil-inspired** look
- **Letter spacing** for institutional feel
- Hero (Card Values): 72pt, Extra Bold, uppercase
- Timer: 56pt, Bold, monospace
- Headers: 24-32pt, Bold, uppercase, letter-spaced
- Body: 16pt, Regular
- Captions: 12pt, Medium, uppercase

### Visual Design
- **No emojis** anywhere in the app
- **No playful animations** - only functional ones (card flip)
- **High contrast** - white on black
- **Subtle concrete/steel texture** optional but keep legibility first
- **Minimal shadows** - use color/elevation instead

### Copy Tone
Short. Cold. Institutional. No hype.

**Use**:
- START WORKOUT
- FLIP
- FINISH
- NEW RECORD
- CLOCK IN
- RUN AGAIN
- LOCKED IN

**Avoid**:
- "You got this!"
- "Crush it!"
- "Let's go!"
- Any motivational fluff

## Screen Specifications

### 1. Home Screen
**Purpose**: Primary hub, one-button focus

**Layout**:
- Center: Large "YARD" branding
- Primary action: START WORKOUT button (large, prominent)
- Secondary links: RULESET, HISTORY, REC TIME, SETTINGS
- Subtext: "FLIP. MOVE. FINISH."

**Components**:
- YARD logo/wordmark
- Large primary button
- Minimal text links below

### 2. Workout Screen
**Purpose**: Full-screen card flipping interface

**Layout**:
- Header: Timer (large, always visible)
- Main Content: Large card display
- Exercise label: "PUSHUPS x 8" format
- Progress: Cards remaining count
- Action: Large FLIP button

**States**:
- Pre-flip: Card face-down
- Active: Card revealed, timer running
- Complete: Final card done, auto-transition to Finish

### 3. Finish Screen
**Purpose**: Workout summary

**Layout**:
- Total time (large, center)
- Personal best comparison
- NEW RECORD indicator if applicable
- Buttons: RUN AGAIN, VIEW HISTORY

### 4. History Screen
**Purpose**: Past workout records

**Layout**:
- List of completed workouts
- Each shows: date, time, ruleset
- Personal bests per ruleset at top

### 5. Settings Screen
**Purpose**: Ruleset selection and preferences

**Layout**:
- Ruleset picker (STANDARD, HARD TIME, PUSHUPS ONLY, SQUATS ONLY)
- Preferences: Sound, Haptics toggles
- About section

### 6. Rec Time Screen (Stub)
**Purpose**: Competitive mode placeholder

**Layout**:
- Locked state: Simple unlock prompt
- Unlocked state: Leaderboard list, weekly challenge

## Rulesets

### STANDARD
- A = 1, 2-10 = face value, J/Q/K = 10
- Spades/Clubs = Pushups, Hearts/Diamonds = Squats

### HARD TIME
- A = 11, 2-10 = face value, J/Q/K = 15
- Spades/Clubs = Pushups, Hearts/Diamonds = Squats

### PUSHUPS ONLY
- All suits = Pushups
- Standard card values

### SQUATS ONLY
- All suits = Squats
- Standard card values

## Accessibility
- High contrast (white on black)
- Minimum touch targets: 48x48pt
- Timer and card values readable at arm's length
- Haptic feedback optional (default off or subtle)
- Sound optional (default off)

## Assets Required
1. **App Icon**: Stencil-style card outline or tally marks on black
2. **Card Suits**: Standard playing card suits using unicode or simple vector
3. **Icons**: Feather icons from @expo/vector-icons
