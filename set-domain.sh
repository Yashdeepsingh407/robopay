#!/bin/sh
# Usage: ./set-domain.sh robopay.xyz   (replaces __DOMAIN__ with https://robopay.xyz and writes CNAME)
[ -z "$1" ] && { echo "usage: $0 yourdomain.tld"; exit 1; }
D="https://$1"
sed -i.bak "s#__DOMAIN__#$D#g" index.html robots.txt sitemap.xml && rm -f index.html.bak robots.txt.bak sitemap.xml.bak
echo "$1" > CNAME
echo "Done: $D"
