#!/bin/sh
# Usage: ./set-domain.sh newdomain.tld
# Replaces the current domain (read from CNAME) in build.py, robots.txt and 404.html, rebuilds the site and rewrites CNAME.
[ -z "$1" ] && { echo "usage: $0 newdomain.tld"; exit 1; }
OLD=$(tr -d '[:space:]' < CNAME)
[ -z "$OLD" ] && { echo "CNAME is empty"; exit 1; }
sed -i "s#https://$OLD#https://$1#g" build.py robots.txt 404.html
python3 build.py
echo "$1" > CNAME
echo "Done: https://$OLD -> https://$1"
