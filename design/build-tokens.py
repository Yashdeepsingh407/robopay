#!/usr/bin/env python3
"""Build tokens.css from design/tokens.json. Usage: python3 design/build-tokens.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent
data = json.loads((root / "tokens.json").read_text())
lines = ["/* GENERATED from design/tokens.json by design/build-tokens.py. Do not edit by hand. */", ":root {"]
for group, items in data.items():
    if group.startswith("_") or group in ("aliases", "breakpoint"):
        continue
    lines.append(f"  /* {group} */")
    for k, v in items.items():
        if k.startswith("_"):
            continue
        name = f"--{group}-{k}" if group != "z" else f"--z-{k}-i"
        lines.append(f"  {name}: {v};")
if data.get("aliases"):
    lines.append("  /* aliases */")
    for k, v in data["aliases"].items():
        lines.append(f"  {k}: {v};")
lines.append("}")
(root.parent / "tokens.css").write_text("\n".join(lines) + "\n")
print("tokens.css written:", len(lines), "lines")
