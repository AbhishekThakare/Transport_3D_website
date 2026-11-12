# Krishna Roadlines — Website

Next.js (App Router) port of the Claude Design "Transport company website design".

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production
```

## Structure

| Path | What |
| --- | --- |
| `src/app/page.tsx` | Home — scroll-driven 3D truck story (1500vh sticky stage) |
| `src/app/about/page.tsx` | About — parallax photo + scroll timeline truck |
| `src/app/contact/page.tsx` | Contact — animated truck + quote form |
| `src/components/` | `Nav`, `Footer`, and each page's client-side experience |
| `src/scene/` | Three.js scene (`krlScene.js` controller + truck/yard/road/port/gate/site builders) |
| `src/app/globals.css` | All styles, incl. responsive breakpoints |
| `public/assets/` | Logos (also used as the truck door decal) |

## To fill in

- Contact page: street address, phone and email placeholders (`src/components/ContactExperience.tsx`).
- Quote form currently only shows the "Request received" state — wire `submit()` to an API route or email service.
- About page yard photo and Contact page map are placeholders (as in the design).
