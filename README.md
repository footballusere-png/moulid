# ALHAMDULILLAH — Manqoos Moulid Online Reader

A lightweight, English-and-Arabic online reader for the existing Manqoos Moulid PDF. The interface uses HTML5, CSS3, vanilla JavaScript, and a version-pinned PDF.js CDN build. It has no application backend, authentication, analytics, or tracking scripts.

## Repository files

```text
.
├── index.html              # Semantic page, SEO, social metadata, and structured data
├── styles.css              # Responsive emerald / gold themes and reader layout
├── app.js                  # Theme, fullscreen, accessible PDF text, and lazy canvas recycling
├── manqoos_moulid.pdf      # Existing PDF bytes, kept unchanged under the required filename
├── favicon.svg             # Small geometric brand mark
├── og-image.png            # 1200 × 630 social preview image
├── og-image.svg            # Editable source for the social preview
├── robots.txt              # Crawler access and sitemap location
├── sitemap.xml             # Single-page sitemap
├── .assetsignore           # Excludes Git metadata, config, docs, and preview-only files
├── wrangler.jsonc          # Root static-assets deployment configuration
├── TODO.md                 # Product outcomes from the approved brief
└── README.md               # Deployment, maintenance, and testing notes
```

The original repository stored the PDF as `munqoos_moulid.pdf`. It is now named `manqoos_moulid.pdf` to match the requested public path; the PDF contents are not edited or regenerated. The preserved file's SHA-256 is `0671b3c35de2b952374a7e43ecbd9cd8d72b1fbe43f8cc5e0ad734d483dc0646`. Its public path is `https://YOUR_DEPLOYED_DOMAIN/manqoos_moulid.pdf` after deployment.

## Local preview

From the repository root, start any static file server. For example, with Python:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Do not open `index.html` as a `file://` URL: PDF.js fetches the PDF as a same-origin web asset. The reader needs an internet connection to load the pinned PDF.js library and worker from jsDelivr.

## Deploy directly to Cloudflare Workers Static Assets

The repository root is the static asset directory. There is no framework build step. `.assetsignore` keeps Git metadata, Wrangler config, project documentation, and WebDev-only route metadata out of the public asset bundle.

1. Install Node.js/npm if they are not already available, and from the repository root run `npx wrangler login` to authenticate with Cloudflare.
2. Deploy the root website files with `npx wrangler deploy --assets .`; Wrangler applies `.assetsignore` while collecting assets.
3. The equivalent configuration-based command is `npx wrangler deploy`; `wrangler.jsonc` already points `assets.directory` at `.` and sets the Worker name to `alhamdulillah-moulid-reader`.
4. After deployment, use the `workers.dev` address shown by Cloudflare, or configure a domain you already own. No domain is invented in this repository.

Cloudflare's current documentation states that requests served as static assets are free and unlimited and that storing static assets has no additional charge. This project uses static assets only; adding paid products, custom domains, or Worker code is not part of this setup. Account and platform limits still apply.

## Connect the existing GitHub repository to Cloudflare

1. In the Cloudflare dashboard, open **Workers & Pages** and choose **Create application**.
2. Choose the GitHub option, authorize Cloudflare when prompted, and select `footballusere-png/moulid` with production branch `main`.
3. Keep the project root at the repository root. Leave the build command empty because the project has no build step. Set the deploy command to `npx wrangler deploy` (or `npx wrangler deploy --assets .`).
4. Use the Worker name `alhamdulillah-moulid-reader` so it matches `wrangler.jsonc`, then save and deploy. If the Worker already exists, open it and choose **Settings → Builds → Connect** instead.
5. Check the build result in Cloudflare before sharing the assigned public address.

Cloudflare automatically builds and deploys future commits pushed to the connected production branch. Its dashboard labels can change; if they do, consult the official [Workers Builds guide](https://developers.cloudflare.com/workers/ci-cd/builds/) and [build configuration guide](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## Replace SEO URL placeholders

Before launch, replace every `YOUR_DEPLOYED_DOMAIN` placeholder with the real HTTPS origin assigned by Cloudflare or a domain you own. Update the canonical and Open Graph URLs in `index.html`, the URL in `sitemap.xml`, and the sitemap address in `robots.txt`. Also update the social image URLs in `index.html`. Do not leave the placeholder on the deployed site and do not use an internal preview address.

## Commit and update the GitHub source

Clone the existing repository (or open its working copy), add the reviewed site files, and push a normal commit to `main`:

```sh
git status --short
git add index.html styles.css app.js manqoos_moulid.pdf favicon.svg og-image.svg og-image.png robots.txt sitemap.xml wrangler.jsonc .assetsignore README.md TODO.md
git commit -m "Build ALHAMDULILLAH Moulid reader"
git push origin main
```

When Cloudflare Workers Builds is connected to `main`, the push triggers the next deployment. For later changes, edit the source, verify the relevant checklist items below, commit, and push. Keep `manqoos_moulid.pdf` at the repository root unless you also update the path in `app.js`.

## Testing checklist

- [ ] Open the page at narrow phone width (320–390 px), tablet width, and desktop width; confirm there is no horizontal overflow and the reader fits the screen.
- [ ] Confirm all 13 PDF pages load in the original order with legible Arabic text, smooth vertical scrolling, and no browser PDF toolbar.
- [ ] Scroll through the full PDF and confirm pages render as they approach the viewport rather than all rendering at once.
- [ ] Switch between dark and light themes, reload, and confirm the selected theme persists.
- [ ] Enter and exit fullscreen; in a browser without fullscreen support, confirm a clear accessible message is shown.
- [ ] Use keyboard Tab/Enter/Space navigation and check the visible focus ring and control names with a screen reader.
- [ ] Navigate the PDF reader with a screen reader and confirm the extracted page text is available in page order.
- [ ] Enable reduced motion in the operating system and confirm decorative animations are minimized.
- [ ] Temporarily test a missing/blocked PDF or PDF.js CDN and confirm the page shows an accessible error instead of a blank reader.
- [ ] Check that `robots.txt` and `sitemap.xml` use the real deployed origin after launch, and inspect page title, description, canonical, Open Graph, Twitter, and JSON-LD metadata.
- [ ] Confirm the published UI offers no download, print, upload, or manual zoom button. The PDF is a public static asset and cannot be guaranteed impossible to save through a browser or developer tools.
- [ ] Confirm the Cloudflare deployment serves `/`, `/manqoos_moulid.pdf`, `/favicon.svg`, `/robots.txt`, and `/sitemap.xml` successfully.

## Useful references

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Static Assets billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Cloudflare Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [PDF.js](https://github.com/mozilla/pdf.js)
