# APERTURE — website concept

A dynamic, cinematic marketing site concept for **Aperture Comms**, the specialist
marketing agency for hospitality, food & drink brands (restaurants, hotels, bars,
food brands). It reimagines the brand around a real camera *aperture / iris* motif:

- **Shutter intro** — a 12-blade mechanical iris (built in SVG) opens on load like a
  lens firing, revealing the site.
- **Aperture-ring navigation** — a floating f-stop dial (f/1.4 → f/16) tracks your
  position through the page and doubles as a jump nav.
- **The reel** — a hospitality gallery where each "shot" zooms *through the aperture*
  into a lightbox.
- **Lens HUD** — viewfinder corners, REC light and an ISO / shutter / f-stop readout
  frame the whole experience.
- Cinematic gradient photography, film grain, focus-pull hovers, a focus-reticle
  cursor, animated exposure counters and a rotating-blade contact section.

Everything is **self-contained vanilla HTML / CSS / JS** — no build step, no
framework, no external image dependencies. Fonts load asynchronously so a slow or
blocked font CDN never delays render, and the intro has a hard fallback so the site
always reveals even if `requestAnimationFrame` misbehaves. Fully responsive and
respects `prefers-reduced-motion`.

## Run it

Any static file server works. For example:

```bash
cd site
python3 -m http.server 4173
# open http://localhost:4173
```

Or just open `site/index.html` directly in a browser.

## Structure

```
site/
├── index.html            # markup for every section
└── assets/
    ├── css/style.css     # design system + all section styling
    └── js/
        ├── aperture.js   # the mechanical iris engine (build / open / close)
        └── main.js       # content, scroll reveals, dial nav, gallery, form
```

## Notes

This is an independent creative concept / recreation and is not affiliated with
Aperture Comms. All copy and imagery are placeholders crafted to fit the brand's
hospitality positioning.
