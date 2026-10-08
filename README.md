# RoboPay website
Static site (HTML, CSS, JS). Deploy: push this folder to a GitHub repo, then Settings > Pages > Deploy from branch > main / root.
Custom domain: add a file named `CNAME` containing your domain, and set the DNS records at Porkbun:
- 4x A records for `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- CNAME `www` -> `<github-user>.github.io`

## Before you publish: set your domain (SEO)
Canonical, social and sitemap URLs contain the placeholder `__DOMAIN__`. Run once:
```
./set-domain.sh yourdomain.tld
```
This replaces the placeholder in `index.html`, `robots.txt` and `sitemap.xml` and writes the `CNAME` file.
Then in Google Search Console add the domain, submit `https://yourdomain.tld/sitemap.xml`, and use "Request indexing" for the home page.
