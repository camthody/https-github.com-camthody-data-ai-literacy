# BAYK website

A rebuilt website for BAYK, replacing the Base44 site at bayk-by-cam.base44.app. Plain HTML, CSS and JavaScript with no build step, so it can be hosted anywhere.

- `index.html`: home page covering Weekly, At Work, Private dining, Kitchen, how it works, the plan builder, gallery, About, Journal, newsletter and contact.
- `work.html`: BAYK at Work, the corporate page to send to companies.
- `assets/site.css`: the BAYK identity and layout.
- `assets/site.js`: interactions and the `CONFIG` block for prices, cut-off and forms.
- `assets/img/`: food photos.
- `BUSINESS_MODEL.md`: the simplified, scalable business model behind the site.

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
3. **Forms:** create a free Formspree form (or similar) and paste its URL into `CONFIG.formEndpoint`. Until then, the contact and enquiry forms send nothing. Instead they show visitors a copy of their request and ask them to email cameron@thody.me.
4. **Newsletter:** paste your newsletter provider's form URL into `CONFIG.newsletterEndpoint`.
5. **Delivery area:** replace `[delivery area]` in the contact section of `index.html`.
6. **Testimonial and client logos:** replace the `[Client testimonial ...]` block in the About section.
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
    - The four corporate formats

    These come from the proposed model in `BUSINESS_MODEL.md`. Change any of them in the HTML.
11. **Access page:** the old site had an Access page whose purpose I couldn't see, so it hasn't been carried over.
12. **What's in season:**
    - The UK seasonal produce list in `assets/site.js` is general guidance by month, not BAYK's menu.

## Brand reference

| Role | Colour | Hex |
|---|---|---|
| Primary | Claret | `#5a1824` |
| Deep | Deep claret | `#3a0f17` |
| Accent | Saffron | `#e2a63b` |
| Text | Ink | `#1b1716` |
| Page | Paper | `#fbfaf7` |
| Lines | Steel | `#cfd3d0` |

**Fonts (all on Google Fonts):**

- Bodoni Moda for headings and the wordmark
- Schibsted Grotesk for body text
- IBM Plex Mono for labels and the order ticket

**Logo:** the BAYK wordmark in Bodoni Moda with wide letter spacing, next to a line-drawn bay leaf.
