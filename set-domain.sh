#!/bin/sh
# Usage: ./set-domain.sh newdomain.tld
# Replaces the current domain (read from CNAME) in index.html, robots.txt and sitemap.xml and rewrites CNAME.
[ -z "$1" ] && { echo "usage: $0 newdomain.tld"; exit 1; }
OLD=$(tr -d '[:space:]' < CNAME)
[ -z "$OLD" ] && { echo "CNAME is empty"; exit 1; }
sed -i.bak "s#https://$OLD#https://$1#g" index.html robots.txt sitemap.xml 404.html && rm -f index.html.bak robots.txt.bak sitemap.xml.bak 404.html.bak
echo "$1" > CNAME
echo "Done: https://$OLD -> https://$1"
