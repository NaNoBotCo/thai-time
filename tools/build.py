#!/usr/bin/env python3
"""build.py — writes docs/index.html (English), docs/th/index.html (Thai), sitemap.xml, robots.txt,
llms.txt and icon.svg. All copy, both languages, is in copy_text.py; picture credits in credits.json.

Run:  python3 tools/build.py
"""
import html
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from copy_text import UI, NAV, HOURS, LANNA, STEMS, BRANCHES, BANNED_1900, CITIES, WORDS, SOURCES, PHOTO_TEXT  # noqa: E402

DOCS = os.path.join(HERE, "..", "docs")
BASE = "https://nanobotco.github.io/thai-time/"
E = html.escape
CSS = open(os.path.join(HERE, "site.css")).read()
PHOTOS = json.load(open(os.path.join(HERE, "credits.json")))
GOOGLE_ESCAPE = '<script>if(/[.]translate[.]goog$/.test(location.hostname))location.replace("https://"+location.hostname.slice(0,-15).replace(/--/g,"~").replace(/-/g,".").replace(/~/g,"-")+location.pathname+location.search.replace(/([?&])_x_tr_[^&]*/g,"$1").replace(/[?&]+$/,"").replace(/[?]&+/,"?")+location.hash)</script>'


def paras(ps):
    return "".join(f"<p>{p}</p>" for p in ps)


def btn(id_, label, hot=False, pressed=None, extra=""):
    p = f' aria-pressed="{pressed}"' if pressed is not None else ""
    return f'<button id="{id_}" class="pill{" hot" if hot else ""}" type="button"{p}{extra}>{E(label)}</button>'


def ro(*pairs, cls=""):
    return f'<div class="readout {cls}">' + "".join(f'<div><span>{E(a)}</span><b id="{b}">–</b></div>' for a, b in pairs) + "</div>"


def sec(id_, cls, kick, h, body):
    return f'<section id="{id_}" class="sec {cls}"><div class="in">{f"<p class=kick>{kick}</p>" if kick else ""}<h2>{h}</h2>{body}</div></section>\n'


def hm(h, m=0):
    return f"{h:02d}:{m:02d}"


def lanna_rows(u):
    def cell(i):
        th, r = LANNA[i]
        a = 360 + 90 * i
        return f'<li data-w="{i}"><span class="t">{hm(a // 60 % 24, a % 60)}–{hm((a + 90) // 60 % 24, (a + 90) % 60)}</span><b lang="th">{E(th)}</b><i>{E(r)}</i></li>'
    day = "".join(cell(i) for i in range(8))
    night = "".join(cell(i) for i in range(8, 16))
    return f'<div class="lan"><div><h3>{E(u["l_day"])}</h3><ol>{day}</ol></div><div><h3>{E(u["l_night"])}</h3><ol>{night}</ol></div></div>'


def page(lang):
    u = UI[lang]
    root = "" if lang == "en" else "../"
    url = BASE if lang == "en" else BASE + "th/"
    js = dict(u["js"])
    for k in ("q_which_time", "q_which_say", "q_next", "q_again", "q_right", "q_wrong", "q_score", "q_done", "l_now", "u_line", "u_bmt", "u_down", "d_year"):
        js[k] = u[k]
    js["lang"] = lang
    nav = "".join(f'<a href="#{a}">{E(b)}</a>' for a, b in zip(NAV, u["nav"]))
    ol = u["lang_other"]
    head = f'''<!doctype html><html lang="{lang}" translate="no" class="notranslate"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate">
{GOOGLE_ESCAPE}
<title>{E(u["title"])} · {E(u["other_title"])}</title>
<meta name="description" content="{E(u["desc"])}">
<meta name="theme-color" content="#14123a">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{BASE}"><link rel="alternate" hreflang="th" href="{BASE}th/"><link rel="alternate" hreflang="x-default" href="{BASE}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Telling Time in Thai · บอกเวลาแบบไทย">
<meta property="og:title" content="{E(u["title"])}"><meta property="og:description" content="{E(u["desc"])}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}card.jpg"><meta property="og:image:secure_url" content="{BASE}card.jpg"><meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{E(u["card_alt"])}">
<meta property="og:locale" content="{"en_US" if lang == "en" else "th_TH"}"><meta property="og:locale:alternate" content="{"th_TH" if lang == "en" else "en_US"}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{BASE}card.jpg">
<link rel="icon" href="{root}icon.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" href="{BASE}llms.txt" title="llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Noto+Sans+Thai+Looped:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&family=Noto+Serif+Thai:wght@600;700&display=swap" rel="stylesheet">
<script>if(/[?&]card/.test(location.search))document.documentElement.classList.add("card")</script>
<style>{CSS}</style>
</head><body>
<header class="top"><div class="in"><a class="brand" href="#top"><img src="{root}icon.svg" width="28" height="28" alt=""><span>{E(u["title"])}</span></a>
<nav aria-label="{E(u["nav_label"])}">{nav}</nav>
<span class="lang"><b>{E(u["lang_this"])}</b> | <a href="{ol[0]}" hreflang="{ol[2]}">{E(ol[1])}</a></span></div></header>
'''
    hero = f'''<section id="top" class="hero"><canvas id="scene" role="img" aria-label="{E(u["hero_alt"])}"></canvas>
<div class="hero-t"><p class="kick">{E(u["kicker"])}</p><h1>{E(u["title"])}</h1><p class="lede">{E(u["lede"])}</p>
<div class="now" aria-live="polite"><span class="nowlab">{E(u["now_lab"])}</span><b id="nowth" lang="th">–</b><i id="nowro"></i><span id="nowen"></span></div>
<p class="go"><a class="pill hot" href="#say">{E(u["hero_go"])}</a></p>
<p class="cardline">{E(u["other_title"])} · {E(u["cardline"])}<br><span>nanobotco.github.io/thai-time</span></p></div></section>
'''
    cards = "".join(f'<div class="blk b-{k}"><b lang="th">{E(w)}</b><i>{E(r)}</i><span class="hrs">{E(hrs)}</span><span>{E(g)}</span><span lang="th" class="ex">{E(ex)}</span></div>' for k, w, r, hrs, g, ex in u["blocks"])
    rows = "".join(f'<tr class="b-{x["blk"]}"><td class="t">{hm(x["h"])}</td><td lang="th"><b>{E(x["th"])}</b></td><td><i>{E(x["ro"])}</i></td><td>{E(x["en"])}</td><td lang="th">{E(x["alt"])}</td></tr>' for x in HOURS[1:] + HOURS[:1])
    hc = "".join(f"<th>{E(c)}</th>" for c in u["hours_cols"])
    what = sec("what", "", E(u["what_kick"]), E(u["what_h"]), paras(u["what_p"]) + f'<div class="blks">{cards}</div><p class="note">{u["blocks_note"]}</p>'
               + f'<h3 class="sub">{E(u["hours_h"])}</h3><div class="tw"><table class="hrs-t"><thead><tr>{hc}</tr></thead><tbody>{rows}</tbody></table></div>')

    say = sec("say", "dark", E(u["say_kick"]), E(u["say_h"]), f'''{paras(u["say_p"])}
<div class="two"><div class="dialw"><canvas id="saycv" class="cv sq" role="img" aria-label="{E(u["say_h"])}"></canvas></div>
<div><input id="sayr" type="range" min="0" max="1439" step="1" value="870" aria-label="{E(u["say_h"])}">
<div class="said"><b id="sayth" lang="th">–</b><i id="sayro"></i><span id="sayen"></span></div>
<dl class="rows"><dt>{E(u["r_also"])}</dt><dd id="saalt" lang="th"></dd><dt>{E(u["r_1900"])}</dt><dd id="sa1900" lang="th"></dd><dt>{E(u["r_radio"])}</dt><dd id="saradio" lang="th"></dd><dt>{E(u["r_written"])}</dt><dd id="sawr"></dd><dt>{E(u["r_lanna"])}</dt><dd id="salan" lang="th"></dd></dl>
<div class="btns">{btn("saynow", u["b_now"])}{btn("sayhear", u["b_hear"], hot=True)}</div></div></div>
<p class="note">{u["say_note"]}</p>''')

    sound = sec("sound", "", E(u["sound_kick"]), E(u["sound_h"]), f'''<div class="two"><div>{paras(u["sound_p"])}
<div class="btns">{btn("sgong", u["s_gong"], hot=True)}{btn("sdrum", u["s_drum"], hot=True)}{btn("sroll", u["s_roll"])}{btn("shorn", u["s_horn"])}</div><p class="note">{u["sound_note"]}</p></div>
<div><canvas id="soundcv" class="cv wide" role="img" aria-label="{E(u["sound_h"])}"></canvas></div></div>''')

    quiz = sec("quiz", "rock", E(u["quiz_kick"]), E(u["quiz_h"]), f'''{paras(u["quiz_p"])}
<div class="quiz"><p class="qprog"><span id="qn"></span> · {E(u["q_score"])} <b id="qs">0</b></p><p class="qq" id="qq"></p><div class="qa" id="qa" role="group"></div><p class="qf" id="qf" aria-live="polite"></p><div class="btns">{btn("qnext", u["q_next"], hot=True)}</div></div>''')

    sp = "".join(f'<button class="pill" type="button" data-sp="{v}" aria-pressed="{"true" if v == 60 else "false"}">{E(n)}</button>' for v, n in zip((1, 60, 600), u["c_speed"]))
    coconut = sec("coconut", "", E(u["coconut_kick"]), E(u["coconut_h"]), f'''<div class="two"><div>{paras(u["coconut_p"][:2])}</div>
<div><canvas id="cococv" class="cv sq" role="img" aria-label="{E(u["coconut_h"])}"></canvas>
<div class="seg" role="group">{sp}</div>{ro((u["c_bat"], "cbat"), (u["c_min"], "cmin"), (u["c_sticks"], "cstk"))}</div></div>
{paras(u["coconut_p"][2:])}<blockquote>{u["coconut_quote"]}</blockquote>''')

    yrows = "".join(f'<tr class="{"diff" if x["p1900"].split(" · ")[0] != x["th"] else ""}"><td class="t">{hm(x["h"])}</td><td lang="th">{E(x["th"])}</td><td lang="th"><b>{E(x["p1900"])}</b> <i>{E(x["p_ro"])}</i></td></tr>' for x in HOURS[6:] + HOURS[:6])
    yc = "".join(f"<th>{E(c)}</th>" for c in u["y_cols"])
    banned = "".join(f'<s lang="th">{E(b)}</s>' for b in BANNED_1900)
    y1900 = sec("y1900", "dark", E(u["y1900_kick"]), E(u["y1900_h"]), f'''{paras(u["y1900_p"])}<p class="banned"><span>{E(u["y_banned"])}</span> {banned}</p>
<div class="tw"><table class="y-t"><thead><tr>{yc}</tr></thead><tbody>{yrows}</tbody></table></div><p class="note">{E(u["y1900_note"])}</p>''')

    lanna = sec("lanna", "", E(u["lanna_kick"]), E(u["lanna_h"]), f'''<div class="two"><div>{paras(u["lanna_p"])}</div>
<div><canvas id="lanncv" class="cv sq" role="img" aria-label="{E(u["lanna_h"])}"></canvas></div></div>{lanna_rows(u)}<p class="note">{E(u["lanna_note"])}</p>
<h3 class="sub">{E(u["lcal_h"])}</h3>{paras(u["lcal_p"])}
<h3 class="sub">{E(u["days_h"])}</h3><div class="two"><div>{paras(u["days_p"])}
<div class="wday"><span>{E(u["d_today"])}</span> <b id="wdname" lang="th">–</b> <i id="wdro"></i><span id="wddate"></span></div>
<div class="btns">{btn("wdprev", u["d_prev"])}{btn("wdtoday", u["d_today"])}{btn("wdnext", u["d_next"], hot=True)}</div>
<p class="wyear"><span>{E(u["d_year"])}</span> <b id="wyname" lang="th">–</b> <i id="wyro"></i></p><p class="note">{E(u["days_note"])}</p></div>
<div><canvas id="gearcv" class="cv sq" role="img" aria-label="{E(u["days_h"])}"></canvas></div></div>
<h3 class="sub">{E(u["months_h"])}</h3>{paras(u["months_p"])}''')

    cp = "".join(f'<button class="pill" type="button" data-city="{k}" aria-pressed="{"true" if k == "cm" else "false"}">{E(en if lang == "en" else th)}</button>' for k, en, th, _, _ in CITIES)
    sun = sec("sun", "rock", E(u["sun_kick"]), E(u["sun_h"]), f'''{paras(u["sun_p"][:2])}
<div class="seg" role="group">{cp}</div>
<canvas id="lonv" class="cv strip" role="img" aria-label="{E(u["u_line"])}"></canvas>
<div class="two" style="margin-top:22px"><div>{paras(u["sun_p"][2:])}{ro((u["u_rise"], "urise"), (u["u_noon"], "unoon"), (u["u_set"], "uset"), (u["u_spans"], "uspan"))}</div>
<div><canvas id="skycv" class="cv sky" role="img" aria-label="{E(u["sun_h"])}"></canvas></div></div><p class="note">{E(u["sun_note"])}</p>''')

    dl = "".join(f'<li><span class="t">{E(t)}</span><b lang="th">{E(w)}</b><span class="d">{d}</span></li>' for t, w, d in u["day"])
    day = sec("day", "", E(u["day_kick"]), E(u["day_h"]), f'<ol class="dayl">{dl}</ol>')

    figs = []
    for p in PHOTOS:
        cap = PHOTO_TEXT[p["key"]][0 if lang == "en" else 1]
        figs.append(f'<figure><img loading="lazy" src="{root}img/{p["file"]}" width="{p["width"]}" height="{p["height"]}" alt="{E(cap)}"><figcaption>{E(cap)} <a href="{p["commons_page"]}">{E(p["author"])}</a> · {E(p["license"])}</figcaption></figure>')
    pics = sec("pictures", "dark", "", E(u["pic_h"]), f'<div class="ph">{"".join(figs)}</div>')

    tl = "".join(f'<li><b>{E(y)}</b><span>{t}</span></li>' for y, t in u["hist"])
    history = sec("history", "dark", E(u["hist_kick"]), E(u["hist_h"]), f'<ol class="tl">{tl}</ol>')

    words = "".join(f'<div><b lang="th">{E(w)}</b><i>{E(r)}</i><p>{E(en if lang == "en" else th)}</p></div>' for w, r, en, th in WORDS)
    wd = sec("words", "", "", E(u["words_h"]), f'<div class="glos">{words}</div>')
    src = "".join(f'<li><a href="{E(h)}">{E(t)}</a></li>' for t, h in SOURCES)
    so = sec("sources", "", "", E(u["src_h"]), f'<p>{E(u["src_p"])}</p><ul class="src">{src}</ul>')

    data = {"hours": HOURS, "lanna": LANNA, "cities": CITIES, "stems": STEMS, "branches": BRANCHES}
    tail = f'''<footer class="bot"><div class="in">{E(u["foot"])} · <a href="https://github.com/NaNoBotCo/thai-time">GitHub</a> · <a href="https://motdang.net/">motdang.net</a> · <a href="https://hongdam.net/">hongdam.net</a></div></footer>
<script>window.UI={json.dumps(js, ensure_ascii=False)};window.TT={json.dumps(data, ensure_ascii=False)};</script>
<script src="{root}app.js"></script><script src="{root}top.js"></script>
</body></html>
'''
    return head + "<main>" + hero + what + say + sound + quiz + coconut + y1900 + lanna + sun + day + pics + history + wd + so + "</main>" + tail


def icon():
    # a 24-hour ring in four blocks with one hand
    cols = ["#5c7cfa", "#ffc94d", "#ff8f6b", "#a67cff"]
    segs = []
    for i, c in enumerate(cols):
        a0 = math.radians(i * 90 + 180 + 3)
        a1 = math.radians(i * 90 + 270 - 3)
        x0, y0 = 32 + 21 * math.sin(a0), 32 - 21 * math.cos(a0)
        x1, y1 = 32 + 21 * math.sin(a1), 32 - 21 * math.cos(a1)
        segs.append(f'<path d="M{x0:.2f} {y0:.2f}A21 21 0 0 1 {x1:.2f} {y1:.2f}" stroke="{c}" stroke-width="7" fill="none" stroke-linecap="round"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#14123a"/>'
            + "".join(segs) + '<path d="M32 32L45 22" stroke="#fff6dd" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="4" fill="#fff6dd"/></svg>\n')


def main():
    os.makedirs(os.path.join(DOCS, "th"), exist_ok=True)
    for lang, path in (("en", "index.html"), ("th", "th/index.html")):
        with open(os.path.join(DOCS, path), "w") as f:
            f.write(page(lang))
    with open(os.path.join(DOCS, "icon.svg"), "w") as f:
        f.write(icon())
    with open(os.path.join(DOCS, "sitemap.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                f'<url><loc>{BASE}</loc></url>\n<url><loc>{BASE}th/</loc></url>\n</urlset>\n')
    with open(os.path.join(DOCS, "robots.txt"), "w") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")
    u = UI["en"]
    strip = lambda s: html.unescape(re.sub("<[^>]+>", "", s))
    L = ["# Telling Time in Thai · บอกเวลาแบบไทย", "", u["desc"], "", f"English: {BASE}", f"Thai: {BASE}th/", ""]
    L += ["## " + u["what_h"], ""] + [strip(p) for p in u["what_p"]] + [""]
    L += ["## Every hour (clock · said · reading · word by word · also heard · 1900 list)", ""]
    L += [f"- {hm(x['h'])} · {x['th']} · {x['ro']} · {x['en']} · {x['alt'] or '—'} · {x['p1900']}" for x in HOURS[1:] + HOURS[:1]]
    L += ["", "Half past: ครึ่ง khrueng. Minutes: number + นาที nathi. Written: 14.30 น. Read on radio: สิบสี่นาฬิกาสามสิบนาที.", ""]
    for key in ("sound", "coconut", "y1900", "lanna", "sun"):
        L += ["## " + strip(u[key + "_h"]), ""] + [strip(p) for p in u[key + "_p"]]
        if key + "_note" in u:
            L.append(strip(u[key + "_note"]))
        L.append("")
    L += ["Struck out in 1900: " + ", ".join(BANNED_1900), ""]
    L += ["### Lanna watches (from 06:00, 90 minutes each)", ""]
    for i, (th, r) in enumerate(LANNA):
        a = 360 + 90 * i
        L.append(f"- {hm(a // 60 % 24, a % 60)}–{hm((a + 90) // 60 % 24, (a + 90) % 60)} {th} ({r})")
    for key in ("lcal", "days", "months"):
        L += ["### " + u[key + "_h"], ""] + [strip(p) for p in u[key + "_p"]] + [""]
    L += ["วันไท first names: " + " ".join(a for a, _ in STEMS), "วันไท last names: " + " ".join(a for a, *_ in BRANCHES), strip(u["days_note"])]
    L += ["", "## " + u["day_h"], ""] + [f"- {t} {w}: {strip(d)}" for t, w, d in u["day"]]
    L += ["", "## " + u["hist_h"], ""] + [f"- {y}: {strip(t)}" for y, t in u["hist"]]
    L += ["", "## Words", ""] + [f"- {w} {r}: {en}" for w, r, en, _ in WORDS]
    L += ["", "## Sources", ""] + [f"- {t}: {h}" for t, h in SOURCES]
    L += ["", "## Licence", "", "Text CC BY 4.0, NaNoBotCo. Code MIT. Pictures public domain, credited on the page.", ""]
    with open(os.path.join(DOCS, "llms.txt"), "w") as f:
        f.write("\n".join(L))
    print("built en + th -> docs/")


if __name__ == "__main__":
    main()
