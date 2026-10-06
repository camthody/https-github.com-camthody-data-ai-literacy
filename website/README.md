# BAYK website

A multi-page, immersive website for BAYK, replacing the Base44 site at bayk-by-cam.base44.app. Every page sits on a lit, real-time 3D stage built with three.js, with studio reflections, soft glow (bloom) and rising sparks.

| Page | File | 3D centrepiece |
|---|---|---|
| Home | `index.html` | A copper cloche on a plate. Drag to turn it; scroll (or click the cloche) to lift the lid on a glowing ember dish. |
| Weekly meal prep | `weekly.html` | A stack of BAYK meal-prep containers that grows and shrinks as you pick 5, 10 or 15 meals in the plan builder. |
| Private dining | `private-dining.html` | Cloche, plate and a glass of red. |
| BAYK Kitchen | `kitchen.html` | A cast-iron pan searing over a gas flame. |
| Journal | `journal.html` | Smoke and sparks, with topic tabs. |
| About | `about.html` | A slowly turning ember. |
| Contact | `contact.html` | A slowly turning ember. |

## Also included

- An animated curtain transition between pages.
- A short loading screen on the first visit to Home.
- Smooth scrolling (Lenis).
- Every page opens at the top, including after a reload or the back button.
- The normal system cursor, with a grab hand over the 3D pieces you can turn.
- Headings whose letters rise into place.
- A manifesto that lights up word by word as you scroll.
- A live countdown to the order cut-off, shown in the top bar and as big digits on Home.
- The weekly plan builder with its order summary. "Send my request" opens Contact with the request filled in.

## Voice

The copy is written in Cam's voice:
- First person.
- Warm and plain.
- British English.
- No kitchen jargon, gimmicky lines, numbering or em dashes.

Lines from the original BAYK site are kept wherever they exist.

Plain HTML, CSS and JavaScript with no build step. The libraries load from the jsDelivr CDN.

- `assets/site.css`: the BAYK "Embers" identity and layout.
- `assets/site.js`: page behaviour (navigation, transitions, cursor, forms, plan builder) and the `CONFIG` block for prices, cut-off and form inboxes.
- `assets/stage.js`: the 3D scenes.
- `assets/img/`: food photos.
- `BUSINESS_MODEL.md`: the simplified, scalable business model behind the site.

Each page shares the same header, menu and footer. If you change one of them, change it on all seven pages.

## Accessibility and fallbacks

- **Reduced motion:** visitors who ask their device for reduced motion get a calm version, with no loader, no curtain, no smooth scrolling and no animated reveals.
- **No WebGL:** browsers without WebGL get a static ember glow instead of the 3D stage. Everything else still works.

## Preview locally

```bash
npx serve website
```

## Publish

- **Netlify:** drag the `website` folder onto app.netlify.com/drop, then add your domain.
- **Vercel:** import the repo and set the root directory to `website`.

## Fill these in before going live

Everything below is a placeholder or an assumption, not a fact about BAYK.

1. **Prices:** set them in `CONFIG.prices` in `assets/site.js`. While they're `null`, the site shows `[£]`.
2. **Order cut-off:** `CONFIG.cutoff` is set to Friday at 18:00 UK time as a placeholder. Change it to your real cut-off. Delivery is Monday, as on the old site.
3. **Forms:**
   - There are four: contact, private dining enquiry, Kitchen waitlist and newsletter.
   - Create a free Formspree form (or similar) and paste its URL into `CONFIG.formEndpoint`.
   - Paste your newsletter provider's form URL into `CONFIG.newsletterEndpoint`.
   - Until then, forms send nothing. Instead they show visitors a copy of their request and ask them to email cameron@thody.me.
4. **Delivery area:** replace `[delivery area]` on the Contact page.
5. **Testimonial:** replace the `[Client testimonial ...]` block on the About page.
6. **Photos:**
   - The four food photos were cropped from screenshots of the old site, so they're only about 400px wide.
   - Swap in the originals at 1600px or larger, keeping the same filenames.
7. **Dish names:** the captions are my reading of the photos. Correct them in `private-dining.html`.
8. **Journal links:**
   - These still point to the Journal on the old Base44 site.
   - Move the posts across or update the links in `journal.html`.
9. **Offer details to confirm:**
    - 5, 10 or 15 meals a week
    - Standard, vegetarian and pescatarian options
    - Regular and lighter portions
    - Limited private dining dates
    - The BAYK Kitchen membership and waitlist

    These come from the proposed model in `BUSINESS_MODEL.md`.
10. **What's in season:** the UK seasonal produce list in `assets/site.js` is general guidance by month, not BAYK's menu.

## Brand reference ("Embers")

| Role | Colour | Hex |
|---|---|---|
| Background | Espresso | `#120d0b` |
| Panels | Soot | `#261b17` |
| Text | Cream | `#efe4d6` |
| Secondary text | Ash | `#ac9d8f` |
| Accent | Copper | `#c07650` |
| Accent text and links | Light copper | `#d99a6c` |
| Highlight | Glow | `#f2d3b3` |
| Live indicators only | Ember | `#ff6a2b` |

The copper sheen gradient runs copper to light copper to glow. It's used for primary buttons and emphasised words.

**Fonts (all on Google Fonts):**

- Anybody, a variable font whose width can stretch, for headings and the wordmark
- Geist for body text
- Geist Mono for small numbers

**Icons:** a small line-icon set built into each page (arrows, delivery, clock, leaf, flame, bowl, book, list, calendar, guests, contact).

**Logo:** "BAYK" in Anybody at full width and black weight, followed by a copper dot.
