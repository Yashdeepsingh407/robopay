# RoboPay website

Static multi-page site for [robo-pay.xyz](https://robo-pay.xyz): home, how it works, research, team, FAQ and a blog.

- `src/`: the source. `layout.html` (header, footer, head), `pages/` (one file per page), `sections/` (shared blocks) and `posts/` (one file per blog post).
- `build.py`: `python3 build.py` turns `src/` into the HTML pages in the repo root, plus `sitemap.xml` and `feed.xml`. Python standard library only. Commit the generated files, GitHub Pages serves them as they are.
- Page meta (titles, descriptions) lives in `PAGES` in `build.py`; structured data (Organization, WebSite, SoftwareSourceCode, BreadcrumbList, FAQPage, BlogPosting) is generated there too.
- `style.css`: one flat layer. Colours (taken from the logo: deep navy, violet, sky blue), type and spacing come from `tokens.css`.
- `design/tokens.json`: single source for the design tokens. After editing, run `python3 design/build-tokens.py` to regenerate `tokens.css`.
- `main.js`: hero scene (canvas), scroll-driven story, bars, menu.
- `assets/logos/`: partner logos in their original colours (SVG where the brand supplies one). They sit on white tiles because several are dark.
- `assets/fonts/plus-jakarta-sans.woff2`: Plus Jakarta Sans variable font (SIL OFL 1.1), self-hosted.
- `assets/robopay-logo.webp`: the RoboPay logo, same as the profile picture on X (@R0boPay). Icons and the share image are made from it.

## Add a blog post

Create `src/posts/YYYY-MM-DD-slug.html` with a front-matter block (`slug`, `title`, `description`, `date`, `image`, `image_alt`, optional `figure`, `figure_alt`, `figure_caption`) followed by the article HTML, then run `python3 build.py`. Put the 1200x630 cover under `assets/blog/`.

## Deploy

GitHub Pages: Settings > Pages > Deploy from branch > main / root. The `CNAME` file holds the custom domain.
DNS at Porkbun: four A records for `@` (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and a CNAME `www` pointing to `<github-user>.github.io`.

## Change the domain

The site currently lives at `robo-pay.xyz` (see `CNAME`). `./set-domain.sh yourdomain.tld` swaps that domain in `build.py`, the generated pages, sitemap and robots, and rewrites `CNAME`. Then add the domain in Google Search Console, submit `https://yourdomain.tld/sitemap.xml` and request indexing for the home page.
