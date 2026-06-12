# Assignment 4: Developing an AI-Assisted Application

**Name:** Wang Meng
**Course:** Remote Development
**Environment:** Windows 11 + Claude Code (Claude Fable 5) + modern browser

---

## ▶ Play it now

<a href="defend-thesis/index.html"><strong>Launch "Defend Your Thesis" in your browser →</strong></a>

Direct link: <https://freedom-frank.github.io/my-remote-project/defend-thesis/>

The game is a self-contained HTML5 + Canvas application (no build step, no
external dependencies) and is served as a static sub-site of this blog. It
runs on any modern browser on Windows, macOS, or Linux. The interface
defaults to English and can switch to Chinese with one click (top-right).

---

## Background & Design

For Assignment 4 I chose **Option A — "Defend Your Thesis"**, and turned the
chaotic in-class prompt experiments into a stable, fully playable game. The
theme is deliberately self-deprecating about grad-student life: the things we
"defend" against every day — bugs, deadlines, and peer reviewers — become the
enemies.

**Core loop.** The player is a grad student who must protect a *thesis* at the
center of the screen from waves of incoming threats. If the thesis's durability
hits zero, the defense fails. The longer you survive and the more you kill, the
higher your score, which at the end is graded into an academic degree (from
"Certificate of Attendance" all the way to "Tenured Professor").

**Key features required by the brief:**

- **Character selection page** — three classes with differentiated stats:
  🧑‍🎓 Grind PhD (balanced), 🧙 Code Wizard (high fire rate), 🧑‍🔬 Caffeinated
  Postdoc (fast, heavy hits, slow reload).
- **Game-over / score logic** — score, best-score persistence (localStorage),
  five-tier degree verdict, and a run summary.
- **Keyboard/mouse controls** — WASD/arrows to move, mouse to aim, hold
  LMB/Space to shoot, P to pause, M to mute.

**Enemy ecosystem** (each with its own AI, not reskins): 🐛 Bug (fast, fragile,
weaves), ⏰ Deadline (accelerates the closer it gets to the thesis), 🤓 Reviewer
(circles at range and lobs revision comments you can shoot down), 📋 Revision
Pile (splits into two bugs when killed), and 🧐 **Reviewer #2**, a boss every
five waves that spawns "minor revisions."

To add depth I also built a **roguelite upgrade system** (pick 1 of 3 permanent
upgrades after every wave) and a **combo multiplier** (consecutive kills without
the thesis taking damage build a score multiplier up to ×4).

---

## Tech Stack

| Item | Choice | Why |
|---|---|---|
| AI dev partner | Claude (via Claude Code) | Pair-programmed the whole project |
| In-game NPC model | `claude-haiku-4-5` | The AI advisor needs low-latency, low-cost replies — Haiku is the fastest/cheapest current model |
| Language / framework | Plain HTML5 Canvas + CSS + JavaScript (zero deps, zero build) | Double-click-to-play, runs on any OS/browser (cross-platform bonus); avoids a build toolchain breaking during the demo |
| Audio | WebAudio API, procedurally synthesized | No audio asset files needed at all |
| Art | Emoji + Canvas drawing | Cross-platform "sprites" with zero art cost |
| Storage | localStorage | Best score, language, mute, API key |

The codebase is four modules wired together with plain `<script>` tags
(deliberately **not** ES modules — see the hallucination section): `i18n.js`
(bilingual text), `audio.js` (WebAudio synth), `advisor.js` (the AI advisor),
and `game.js` (state machine, entities, waves, collision, rendering).

---

## AI-Assisted Development

**Architecture.** My first prompt was not "write me a game" but "give me the
tech choices and module breakdown, no code yet." The AI proposed a pure-Canvas
single-page app with DOM overlays for the menus/HUD (so I didn't have to
hand-write button hit-testing on the canvas) and a fixed 960×600 logical
resolution scaled by CSS. That decision fixed the whole skeleton with no later
rework. **Lesson: ask the AI for "decisions + rationale" before code — far
fewer do-overs.**

**Problem solving.** Representative fixes the AI drove: differentiated enemy AI
with a few lines of math each (sine-weave for bugs, distance-acceleration for
deadlines, tangential circling for reviewers); a death-resolution timing bug
(the first version `splice`d enemies mid-loop, skipping elements when several
died in one frame — refactored to mark-then-sweep); and the mouse-aim offset
caused by CSS scaling, solved with
`(clientX - rect.left) × (canvasWidth / rect.width)`.

**Handling hallucinations / things that didn't work at first:**

- **ES modules broke `file://`.** The AI first organized the code as
  `<script type="module">`, which Chrome blocks under the `file://` protocol —
  nothing ran on double-click. I challenged it; it confirmed this is a browser
  security limit (not a code bug) and we switched to plain scripts with one
  global object per module. Critical, since the brief wants a runnable app.
- **Browser → Anthropic API was blocked by CORS.** Rather than trusting the
  AI's memory, I had it check the official API docs, which confirmed the request
  needs the `anthropic-dangerous-direct-browser-access: true` header for direct
  browser calls — and that `claude-haiku-4-5` is a real current model alias (so
  we did not invent a date-suffixed ID).
- **Silent AudioContext.** Sound code "looked right" but was mute with no error;
  the cause was the browser autoplay policy (AudioContext must be created/resumed
  after a user gesture). Fixed by initializing on first click.

**Method:** for any environment-dependent claim (browser security, API protocol,
model IDs) I made the AI verify against official docs rather than accept its
recall; for logic bugs I used a "describe the symptom → AI proposes a hypothesis
→ test" loop.

---

## The Embedded AI Agent (Bonus +3)

A persistent **AI Advisor** NPC sits beside the game in two modes:

1. **Built-in rule engine (default, offline).** It listens to ~16 game events
   (boss incoming, thesis at half/quarter HP, first sighting of each enemy,
   pickups, combo streaks, score milestones, game over) and pushes witty,
   battle-aware tips; the chat box answers gameplay questions by keyword match.
   This works with no key, so the demo is risk-free.
2. **Live Claude mode (optional).** Paste an Anthropic API key (⚙️) and the chat
   is driven by `claude-haiku-4-5`, with the **live battle state** (wave, score,
   thesis/player HP, enemies on screen, boss active) injected into the system
   prompt, so the advisor can converse freely about the current situation. The
   key is stored only in the browser's localStorage and the request goes
   straight to the official API — no third-party server. On any API failure it
   gracefully falls back to the built-in answer.

## Cross-Platform (Bonus +2)

Pure HTML5/Canvas/JS with no build and no dependencies runs identically on
Windows, macOS, and Linux browsers; the UI is fully bilingual (EN default, one
click to 中文).

---

## Reflection

The biggest takeaway echoes Assignment 3: the "integration layer" is thin, and
the real time goes into **environment realities** (the `file://` module trap,
the CORS header, the autoplay policy) and into **how clearly I frame the task**.
Asking the AI for decisions-with-rationale up front, and forcing it to verify
environment-specific claims against docs instead of its memory, was what kept
the build moving without dead ends. The result is a stable, genuinely playable
game that I could hand to anyone with a browser — which is exactly the gap
between "prompting for fun" and "engineering for results" that this assignment
was about.

---

*Report prepared for the Remote Development course, Beihang University Hangzhou International Campus.*
