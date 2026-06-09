# 🧠 Brain Offload

> **Stop keeping it all in your head.**
>
> A dark-themed, glassmorphic personal task manager that uses NLP to automatically categorize your thoughts — so you can dump anything and let the app figure out where it belongs.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **NLP Auto-Categorization** | Type naturally (English or Chinese) and the app routes tasks to the right area using keyword matching + `compromise.js` noun extraction. Compound phrases like "US visa" or "学生签证" are handled with override rules. |
| 🗂️ **7 Life Areas** | Inbox · SAT & College · Projects · Travel · Sports · School · Health — each with its own emoji, color, and glow identity. |
| ⭐ **Today's Focus** | Pin up to 3 tasks as your daily focus. Everything else stays out of sight until you need it. |
| 🧘 **Focus Mode** | Distraction-free full-screen workspace with a live clock, built-in Pomodoro timer (25 min / 5 min), and your pinned tasks front-and-center. |
| 📊 **Dashboard** | Completion donut chart, area distribution bar chart, and a "Due in 7 Days" feed — all clickable to jump straight to the relevant area. |
| ✅ **Rich Task Cards** | Title, priority (High / Medium / Low), due date, status (Todo / In Progress / Done), external URL, notes, and **auto-generated subtask checklists** from `- item` syntax in notes. |
| 🔥 **Needs Attention** | Auto-surface overdue and due-today tasks in the Today view so nothing slips through. |
| 💾 **Local Persistence** | All tasks and focus picks are saved to `localStorage` — no backend, no accounts, no friction. |
| 🌙 **Liquid Glass UI** | Deep-space dark theme with frosted-glass panels, subtle fluid-pulse animations, and low-noise scrollbars — designed for long sessions without visual fatigue. |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## 🧠 How NLP Categorization Works

When you type in the capture box, Brain Offload scans your input against a bilingual keyword corpus:

- **Exact keyword matching** — e.g. "SAT", "攀岩", "DS-160" instantly route to the matching area.
- **Compound phrase overrides** — "US visa" or "学生签证" correctly land in *SAT & College* (not Travel) because of explicit override rules.
- **NLP noun fallback** — if no keyword hits, `compromise.js` extracts nouns and fuzzy-matches them against the corpus.

The predicted area appears as a subtle inline badge as you type. You can always override it manually via the details dropdown.

---

## 🎯 Focus Mode

Press **FOCUS** (or the button in Today view) to enter fullscreen mode. You get:

- A minimal clock + date header
- An SVG Pomodoro ring with start/pause/reset
- Your 3 pinned tasks, clean and large
- A floating Inbox capture box at the bottom — so even in deep focus, you can offload a new thought without breaking flow

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [React 19](https://react.dev/) |
| Build Tool | [Vite](https://vitejs.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| NLP | [compromise](https://github.com/spencermountain/compromise) |
| Styling | Inline styles + custom CSS (liquid-glass, fluid-pulse animations) |

---

## 📁 Project Structure

```
brain-offload/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx          # Everything lives here — single-file architecture
│   ├── App.css          # Component-scoped styles
│   ├── index.css        # Global theme, liquid-glass, scrollbar, animations
│   ├── main.jsx         # Entry point
│   └── assets/
│       ├── hero.png
│       ├── react.svg
│       └── vite.svg
├── index.html
├── package.json
├── vite.config.js
└── eslint.config.js
```

> **Note:** This project intentionally uses a single-file architecture (`App.jsx`) for rapid prototyping and easy portability. All state, hooks, UI primitives, and view components are co-located.

---

## 📝 License

MIT — use it, fork it, make it yours.

---

*Built for people who have too many tabs open in their brain.*
