---
name: user-coding-style
description: User prefers SLAP-based component hierarchy (Layout > Screen > Screen-section > Widget), colocated screen-sections, and a centralized AetherClient API class
metadata:
  type: user
---

User is detail-oriented about frontend architecture. Key preferences:
- Strict component hierarchy following SLAP (Single Level of Abstraction Principle)
- Layouts for shared UI structure, thin page.tsx files that compose screen-sections
- Screen-specific components colocated next to their page.tsx; reusable ones in src/components/
- All API calls centralized in AetherClient class — no raw fetch in pages or components
- Aggressive componentization with clear naming
