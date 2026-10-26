#!/usr/bin/env python3
"""Build the static site. Usage: python3 build.py

Reads src/layout.html, src/pages/*.html, src/sections/*.html and src/posts/*.html and writes
plain HTML into the repo root (index.html, how-it-works/index.html, ..., blog/<slug>/index.html),
plus sitemap.xml and feed.xml. Only the Python standard library is used. Commit the output;
GitHub Pages serves it as is.
"""
import datetime
import email.utils
import hashlib
import html
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
SITE = "https://robo-pay.xyz"
TODAY = datetime.date.today().isoformat()
OG_DEFAULT = "/assets/og.jpg"
OG_DEFAULT_ALT = "RoboPay: payments for robots and AI agents, under the headline Nobody clicked pay."

NAV = [("Home", "/", "home"), ("How it works", "/how-it-works/", "how"), ("Research", "/research/", "research"),
       ("Team", "/team/", "team"), ("Blog", "/blog/", "blog"), ("FAQ", "/faq/", "faq")]

PAGES = [
    dict(src="home", path="/", key="home", cls="page-home",
         title="RoboPay – Payments for Robots and AI Agents",
         description="RoboPay is a payment layer for robots and AI agents: a Solana escrow pays the owner when a delivery car proves arrival. An HTW Berlin research group."),
    dict(src="how-it-works", path="/how-it-works/", key="how", cls="page-how",
         title="How RoboPay Works – Robot Payments on Proof of Delivery",
         description="A buyer locks 0.2 SOL in a Solana escrow, the delivery car scans the QR code on the box, signs the delivery, and the owner gets paid. See each step."),
    dict(src="research", path="/research/", key="research", cls="page-research",
         title="Research – Machine Payments on Solana | RoboPay",
         description="Can a moving machine settle a payment on-chain the moment it arrives? Results, market forecasts and survey data from the HTW Berlin RoboPay paper."),
    dict(src="team", path="/team/", key="team", cls="page-team",
         title="Team – Machine Economy Lab, HTW Berlin | RoboPay",
         description="Meet Kevin Ehrentraut, Xinyan Liu, Yashdeep Singh and Prof. Dr. Alexandra Mikityuk, the research group building RoboPay at HTW Berlin."),
    dict(src="faq", path="/faq/", key="faq", cls="page-faq",
         title="FAQ – Robot and AI Agent Payments | RoboPay",
         description="Answers on how RoboPay pays a delivery robot, how delivery is proven, which technology it uses and whether it is live."),
    dict(src="blog", path="/blog/", key="blog", cls="page-blog",
         title="Blog – News from RoboPay",
         description="News, demos and research notes from the RoboPay team at the Machine Economy Lab, HTW Berlin."),
]

ORG_ID = SITE + "/#org"
X_HANDLE = "R0boPay"
X_TXT = SRC / "data" / "x-posts.txt"
X_JSON = SRC / "data" / "x-posts.json"



def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


def vhash(name):
    return hashlib.md5((ROOT / name).read_bytes()).hexdigest()[:8]


def front_matter(text):
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip()
    return meta, m.group(2).strip()


def pretty_date(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%B %Y')}"


def load_posts():
    posts = []
    for f in sorted((SRC / "posts").glob("*.html"), reverse=True):
        meta, body = front_matter(read(f))
        fig = ""
        if meta.get("figure") and (ROOT / meta["figure"].lstrip("/")).exists():
            fig = (f'<figure class="post-figure"><img src="{meta["figure"]}" width="{meta.get("figure_w", "1200")}" height="{meta.get("figure_h", "630")}" alt="{esc(meta["figure_alt"])}" loading="lazy">'
                   f'<figcaption>{meta["figure_caption"]}</figcaption></figure>')
        body = body.replace("{{figure}}", fig)
        meta["body"] = body
        meta["path"] = f"/blog/{meta['slug']}/"
        posts.append(meta)
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def refresh_x():
    """Fetch the posts listed in src/data/x-posts.txt (via the fxtwitter API) and cache text, date and preview image."""
    ids = [re.search(r"(\d{10,})", l).group(1) for l in X_TXT.read_text().splitlines() if l.strip() and not l.startswith("#")]
    out = []
    (ROOT / "assets" / "x").mkdir(parents=True, exist_ok=True)
    ua = {"User-Agent": "Mozilla/5.0"}
    for i in ids:
        with urllib.request.urlopen(urllib.request.Request(f"https://api.fxtwitter.com/{X_HANDLE}/status/{i}", headers=ua), timeout=30) as r:
            t = json.load(r)["tweet"]
        media = t.get("media") or {}
        src = (media.get("photos") or [{}])[0].get("url") or (media.get("videos") or [{}])[0].get("thumbnail_url")
        thumb = None
        if src:
            thumb = f"/assets/x/{i}.jpg"
            with urllib.request.urlopen(urllib.request.Request(src, headers=ua), timeout=30) as r:
                (ROOT / thumb.lstrip("/")).write_bytes(r.read())
        when = datetime.datetime.strptime(t["created_at"], "%a %b %d %H:%M:%S %z %Y")
        out.append(dict(id=i, url=t["url"], text=t["text"], iso=when.date().isoformat(), ts=when.isoformat(), thumb=thumb,
                        video=bool(media.get("videos"))))
    out.sort(key=lambda p: p["ts"], reverse=True)
    X_JSON.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"refreshed {len(out)} X post(s)")


def x_cards_html():
    if not X_JSON.exists():
        return ""
    cards = []
    for p in json.loads(X_JSON.read_text(encoding="utf-8"))[:3]:
        text = " ".join(p["text"].split())
        if len(text) > 230:
            text = text[:230].rsplit(" ", 1)[0] + "…"
        img = ""
        if p.get("thumb"):
            play = '<span class="x-play" aria-hidden="true"></span>' if p.get("video") else ""
            img = (f'<a class="x-thumb" href="{p["url"]}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">'
                   f'<img src="{p["thumb"]}" width="640" height="360" alt="" loading="lazy">{play}</a>')
        cards.append(f'<article class="x-card">{img}<div class="x-body"><p class="x-meta"><b>RoboPay</b> <span>@{X_HANDLE}</span>'
                     f' <time datetime="{p["iso"]}">{pretty_date(p["iso"])}</time></p><p class="x-text">{esc(text)}</p>'
                     f'<a class="x-link" href="{p["url"]}" target="_blank" rel="noopener">View on X</a></div></article>')
    return '<div class="x-cards">\n' + "\n".join(cards) + "\n</div>"


def esc(s):
    return html.escape(s, quote=True)


# ---------- structured data ----------
def org_ld():
    return {
        "@context": "https://schema.org", "@type": "Organization", "@id": ORG_ID,
        "name": "RoboPay", "url": SITE + "/", "logo": SITE + "/assets/icon-512.png", "image": SITE + OG_DEFAULT,
        "description": "Payment layer for robots and AI agents. A delivery car arrives, a Solana escrow pays the owner. A research group at HTW Berlin heading toward a startup.",
        "foundingLocation": "Berlin, Germany",
        "parentOrganization": {"@type": "Organization", "name": "Machine Economy Lab, HTW Berlin"},
        "sameAs": ["https://x.com/R0boPay", "https://github.com/kevkaseeker-source/robopay"],
        "member": [
            {"@type": "Person", "name": "Kevin Ehrentraut", "jobTitle": "Founder and Technical Lead",
             "sameAs": ["https://www.linkedin.com/in/kevin-ehrentraut-6472473a0/", "https://x.com/KEBNH123"]},
            {"@type": "Person", "name": "Xinyan Liu", "jobTitle": "Hardware and Mechatronics",
             "sameAs": ["https://www.linkedin.com/in/xinyanliu0112/"]},
            {"@type": "Person", "name": "Yashdeep Singh", "jobTitle": "Business and Market Research", "url": "https://yashdeepsingh.com",
             "sameAs": ["https://yashdeepsingh.com", "https://www.linkedin.com/in/yashdeepsingh407/", "https://x.com/yash__btw"]},
            {"@type": "Person", "name": "Prof. Dr. Alexandra Mikityuk", "jobTitle": "Supervisor",
             "sameAs": ["https://x.com/alexandrastaex"]},
        ],
    }


def site_ld():
    return {"@context": "https://schema.org", "@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "RoboPay",
            "description": "Payment layer for robots and AI agents. A delivery car arrives, a Solana escrow pays the owner.",
            "inLanguage": "en", "publisher": {"@id": ORG_ID}}


def code_ld():
    return {"@context": "https://schema.org", "@type": "SoftwareSourceCode", "name": "RoboPay escrow and delivery prototype",
            "codeRepository": "https://github.com/kevkaseeker-source/robopay",
            "description": "Solana escrow program with three calls (create_delivery, confirm_delivery, close_escrow) and the PiCar-X delivery car prototype.",
            "author": {"@id": ORG_ID}}


def faq_ld():
    items = re.findall(r"<details><summary>(.*?)</summary><p>(.*?)</p></details>", read(SRC / "sections" / "faq.html"), re.S)
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": html.unescape(q),
                            "acceptedAnswer": {"@type": "Answer", "text": html.unescape(re.sub(r"<[^>]+>", "", a))}} for q, a in items]}


def breadcrumb_ld(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(trail)]}


def post_ld(p):
    return {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "description": p["description"],
            "datePublished": p["date"], "dateModified": p.get("updated", p["date"]), "inLanguage": "en",
            "image": SITE + p["image"], "mainEntityOfPage": SITE + p["path"],
            "author": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID}}


# ---------- rendering ----------
def include(text):
    return re.sub(r"\{\{include:([a-z0-9-]+)\}\}", lambda m: read(SRC / "sections" / f"{m.group(1)}.html").strip(), text)


def first_h2_to_h1(text):
    if "<h1" in text:
        return text
    return re.sub(r"<h2 (class=\"big[^\"]*\")>(.*?)</h2>", r"<h1 \1>\2</h1>", text, count=1, flags=re.S)


def relativize(text, depth):
    base = "../" * depth or "./"
    def fix(m):
        path = m.group(2)
        return f'{m.group(1)}="{base}{path}"' if path else f'{m.group(1)}="{base}"'
    return re.sub(r'\b(href|src)="/(?!/)([^"]*)"', fix, text)


def nav_html(key):
    out = []
    for label, path, k in NAV:
        cur = ' aria-current="page"' if k == key else ""
        out.append(f'    <a href="{path}"{cur}>{label}</a>')
    return "\n".join(out)


def post_card(p, lead=False):
    img = f'<img src="{p["image"]}" width="1200" height="630" alt="{esc(p["image_alt"])}" loading="lazy">'
    return (f'<article class="post-card"><a href="{p["path"]}"><div class="post-card-img">{img}</div>'
            f'<div class="post-card-text"><time datetime="{p["date"]}">{pretty_date(p["date"])}</time>'
            f'<h3>{p["title"]}</h3><p>{p["description"]}</p><span class="more">Read the story</span></div></a></article>')


def cover_html(p):
    src, w, h = p.get("hero", p["image"]), p.get("hero_w", "1200"), p.get("hero_h", "630")
    alt = esc(p.get("hero_alt", p["image_alt"]))
    cap = f'<figcaption>{p["hero_caption"]}</figcaption>' if p.get("hero_caption") else ""
    return f'<figure class="post-cover"><img src="{src}" width="{w}" height="{h}" alt="{alt}">{cap}</figure>'


def latest_post_html(posts):
    cards = "\n".join(post_card(p) for p in posts[:3])
    return ('<section class="news" id="blog" aria-label="Blog"><div class="wrap">\n'
            '<div class="news-head"><h2 class="news-title">From the blog</h2><a class="news-all" href="/blog/">All posts</a></div>\n'
            f'<div class="news-list">\n{cards}\n</div></div></section>')


def posts_list_html(posts):
    return "\n".join(f"      <li>{post_card(p)}</li>" for p in posts)


def render(page_html, meta, depth):
    layout = read(SRC / "layout.html")
    canonical = SITE + meta["path"]
    og_image = SITE + meta.get("og_image", OG_DEFAULT)
    subs = {
        "title": esc(meta["title"]), "description": esc(meta["description"]), "canonical": canonical,
        "og_type": meta.get("og_type", "website"), "og_image": og_image, "og_image_alt": esc(meta.get("og_image_alt", OG_DEFAULT_ALT)),
        "article_meta": meta.get("article_meta", ""), "nav": nav_html(meta["key"]), "page_class": meta["cls"],
        "v_tokens": vhash("tokens.css"), "v_style": vhash("style.css"), "v_main": vhash("main.js"),
        "jsonld": json.dumps(meta["ld"], indent=1, ensure_ascii=False).replace("</", "<\\/"),
        "content": page_html,
    }
    out = layout
    for k, v in subs.items():
        out = out.replace("{{" + k + "}}", v)
    return relativize(out, depth)


def write(path, text):
    f = ROOT / path.strip("/") / "index.html" if path.endswith("/") else ROOT / path.strip("/")
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text, encoding="utf-8")


def main():
    if "--refresh-x" in sys.argv:
        refresh_x()
    posts = load_posts()
    urls = []
    for pg in PAGES:
        body = include(read(SRC / "pages" / f"{pg['src']}.html"))
        body = body.replace("{{x_cards}}", x_cards_html()).replace("{{latest_post}}", latest_post_html(posts)).replace("{{posts_list}}", posts_list_html(posts))
        if pg["key"] != "home":
            body = first_h2_to_h1(body)
        ld = [org_ld(), site_ld(), code_ld()] if pg["key"] == "home" else [org_ld()]
        if pg["key"] != "home":
            ld.append(breadcrumb_ld([("Home", "/"), (re.sub(r" [–|].*", "", pg["title"]), pg["path"])]))
        if pg["key"] == "faq":
            ld.append(faq_ld())
        meta = dict(pg, ld=ld)
        depth = pg["path"].strip("/").count("/") + 1 if pg["path"] != "/" else 0
        write(pg["path"], render(body, meta, depth))
        urls.append((pg["path"], TODAY, "image" if pg["key"] == "home" else None))
    for p in posts:
        date_h = f'<time datetime="{p["date"]}">{pretty_date(p["date"])}</time>'
        body = (f'<article class="post"><header class="post-head"><div class="wrap">'
                f'<nav class="crumbs" aria-label="Breadcrumb"><a href="/blog/">Blog</a></nav>'
                f'<p class="post-date">{date_h}</p><h1 class="big">{p["title"]}</h1><p class="lead">{p["description"]}</p></div></header>'
                f'<div class="wrap">{cover_html(p)}'
                f'<div class="post-body">\n{p["body"]}\n</div>'
                f'<p class="post-back"><a href="/blog/">All posts</a></p></div></article>\n'
                + include("{{include:closing}}"))
        art = (f'<meta property="article:published_time" content="{p["date"]}">\n'
               f'<meta property="article:author" content="RoboPay">\n')
        meta = dict(path=p["path"], key="blog", cls="page-post", title=p["title"],
                    description=p["description"], og_type="article", og_image=p["image"], og_image_alt=p["image_alt"], article_meta=art,
                    ld=[org_ld(), post_ld(p), breadcrumb_ld([("Home", "/"), ("Blog", "/blog/"), (p["title"], p["path"])])])
        write(p["path"], render(body, meta, 2))
        urls.append((p["path"], p.get("updated", p["date"]), "image:" + p["image"]))

    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for path, last, img in urls:
        image = ""
        if img == "image":
            image = f"<image:image><image:loc>{SITE}{OG_DEFAULT}</image:loc></image:image>"
        elif img and img.startswith("image:"):
            image = f"<image:image><image:loc>{SITE}{img[6:]}</image:loc></image:image>"
        sm.append(f"  <url><loc>{SITE}{path}</loc><lastmod>{last}</lastmod>{image}</url>")
    sm.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")

    items = []
    for p in posts:
        pub = email.utils.format_datetime(datetime.datetime.fromisoformat(p["date"]).replace(hour=9, tzinfo=datetime.timezone.utc))
        items.append(f"    <item><title>{esc(p['title'])}</title><link>{SITE}{p['path']}</link><guid isPermaLink=\"true\">{SITE}{p['path']}</guid>"
                     f"<pubDate>{pub}</pubDate><description>{esc(p['description'])}</description></item>")
    feed = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n'
            f"    <title>RoboPay blog</title><link>{SITE}/blog/</link>\n"
            "    <description>News, demos and research notes from the RoboPay team at HTW Berlin.</description><language>en</language>\n"
            + "\n".join(items) + "\n</channel></rss>\n")
    (ROOT / "feed.xml").write_text(feed, encoding="utf-8")
    print(f"built {len(PAGES)} pages, {len(posts)} post(s), sitemap.xml, feed.xml")


if __name__ == "__main__":
    main()
