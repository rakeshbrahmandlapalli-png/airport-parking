# AeroPark Direct Design Context

## 1. Brand Identity & USP
- Core differentiator: "Aero," an AI digital concierge that scans 100+ data points for the best parking.
- The "Aero Avatar" and "Aero Magic Search" are NON-NEGOTIABLE brand assets. Do not remove them.

## 2. Design Goal: "Premium AI Utility"
- Move away from a "playful/bubbly" AI look toward a "Premium, High-Trust AI" aesthetic (think Perplexity, OpenAI, or high-end Fintech).
- The design must scream: Secure, Fast, and Intelligent.

## 3. Strict UI Rules
- Ban "Glassmorphism" (heavy blurs and semi-transparent backgrounds).
- Ban rounded corners larger than `rounded-2xl`. 
- Use deep, solid colors (e.g., `bg-[#0B1120]` or `bg-[#0F1523]`) instead of complex gradients.
- High contrast is mandatory. Text must be instantly readable.
- The "Aero Magic Search" must look like a high-precision tool, not a toy.

## 4. Coding Standards
- Next.js (App Router), Tailwind CSS, Lucide React for icons.
- Ensure all interactive elements have `'use client'`.
- Code must be modular and drop-in ready.

## 5. Architectural Bodyguard (Next.js App Router)
- **CRITICAL: This is NOT the Next.js you know.** This version has breaking changes — APIs, conventions, and file structure differ from your training data. 
- Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next-specific code. Heed deprecation notices.
- NEVER use old Pages Router methods like `getServerSideProps` or `next/router`. Use `next/navigation`.
- Default to Server Components. Use `'use client'` strictly for interactivity.