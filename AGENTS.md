<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Push notifications: Firebase via connector gateway; device tokens in `push_tokens`; a pg_cron job (every 15 min) calls `/api/public/hooks/push-notify`, authenticated by the random secret in `app_secrets` (name `push_cron`). Why: lets the secret stay inside the database instead of being copied into SQL.
- Notification time math uses India time (UTC+5:30) in `src/lib/notify.server.ts`. Why: server runs in UTC but all players are in India.
- Daily current affairs: one shared pack per IST day in `ca_daily`, generated lazily on first open (Perplexity search via gateway + AI), no cron. Why: zero recurring cost, all players see same news.

- App controls use the shared Button component, with the unstyled variant for existing semantic layouts; global tokens and responsive shell styles keep screens consistent without changing stored progress. Why: unify interaction states and visual polish while preserving study workflows.
- Timetable reordering uses shared dnd-kit sensors and dedicated drag handles with touch hold activation, keyboard support, and arrow alternatives. Why: preserve scrolling and editing while saving only the slot order, not task times or progress.
- Consumer-app presentation uses global semantic surface tokens and bundled section-specific character assets; navigation shortcuts reuse existing views. Why: keep the visual refresh independent of saved study data and notification logic.
- Overlay exit motion uses the shared MotionPresence wrapper with reduced-motion-aware delayed unmounting. Why: allow closing feedback without delaying actions or modifying study state.
- Workspace sections, profiles, practice tabs and panels use validated TanStack Router search state through workspace-navigation. Why: browser/device Back restores the prior view instead of leaving a state-only app.
- Quizzes: admin uploads HTML files; AI extracts MCQs once into `quizzes` (chapter key or IST day); attempts and scores in `quiz_attempts`, all via password-checked server functions. Why: one AI call per file, scores shared across players.
