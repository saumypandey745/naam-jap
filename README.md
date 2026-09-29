# नाम जप — Naam Jap Voice Mantra Counter

> A production-quality, installable PWA for voice-based mantra/naam jap counting.

**Accuracy → False-positive prevention → Privacy → Reliability → UX**

---

## What it does

Select a mantra (e.g. **श्री राम**), start jap, and chant naturally. The application uses the browser's speech recognition pipeline with a multi-stage filtering engine to detect **only valid repetitions** of your chosen mantra — ignoring background speech, noise, and unrelated words.

```
User says:  राम  राम  राम
App counts:     1    2    3
Background TV:  (rejected)
```

---

## Voice Engine Pipeline

```
Browser onresult event
        ↓
ResultAccumulator        ← deduplicates the cumulative Web Speech API result array
        ↓                 ← NEVER counts interim results
FinalizedTranscript
        ↓
MantraMatchEngine        ← 4-stage: Exact → Alias → Token → Fuzzy (Levenshtein)
        ↓                 ← rejects unrelated speech below similarity threshold
RepetitionParser         ← counts how many times the mantra appears in transcript
        ↓
DuplicateGuard           ← sliding window dedup (resultIndex + text fingerprint)
        ↓
JapDetectedEvent         → Zustand store → UI counter
```

### Key guarantees
- `onresult` interim events → **never counted**
- Same `resultIndex` re-emitted → **deduplicated**
- Unrelated word → **rejected** (Levenshtein similarity below threshold)
- Background speech → **rejected** (no mantra tokens found)
- Double-count within dedup window → **blocked**

---

## Features

| Feature | Status |
|---|---|
| Voice jap counting | ✅ |
| 13 preset mantras | ✅ |
| Custom mantra creation | ✅ |
| Manual fallback mode (+1 button) | ✅ |
| Mala ring (108 bead progress) | ✅ |
| Mala completion notification | ✅ |
| Session history | ✅ |
| Today / Weekly / Lifetime stats | ✅ |
| Day streak tracking | ✅ |
| Haptic feedback | ✅ |
| PWA (installable, offline) | ✅ |
| LocalStorage persistence | ✅ |
| Dark / Light theme | ✅ |
| Hindi + Romanized recognition | ✅ |
| Dev debug panel | ✅ |
| 77 unit tests (all passing) | ✅ |

---

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + custom CSS variables
- **State**: Zustand with `subscribeWithSelector`
- **PWA**: `vite-plugin-pwa` (Workbox, `generateSW`)
- **Voice**: Web Speech API (Chrome/Edge/Safari) — no third-party service
- **Fonts**: Noto Serif Devanagari + Inter
- **Testing**: Vitest + jsdom

---

## Running locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Testing

```bash
npm run test         # Run 77 unit tests
npm run test:ui      # Vitest UI
```

## Building for production

```bash
npm run build        # tsc + vite build → dist/
```

---

## Privacy

- **Microphone** is only accessed during an active jap session
- **No audio is stored** — audio is processed transiently for speech-to-text
- **No external servers** — this app does not upload any data anywhere
- **All jap history** is stored only in your browser's localStorage
- Browser speech recognition may send audio to the browser vendor's servers (e.g., Google) as part of their standard speech API — this app has no control over that

---

## Architecture

```
src/
├── features/
│   ├── voice/
│   │   ├── VoiceEngine.ts          # Main orchestrator (state machine)
│   │   ├── MantraMatchEngine.ts    # 4-stage matching pipeline
│   │   ├── RepetitionParser.ts     # Repetition counting
│   │   ├── DuplicateGuard.ts       # Event deduplication
│   │   ├── ResultAccumulator.ts    # Browser result stream management
│   │   └── useVoiceEngine.ts       # React hook bridge
│   ├── mantra/
│   │   ├── mantraData.ts           # 13 preset mantras
│   │   └── MantraCard.tsx          # Selection card component
│   └── jap/
│       ├── MalaRing.tsx            # SVG 108-bead progress ring
│       └── VoiceStatusBar.tsx      # Voice state indicator
├── pages/
│   ├── HomePage.tsx
│   ├── JapPage.tsx                 # Core session screen
│   ├── MantraSelectPage.tsx
│   ├── HistoryPage.tsx
│   ├── StatsPage.tsx
│   ├── SettingsPage.tsx
│   └── DebugPage.tsx               # Dev-only diagnostics
├── store/
│   ├── sessionStore.ts             # Active session state
│   ├── mantraStore.ts              # Mantra selection + custom
│   └── settingsStore.ts
├── services/persistence/
│   ├── adapter.ts                  # Abstract interface
│   └── localStorageAdapter.ts      # localStorage implementation
├── types/                          # Domain models
├── utils/
│   ├── normalize.ts                # Text normalization
│   └── levenshtein.ts              # Fuzzy matching
└── tests/                          # 77 Vitest unit tests
```
