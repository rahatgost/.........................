# Aegis UI/UX Polish — Mobile First

## Original request
Review the full project, address major issues and improvements. Scope was refined to mobile-first UI/UX work: align every page to the main brand, improve vault/page headers, and add professional motion and polish.

## Architecture decisions
- Kept the existing React, TanStack Start, Tailwind and Framer Motion structure intact.
- Centralized visual refinements in shared Aegis chrome, settings, bottom tab, and entry-screen components so changes carry across screens.
- Standardized around the existing Aegis cream, charcoal and warm-gold palette, including entry/authentication flows.
- Restored SSR for `/auth` to prevent client/server hydration mismatch and unstable first paint.

## Implemented
- Mobile safe-area and overflow safeguards, consistent content spacing, translucent bottom navigation, and refined tap affordances.
- Added branded, readable sticky app bars and large-title headers with entry animation.
- Unified authentication, callback and lock visuals; removed legacy blue accents.
- Added critical auth screen test IDs and fixed the previously reported intermittent hydration/blank-paint issue.
- Verified with TypeScript, linting, production build, and three consecutive mobile auth renders without console hydration errors.
- Reworked the shared vault/page header into a direct, large modern mobile title; removed the repeated “Aegis Vault” eyebrow and decorative line from all pages using it.
- Unified the entire app’s type system to Geist: removed legacy Playfair Display/JetBrains Mono references, CSS variables, and font loading.
- Verified the production mobile auth screen at 375px after the type-system update.

## Prioritized backlog
- **P0:** Provide a test account or test session to validate authenticated vault, family, emergency, import and onboarding screens end-to-end on mobile.
- **P1:** Replace deprecated TanStack server function `inputValidator()` calls with `validator()`.
- **P1:** Reduce the largest client bundles (notably editor/security dependencies) through route-level lazy loading.
- **P2:** Run a full authenticated accessibility audit for keyboard focus, contrast and screen-reader labels.

## Next tasks
Validate the shared headers and bottom navigation in authenticated mobile flows once a non-production test login is available.