# BAYK website

An immersive, single-page website for BAYK, replacing the Base44 site at bayk-by-cam.base44.app.

A live 3D ember field (WebGL, built with three.js) sits behind the whole page and reshapes itself as you scroll:

- The BAYK logo in the hero
- A plate for BAYK Weekly
- A serving cloche for Private dining
- A flame for BAYK Kitchen
- "HUNGRY?" on the contact section

The embers scatter away from the cursor or a finger.

## Other features

- A loading counter.
- Smooth scrolling (Lenis).
- A custom cursor.
- Magnetic buttons.
- Headline letters that stretch towards the cursor.
- A manifesto that lights up word by word as you scroll.
- A pinned sideways gallery.
- A scrolling banner that reacts to scroll speed.
- A full-screen menu with dish previews.
- A live countdown to the order cut-off.
- The weekly plan builder with its order ticket.

Plain HTML, CSS and JavaScript with no build step. The two libraries load from public CDNs.

- `index.html`: the whole site.
- `assets/site.css`: the BAYK "Embers" identity and layout.
- `assets/site.js`: the 3D scene, interactions and the `CONFIG` block for prices, cut-off and forms.
- `assets/img/`: food photos.
- `BUSINESS_MODEL.md`: the simplified, scalable business model behind the site.

## Accessibility and fallbacks

- **Reduced motion:** visitors who ask their device for reduced motion get a calm version with no loader, no smooth scrolling and almost still embers.
- **No WebGL:** browsers without WebGL get a static ember glow instead of the 3D scene. Everything else still works.

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
2. **Order cut-off:** `CONFIG.cutoff` is set to Friday at 18:00 UK time as a placeholder, and the countdown in the top bar uses it. Change it to your real cut-off. Delivery is Monday, as on the old site.
3. **Forms:** create a free Formspree form (or similar) and paste its URL into `CONFIG.formEndpoint`. Until then, the contact form sends nothing. Instead it shows visitors a copy of their request and asks them to email cameron@thody.me.
4. **Newsletter:** paste your newsletter provider's form URL into `CONFIG.newsletterEndpoint`.
5. **Delivery area:** replace `[delivery area]` in the contact section.
6. **Testimonial:** replace the `[Client testimonial ...]` block in the Story section.
7. **Photos:**
   - The four food photos were cropped from screenshots of the old site, so they're only about 400px wide.
   - Swap in the originals at 1600px or larger, keeping the same filenames.
8. **Dish names:**
   - The names "Beef Wellington", "Pan-roasted fish, samphire", "Steak, greens and chips" and "Glazed cinnamon buns" are my reading of the photos.
   - Correct them in `index.html`.
9. **Journal links:**
   - These still point to the Journal on the old Base44 site.
   - Move the posts across or update the links.
10. **Offer details to confirm:**
    - 5, 10 or 15 meals a week
    - Standard, vegetarian and pescatarian options
    - Regular and lighter portions
    - Limited private dining dates
    - The BAYK Kitchen membership

    These come from the proposed model in `BUSINESS_MODEL.md`.
11. **Access page:** the old site had an Access page whose purpose I couldn't see, so it hasn't been carried over.
12. **What's in season:**
    - The UK seasonal produce list in `assets/site.js` is general guidance by month, not BAYK's menu.

## Brand reference ("Embers")

| Role | Colour | Hex |
|---|---|---|
| Background | Char | `#0b0908` |
| Panels | Soot | `#221b18` |
| Text | Bone | `#f3ece4` |
| Muted text | Ash | `#a0958b` |
| Heat gradient | Ember | `#ff5a1f` |
| Heat gradient | Flame | `#ffa047` |
| Heat gradient | Glow | `#ffd7a1` |

The heat gradient runs ember to flame to glow.

**Fonts (all on Google Fonts):**

- Anybody, a variable font whose width can stretch, for headings and the wordmark
- Geist for body text
- Geist Mono for labels and the order ticket

**Logo:** "BAYK" in Anybody at full width and black weight, followed by a glowing ember dot.
