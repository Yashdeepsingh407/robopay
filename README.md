# RoboPay website

Static site (HTML, CSS, JS) for [robo-pay.xyz](https://robo-pay.xyz). No build step.

- `index.html`: all content, SEO meta, Open Graph and JSON-LD (Organization, WebSite, SoftwareSourceCode, FAQPage).
- `style.css`: one flat layer. Colours, type and spacing come from `tokens.css`.
- `design/tokens.json`: single source for the design tokens. After editing, run `python3 design/build-tokens.py` to regenerate `tokens.css`.
- `main.js`: hero scene (canvas), scroll-driven story, bars, menu.
- `assets/logos/`: partner logos in their original colours (SVG where the brand supplies one). They sit on white tiles because several are dark.
- `assets/fonts/archivo.woff2`: Archivo variable font (SIL OFL 1.1), self-hosted.

## Deploy

GitHub Pages: Settings > Pages > Deploy from branch > main / root. The `CNAME` file holds the custom domain.
DNS at Porkbun: four A records for `@` (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and a CNAME `www` pointing to `<github-user>.github.io`.

## Change the domain

The site currently lives at `robo-pay.xyz` (see `CNAME`). `./set-domain.sh yourdomain.tld` swaps that domain in the canonical, Open Graph, sitemap and robots URLs and rewrites `CNAME`. Then add the domain in Google Search Console, submit `https://yourdomain.tld/sitemap.xml` and request indexing for the home page.
