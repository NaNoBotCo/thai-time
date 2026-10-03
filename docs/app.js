/* Telling Time in Thai — dials, sounds, quiz, coconut clock, Lanna watches, sun time.
   Everything is drawn from arithmetic on <canvas>; sounds are synthesised with Web Audio. */
(function () {
  "use strict";
  var U = window.UI, T = window.TT, H = T.hours, LAN = T.lanna, CITIES = T.cities;
  var EN = U.lang === "en";
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CARD = document.documentElement.classList.contains("card");
  var $ = function (id) { return document.getElementById(id); };
  var COL = { ti: "#5c7cfa", chao: "#ffc94d", bai: "#ff8f6b", thum: "#a67cff" };
  var TAU = Math.PI * 2;
  var rad = function (d) { return d * Math.PI / 180; }, deg = function (r) { return r * 180 / Math.PI; };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var FONT_TH = '"Noto Sans Thai Looped","Noto Sans Thai",system-ui,sans-serif', FONT_SERIF = '"Noto Serif Thai",Fraunces,Georgia,serif';

  // ---------- time ----------
  var qs = new URLSearchParams(location.search), FIX = null;
  (function () { var m = (qs.get("t") || "").match(/^(\d{1,2}):?(\d{2})$/); if (m) FIX = (+m[1]) * 60 + (+m[2]); })();
  function thaiNow() {
    var now = Date.now(), d = new Date(now + 7 * 3600e3);
    if (FIX != null) {
      var day0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 7 * 3600e3;
      return { min: FIX, ms: day0 + FIX * 60e3 };
    }
    return { min: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60, ms: now };
  }

  function fit(cv) {
    var r = cv.getBoundingClientRect(), w = Math.max(1, Math.round(r.width * DPR)), h = Math.max(1, Math.round(r.height * DPR));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var c = cv.getContext("2d"); c.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { c: c, w: r.width, h: r.height };
  }
  function onVisible(el, fn) {
    if (!("IntersectionObserver" in window)) { fn(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { fn(e.isIntersecting); }); }, { rootMargin: "120px" }).observe(el);
  }

  // ---------- words ----------
  var NT = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ"];
  var NR = ["sun", "nueng", "song", "sam", "si", "ha", "hok", "chet", "paet", "kao", "sip"];
  function num(n) {
    if (n <= 10) return [NT[n], NR[n]];
    var t = Math.floor(n / 10), o = n % 10;
    var th = (t === 1 ? "" : t === 2 ? "ยี่" : NT[t]) + "สิบ", ro = (t === 1 ? "" : t === 2 ? "yi-" : NR[t] + "-") + "sip";
    if (o === 1) { th += "เอ็ด"; ro += "-et"; } else if (o) { th += NT[o]; ro += "-" + NR[o]; }
    return [th, ro];
  }
  function gloss(h) {
    var s = function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); };
    if (h === 0) return "midnight";
    if (h < 6) return "strike " + h;
    if (h === 6) return "6 gongs, morning";
    if (h < 12) return s(h, "gong");
    if (h === 12) return "noon";
    if (h <= 16) return "afternoon, " + s(h - 12, "gong");
    if (h <= 18) return s(h - 12, "gong") + ", evening";
    return s(h - 18, "drum");
  }
  function block(h) { return H[h].blk; }
  function say(t) {
    t = ((Math.round(t) % 1440) + 1440) % 1440;
    var h = Math.floor(t / 60), m = t % 60, x = H[h], o = { t: t, h: h, m: m, x: x, hh: pad(h) + ":" + pad(m), alt: "", altro: "" };
    if (m === 0) {
      o.th = x.th; o.ro = x.ro; o.en = x.en;
      if (x.alt) { o.alt = x.alt; o.altro = x.alt_ro; }
    } else {
      var mt, mr, me;
      if (m === 30) { mt = "ครึ่ง"; mr = "khrueng"; me = "half"; }
      else { var n = num(m); mt = n[0] + "นาที"; mr = n[1] + " nathi"; me = m + " minute" + (m === 1 ? "" : "s"); }
      o.th = x.mth + mt; o.ro = x.mro + " " + mr; o.en = gloss(h) + ", " + me;
      if (x.ctx) { o.th += " (" + x.ctx + ")"; o.ro += " (" + x.cro + ")"; }
      if (m >= 40) {
        var nx = H[(h + 1) % 24], k = num(60 - m);
        o.alt = "อีก" + k[0] + "นาที" + nx.short; o.altro = "ik " + k[1] + " nathi " + nx.sro;
      }
    }
    var p = x.p1900.split(" · ")[0], pr = x.p_ro.split(" · ")[0], b = Math.floor(m / 6);
    o.p19 = p; o.p19r = pr;
    if (b) { var bn = num(b); o.p19 += " " + bn[0] + "บาท"; o.p19r += " " + bn[1] + " bat"; }
    var hn = num(h), mn = num(m);
    o.rad = hn[0] + "นาฬิกา" + (m ? mn[0] + "นาที" : ""); o.radr = hn[1] + " nalika" + (m ? " " + mn[1] + " nathi" : "");
    o.wr = pad(h) + "." + pad(m) + " น.";
    o.w = Math.floor((((t - 360) % 1440) + 1440) % 1440 / 90);
    o.lan = LAN[o.w][0]; o.lanro = LAN[o.w][1];
    return o;
  }

  // ---------- sound ----------
  var AC = null, OUT = null, HITS = [];
  function ac() {
    if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); OUT = AC.createDynamicsCompressor(); OUT.connect(AC.destination); }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function env(g, t0, att, dec, peak) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + att + dec); }
  function fx(kind, t0) { var a = AC; setTimeout(function () { HITS.push({ k: kind, t: performance.now() }); kick(); }, Math.max(0, (t0 - a.currentTime) * 1000)); }
  function tone(a, f, t0, g, d, type) { var s = a.createOscillator(); s.type = type || "sine"; s.frequency.value = f; var e = a.createGain(); env(e, t0, 0.005, d, g); s.connect(e).connect(OUT); s.start(t0); s.stop(t0 + d + 0.1); return s; }
  function gong(t0, f) {
    var a = ac(); if (!a) return; f = f || 104;
    [[1, .5, 5.5], [1.5, .16, 3], [2.02, .28, 3.6], [2.74, .18, 2.6], [3.46, .12, 2], [4.18, .07, 1.4], [5.4, .045, 1]].forEach(function (p) {
      var s = a.createOscillator(); s.frequency.setValueAtTime(f * p[0] * 1.012, t0); s.frequency.exponentialRampToValueAtTime(f * p[0], t0 + 0.6);
      var e = a.createGain(); env(e, t0, 0.006, p[2], p[1]); s.connect(e).connect(OUT); s.start(t0); s.stop(t0 + p[2] + 0.1);
    });
    fx("gong", t0);
  }
  function drum(t0) {
    var a = ac(); if (!a) return;
    var s = a.createOscillator(); s.frequency.setValueAtTime(140, t0); s.frequency.exponentialRampToValueAtTime(52, t0 + 0.22);
    var e = a.createGain(); env(e, t0, 0.004, 1.1, 0.95); s.connect(e).connect(OUT); s.start(t0); s.stop(t0 + 1.3);
    var n = a.createBufferSource(), len = (a.sampleRate * 0.2) | 0, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    n.buffer = b; var lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; var g2 = a.createGain(); g2.gain.value = 0.5;
    n.connect(lp).connect(g2).connect(OUT); n.start(t0);
    fx("drum", t0);
  }
  function bell(t0) { var a = ac(); if (!a) return; tone(a, 880, t0, .22, 1.6); tone(a, 880 * 2.76, t0, .08, .9); tone(a, 880 * 5.4, t0, .04, .5); fx("bell", t0); }
  function horn(t0) {
    var a = ac(); if (!a) return;
    var s = a.createOscillator(); s.type = "sawtooth";
    s.frequency.setValueAtTime(150, t0); s.frequency.linearRampToValueAtTime(185, t0 + 0.25); s.frequency.setValueAtTime(185, t0 + 1.2); s.frequency.linearRampToValueAtTime(160, t0 + 1.7);
    var v = a.createOscillator(); v.frequency.value = 5.5; var vg = a.createGain(); vg.gain.value = 3; v.connect(vg).connect(s.frequency);
    var lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 4;
    var e = a.createGain(); e.gain.setValueAtTime(0.0001, t0); e.gain.exponentialRampToValueAtTime(0.35, t0 + 0.15); e.gain.setValueAtTime(0.35, t0 + 1.4); e.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
    s.connect(lp).connect(e).connect(OUT); s.start(t0); v.start(t0); s.stop(t0 + 2); v.stop(t0 + 2);
    fx("horn", t0);
  }
  function roll(t0) { var dt = 0.45, t = t0; for (var i = 0; i < 16; i++) { drum(t); t += dt; dt = Math.max(0.09, dt * 0.84); } gong(t + 0.2); return t + 0.2; }
  function ring(kind, n) {
    var a = ac(); if (!a) return; var t = a.currentTime + 0.06;
    if (kind === "roll") { roll(t); return; }
    var f = kind === "gong" ? gong : kind === "drum" ? drum : bell, gap = kind === "drum" ? 0.8 : 1.15;
    for (var i = 0; i < n; i++) f(t + i * gap);
  }

  // ---------- the dial ----------
  function ang(t) { return (t / 1440 - 0.5) * TAU; }            // 12:00 at the top, 06:00 left, clockwise
  function pt(cx, cy, r, a) { return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
  var ARCS = [["ti", 30, 330], ["chao", 330, 750], ["bai", 750, 1110], ["thum", 1110, 1470]];
  function drawSun(c, x, y, r) {
    c.save(); c.fillStyle = "#ffd75e"; c.shadowColor = "rgba(255,200,80,.8)"; c.shadowBlur = r * 1.4;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
    c.strokeStyle = "#ffd75e"; c.lineWidth = Math.max(1.5, r * 0.18); c.lineCap = "round";
    for (var i = 0; i < 8; i++) { var a = i * TAU / 8; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); c.lineTo(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75); c.stroke(); }
  }
  function drawMoon(c, x, y, r) {
    c.save(); c.fillStyle = "#f3eccf"; c.shadowColor = "rgba(240,230,200,.6)"; c.shadowBlur = r;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
    c.fillStyle = "rgba(20,18,58,.92)"; c.beginPath(); c.arc(x + r * 0.45, y - r * 0.25, r * 0.88, 0, TAU); c.fill();
  }
  function drawDial(c, cx, cy, R, t, o) {
    o = o || {};
    var rw = R * 0.15;
    c.save();
    // face
    var g = c.createRadialGradient(cx, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(1, "rgba(255,255,255,.02)");
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R - rw / 2, 0, TAU); c.fill();
    // block arcs
    ARCS.forEach(function (b) {
      c.strokeStyle = COL[b[0]]; c.lineWidth = rw; c.lineCap = "butt";
      c.beginPath(); c.arc(cx, cy, R, ang(b[1]) - Math.PI / 2 + 0.012, ang(b[2]) - Math.PI / 2 - 0.012); c.stroke();
    });
    // hour numbers, beads
    var fs = Math.max(10, R * 0.075);
    c.textAlign = "center"; c.textBaseline = "middle";
    for (var h = 0; h < 24; h++) {
      var a = ang(h * 60), x = H[h];
      c.fillStyle = "rgba(255,246,221,.9)"; c.font = "600 " + fs + "px " + FONT_TH;
      if (R > 150 || h % 3 === 0) { var p = pt(cx, cy, R - rw / 2 - fs * 1.05, a); c.fillText(String(h), p[0], p[1]); }
      var q0 = pt(cx, cy, R - rw * 0.42, a), q1 = pt(cx, cy, R + rw * 0.42, a);
      c.strokeStyle = "rgba(20,18,58,.55)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke();
      if (o.beads !== false) {
        var n = x.ring[0], kind = x.ring[1], br = Math.max(1.6, R * 0.014);
        c.fillStyle = COL[x.blk];
        if (kind === "roll") {
          c.strokeStyle = COL[x.blk]; c.lineWidth = br; c.beginPath();
          for (var s = 0; s <= 12; s++) { var rr = R + rw / 2 + br * 2 + s * br * 0.9, wob = Math.sin(s * 1.9) * 0.025; var pp = pt(cx, cy, rr, a + wob); s ? c.lineTo(pp[0], pp[1]) : c.moveTo(pp[0], pp[1]); }
          c.stroke();
        } else {
          for (var i = 0; i < n; i++) {
            var bp = pt(cx, cy, R + rw / 2 + br * 2.4 + i * br * 2.6, a);
            c.beginPath();
            if (kind === "drum") c.rect(bp[0] - br, bp[1] - br, br * 2, br * 2); else c.arc(bp[0], bp[1], br, 0, TAU);
            c.fill();
          }
        }
      }
    }
    // block words
    if (o.words !== false) {
      c.font = "700 " + Math.max(13, R * 0.1) + "px " + FONT_SERIF;
      [["ti", 180], ["chao", 540], ["bai", 930], ["thum", 1290]].forEach(function (b) {
        var p = pt(cx, cy, R + rw / 2 + R * 0.27, ang(b[1]));
        c.fillStyle = COL[b[0]]; c.fillText(U.blk[b[0]], p[0], p[1]);
      });
      c.font = "600 " + Math.max(11, R * 0.065) + "px " + FONT_TH; c.fillStyle = "rgba(255,246,221,.85)";
      var pn = pt(cx, cy, R - rw / 2 - fs * 2.6, 0); c.fillText(U.noon_w, pn[0], pn[1]);
      var pm = pt(cx, cy, R - rw / 2 - fs * 2.6, Math.PI); c.fillText(U.midnight, pm[0], pm[1]);
    }
    // hand
    var ah = ang(t), tip = pt(cx, cy, R, ah), base = pt(cx, cy, R * 0.12, ah + Math.PI);
    c.strokeStyle = "#fff6dd"; c.lineWidth = Math.max(3, R * 0.03); c.lineCap = "round";
    c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(tip[0], tip[1]); c.stroke();
    var hb = block(Math.floor(t / 60) % 24);
    c.fillStyle = COL[hb]; c.beginPath(); c.arc(tip[0], tip[1], rw * 0.42, 0, TAU); c.fill();
    c.strokeStyle = "#fff6dd"; c.lineWidth = 2; c.stroke();
    var day = t >= 360 && t < 1080, ic = pt(cx, cy, R * 0.55, ah);
    if (o.icon !== false) { if (day) drawSun(c, ic[0], ic[1], R * 0.06); else drawMoon(c, ic[0], ic[1], R * 0.065); }
    c.fillStyle = "#fff6dd"; c.beginPath(); c.arc(cx, cy, R * 0.045, 0, TAU); c.fill();
    if (o.digits) {
      c.font = "700 " + R * 0.16 + "px Fraunces,Georgia,serif"; c.fillStyle = "#fff6dd";
      var dg = pt(cx, cy, R * 0.3, ah + Math.PI); c.fillText(pad(Math.floor(t / 60) % 24) + ":" + pad(Math.floor(t % 60)), dg[0], dg[1]);
    }
    c.restore();
  }

  // ---------- sun (NOAA) ----------
  function solar(ms, lat, lon) {
    var jd = ms / 86400000 + 2440587.5, T2 = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T2 * (36000.76983 + T2 * 0.0003032)) % 360;
    var M = 357.52911 + T2 * (35999.05029 - 0.0001537 * T2);
    var e = 0.016708634 - T2 * (0.000042037 + 0.0000001267 * T2);
    var C = Math.sin(rad(M)) * (1.914602 - T2 * (0.004817 + 0.000014 * T2)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T2) + Math.sin(rad(3 * M)) * 0.000289;
    var om = 125.04 - 1934.136 * T2, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(om));
    var eps = 23 + (26 + (21.448 - T2 * (46.815 + T2 * (0.00059 - T2 * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(rad(om));
    var dec = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lam))));
    var y = Math.pow(Math.tan(rad(eps / 2)), 2);
    var eot = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
    var utc = ((ms / 60000) % 1440 + 1440) % 1440, ha = (utc + eot + 4 * lon) / 4 - 180;
    var alt = deg(Math.asin(Math.sin(rad(lat)) * Math.sin(rad(dec)) + Math.cos(rad(lat)) * Math.cos(rad(dec)) * Math.cos(rad(ha))));
    var noon = 720 - 4 * lon - eot + 420;
    var cosH = (Math.cos(rad(90.833)) - Math.sin(rad(lat)) * Math.sin(rad(dec))) / (Math.cos(rad(lat)) * Math.cos(rad(dec)));
    var hd = deg(Math.acos(Math.max(-1, Math.min(1, cosH))));
    return { alt: alt, dec: dec, eot: eot, noon: noon, rise: noon - 4 * hd, set: noon + 4 * hd };
  }
  function fmtMin(t) { t = ((t % 1440) + 1440) % 1440; var h = Math.floor(t / 60), m = Math.round(t - h * 60); if (m === 60) { h++; m = 0; } return pad(h % 24) + ":" + pad(m); }

  // ---------- hero ----------
  var scene = $("scene"), heroOn = true, stars = [];
  for (var si = 0; si < 140; si++) stars.push([Math.random(), Math.random(), Math.random()]);
  function heroLayout(w, h) {
    if (CARD) return { cx: w * 0.79, cy: h * 0.56, R: h * 0.3 };
    if (w >= 860) { var R = Math.min(h * 0.33, w * 0.2); return { cx: w * 0.745, cy: h * 0.53, R: R }; }
    var R2 = Math.min(w, 620) * 0.31; return { cx: w / 2, cy: h - R2 * 1.5 - 4, R: R2 };
  }
  function drawHero() {
    if (!scene) return;
    var f = fit(scene), c = f.c, w = f.w, h = f.h, n = thaiNow(), cm = CITIES[2];
    var s = solar(n.ms, cm[3], cm[4]), k = Math.max(0, Math.min(1, (s.alt + 8) / 30));
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix("#0b0a24", "#1f4f9e", k)); g.addColorStop(1, mix("#1d1b55", "#5d8fd6", k));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (k < 0.6) { c.fillStyle = "#fff"; stars.forEach(function (st) { c.globalAlpha = (1 - k / 0.6) * (0.25 + 0.6 * st[2]); c.fillRect(st[0] * w, st[1] * h * 0.85, 1.4, 1.4); }); c.globalAlpha = 1; }
    var L = heroLayout(w, h);
    c.fillStyle = "rgba(11,10,36,.35)"; c.beginPath(); c.arc(L.cx, L.cy, L.R * 1.62, 0, TAU); c.fill();
    drawDial(c, L.cx, L.cy, L.R, n.min, { digits: true });
  }
  function mix(a, b, k) {
    var p = function (s, i) { return parseInt(s.substr(1 + 2 * i, 2), 16); };
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(p(a, i) + (p(b, i) - p(a, i)) * k); }).join(",") + ")";
  }
  function heroText() {
    var o = say(Math.floor(thaiNow().min));
    $("nowth").textContent = o.th; $("nowro").textContent = o.ro;
    $("nowen").textContent = o.hh + (EN ? " · " + o.en : " · " + o.wr);
    var rows = document.querySelectorAll(".hrs-t tbody tr");
    rows.forEach(function (r, i) { r.classList.toggle("on", (i + 1) % 24 === o.h); });
  }
  if (scene) { onVisible(scene, function (v) { heroOn = v; if (v) drawHero(); }); drawHero(); heroText(); }

  // ---------- say any time ----------
  var saycv = $("saycv"), sayr = $("sayr"), sayT = 870;
  function setSay(t, fromRange) {
    sayT = ((Math.round(t) % 1440) + 1440) % 1440;
    if (!fromRange && sayr) sayr.value = sayT;
    var o = say(sayT);
    $("sayth").textContent = o.th; $("sayro").textContent = o.ro; $("sayen").textContent = o.hh + " · " + o.en;
    $("saalt").innerHTML = o.alt ? esc(o.alt) + " <i>" + esc(o.altro) + "</i>" : "–";
    $("sa1900").innerHTML = esc(o.p19) + " <i>" + esc(o.p19r) + "</i>";
    $("saradio").innerHTML = esc(o.rad) + " <i>" + esc(o.radr) + "</i>";
    $("sawr").textContent = o.wr;
    $("salan").innerHTML = esc(o.lan) + " <i>" + esc(o.lanro) + "</i>";
    drawSay();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function sayGeom() { var f = fit(saycv); return { f: f, cx: f.w / 2, cy: f.h / 2, R: Math.min(f.w, f.h) * 0.34 }; }
  function drawSay() {
    if (!saycv) return;
    var G = sayGeom(), c = G.f.c;
    c.clearRect(0, 0, G.f.w, G.f.h);
    drawDial(c, G.cx, G.cy, G.R, sayT, { digits: true });
  }
  if (saycv) {
    var drag = false;
    var fromPtr = function (e) {
      var r = saycv.getBoundingClientRect(), G = { cx: r.width / 2, cy: r.height / 2 };
      var a = Math.atan2(e.clientX - r.left - G.cx, -(e.clientY - r.top - G.cy));
      var t = (a / TAU + 0.5) * 1440; setSay(Math.round(t / 5) * 5);
    };
    saycv.addEventListener("pointerdown", function (e) { drag = true; saycv.setPointerCapture(e.pointerId); fromPtr(e); });
    saycv.addEventListener("pointermove", function (e) { if (drag) fromPtr(e); });
    saycv.addEventListener("pointerup", function () { drag = false; });
    saycv.addEventListener("pointercancel", function () { drag = false; });
    sayr.addEventListener("input", function () { setSay(+sayr.value, true); });
    $("saynow").addEventListener("click", function () { setSay(Math.floor(thaiNow().min)); });
    $("sayhear").addEventListener("click", function () { var x = H[Math.floor(sayT / 60)]; ring(x.ring[1], x.ring[0]); });
    setSay(FIX != null ? FIX : 870);
  }

  // ---------- gong and drum ----------
  var sndcv = $("soundcv"), sndOn = false, raf = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function amp(kind, now) {
    var a = 0; HITS.forEach(function (hh) { if (hh.k === kind) { var dt = (now - hh.t) / 1000; a += Math.exp(-dt * (kind === "drum" ? 4 : 1.1)) * (dt >= 0 ? 1 : 0); } });
    return Math.min(1.6, a);
  }
  function drawSound(now) {
    var f = fit(sndcv), c = f.c, w = f.w, h = f.h;
    c.fillStyle = "#14123a"; c.fillRect(0, 0, w, h);
    var ag = amp("gong", now), ad = amp("drum", now), ah = amp("horn", now), ab = amp("bell", now), t = now / 1000;
    // gong on a frame
    var gx = w * 0.29, gy = h * 0.52, gr = Math.min(w * 0.16, h * 0.3);
    c.strokeStyle = "#8a5a2b"; c.lineWidth = Math.max(4, gr * 0.07); c.lineCap = "round";
    c.beginPath(); c.moveTo(gx - gr * 1.35, h * 0.95); c.lineTo(gx - gr * 0.9, gy - gr * 1.35); c.lineTo(gx + gr * 0.9, gy - gr * 1.35); c.lineTo(gx + gr * 1.35, h * 0.95); c.stroke();
    var sw = RM ? 0 : Math.sin(t * 5) * 0.05 * ag;
    c.save(); c.translate(gx, gy - gr * 1.35); c.rotate(sw);
    c.strokeStyle = "#d9c39a"; c.lineWidth = 2; c.beginPath(); c.moveTo(-gr * 0.3, 0); c.lineTo(0, gr * 0.32); c.lineTo(gr * 0.3, 0); c.stroke();
    c.translate(0, gr * 1.35);
    var gg = c.createRadialGradient(-gr * 0.3, -gr * 0.3, gr * 0.1, 0, 0, gr);
    gg.addColorStop(0, "#ffe9a8"); gg.addColorStop(0.55, "#d9a43a"); gg.addColorStop(1, "#7a5212");
    c.fillStyle = gg; c.beginPath(); c.arc(0, 0, gr, 0, TAU); c.fill();
    c.strokeStyle = "rgba(60,35,5,.6)"; c.lineWidth = gr * 0.05; c.beginPath(); c.arc(0, 0, gr * 0.93, 0, TAU); c.stroke();
    for (var i = 0; i < 4 && ag > 0.02; i++) {
      var ph = ((t * 0.9 + i / 4) % 1), rr = gr * (0.3 + ph * 0.62);
      c.strokeStyle = "rgba(255,240,190," + (0.55 * ag * (1 - ph)) + ")"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
    }
    var bg = c.createRadialGradient(-gr * 0.08, -gr * 0.08, 1, 0, 0, gr * 0.26);
    bg.addColorStop(0, "#fff3c4"); bg.addColorStop(1, "#b9831f");
    c.fillStyle = bg; c.beginPath(); c.arc(0, 0, gr * 0.26, 0, TAU); c.fill();
    c.restore();
    // drum
    var dx = w * 0.76, dy = h * 0.4, dw = Math.min(w * 0.14, h * 0.27), dh = dw * 1.1, ey = dw * 0.32;
    var dip = RM ? 0 : ad * ey * 0.35 * Math.cos(t * 40) * Math.exp(-0.2);
    var body = c.createLinearGradient(dx - dw, 0, dx + dw, 0);
    body.addColorStop(0, "#5b1b1b"); body.addColorStop(0.45, "#b8433a"); body.addColorStop(1, "#4a1414");
    c.fillStyle = body; c.beginPath();
    c.moveTo(dx - dw, dy); c.bezierCurveTo(dx - dw * 1.18, dy + dh * 0.35, dx - dw * 1.18, dy + dh * 0.65, dx - dw, dy + dh);
    c.ellipse(dx, dy + dh, dw, ey, 0, Math.PI, 0, true);
    c.bezierCurveTo(dx + dw * 1.18, dy + dh * 0.65, dx + dw * 1.18, dy + dh * 0.35, dx + dw, dy);
    c.closePath(); c.fill();
    c.fillStyle = "#f2d7a6";
    for (var j = 0; j < 14; j++) { var aa = Math.PI * (j / 13); c.beginPath(); c.arc(dx - Math.cos(aa) * dw * 0.98, dy + Math.sin(aa) * ey * 0.98 + 4, 2.4, 0, TAU); c.fill(); }
    var mem = c.createRadialGradient(dx, dy + dip, 2, dx, dy, dw);
    mem.addColorStop(0, "#fbe8c4"); mem.addColorStop(1, "#d9b781");
    c.fillStyle = mem; c.beginPath(); c.ellipse(dx, dy, dw, ey, 0, 0, TAU); c.fill();
    c.strokeStyle = "#6b3a1a"; c.lineWidth = 3; c.stroke();
    for (var k2 = 1; k2 <= 3 && ad > 0.03; k2++) { c.strokeStyle = "rgba(120,60,20," + 0.5 * ad / k2 + ")"; c.lineWidth = 2; c.beginPath(); c.ellipse(dx, dy + dip * 0.4, dw * k2 / 4, ey * k2 / 4, 0, 0, TAU); c.stroke(); }
    c.strokeStyle = "#3b2312"; c.lineWidth = 6; c.beginPath(); c.moveTo(dx - dw * 0.9, dy + dh + ey); c.lineTo(dx - dw * 1.3, h * 0.97); c.moveTo(dx + dw * 0.9, dy + dh + ey); c.lineTo(dx + dw * 1.3, h * 0.97); c.stroke();
    // horn and bell, small
    if (ah > 0.02 || ab > 0.02) {
      c.globalAlpha = Math.min(1, ah + ab);
      c.fillStyle = ah > ab ? "#e9dcc0" : "#ffd75e";
      c.font = "700 " + Math.max(14, h * 0.07) + "px " + FONT_TH; c.textAlign = "center";
      c.fillText(ah > ab ? U.lang === "en" ? "ตูด · horn" : "ตูด" : "ตี", w * 0.5, h * 0.12);
      c.globalAlpha = 1;
    }
  }

  // ---------- coconut ----------
  var coco = $("cococv"), cocoOn = false, speed = 60, tau = 0, sticks = 0, sinkAt = -1, lastT = 0;
  // Model (radius 1): bowl volume V(y) = π y²(3 − y)/3. The shell floats: outside cap V(d) = Vs + V(y).
  // Torricelli: dV/dt ∝ √(d − y). Sinks when the rim reaches the water (d = 1). Integrated once, normalised to 60 min.
  var VT = 2 * Math.PI / 3, VS = 0.24 * VT, CAP = function (y) { return Math.PI * y * y * (3 - y) / 3; };
  function yOf(V) { var lo = 0, hi = 1; for (var i = 0; i < 40; i++) { var m = (lo + hi) / 2; if (CAP(m) < V) lo = m; else hi = m; } return (lo + hi) / 2; }
  var TABLE = (function () {
    var N = 600, Vend = VT - VS, out = [{ tm: 0, y: 0, d: yOf(VS) }], tm = 0;
    for (var i = 1; i <= N; i++) {
      var V = Vend * i / N, Vm = Vend * (i - 0.5) / N, y = yOf(Vm), d = yOf(Vm + VS);
      tm += (Vend / N) / Math.sqrt(Math.max(1e-6, d - y));
      out.push({ tm: tm, y: yOf(V), d: yOf(V + VS) });
    }
    out.forEach(function (p) { p.tm /= tm; });
    return out;
  })();
  function cocoAt(f) { var a = 0, b = TABLE.length - 1; while (b - a > 1) { var m = (a + b) >> 1; if (TABLE[m].tm < f) a = m; else b = m; } var p = TABLE[a], q = TABLE[b], k = (f - p.tm) / ((q.tm - p.tm) || 1); return { y: p.y + (q.y - p.y) * k, d: p.d + (q.d - p.d) * k }; }
  var NOTCH = []; for (var nk = 1; nk <= 9; nk++) NOTCH.push(cocoAt(nk / 10).y);
  function cocoInit() { var n = thaiNow().min; tau = (n % 60) / 60; sticks = ((Math.floor(n / 60) - 6) % 12 + 12) % 12; }
  function drawCoco(now) {
    var f = fit(coco), c = f.c, w = f.w, h = f.h;
    c.fillStyle = "#14123a"; c.fillRect(0, 0, w, h);
    // rail with sticks
    var ry = h * 0.11, rx0 = w * 0.12, rx1 = w * 0.88;
    c.strokeStyle = "#b07a3c"; c.lineWidth = 5; c.beginPath(); c.moveTo(rx0, ry); c.lineTo(rx1, ry); c.stroke();
    for (var i = 0; i < 12; i++) {
      var sx = rx0 + (i + 0.5) * (rx1 - rx0) / 12;
      c.strokeStyle = i < sticks ? "#f2d27a" : "rgba(255,255,255,.12)"; c.lineWidth = 4; c.lineCap = "round";
      c.beginPath(); c.moveTo(sx, ry - h * 0.06); c.lineTo(sx, ry + h * 0.02); c.stroke();
    }
    // basin
    var wl = h * 0.52, bx0 = w * 0.08, bx1 = w * 0.92, bb = h * 0.95;
    c.fillStyle = "#3f2a1a"; c.beginPath(); c.moveTo(bx0 - 8, wl - h * 0.08); c.lineTo(bx0 + 10, bb); c.lineTo(bx1 - 10, bb); c.lineTo(bx1 + 8, wl - h * 0.08); c.lineTo(bx1, wl - h * 0.08); c.lineTo(bx1 - 16, bb - 8); c.lineTo(bx0 + 16, bb - 8); c.lineTo(bx0, wl - h * 0.08); c.closePath(); c.fill();
    var wg = c.createLinearGradient(0, wl, 0, bb); wg.addColorStop(0, "rgba(90,160,220,.75)"); wg.addColorStop(1, "rgba(30,70,140,.9)");
    // shell
    var r = Math.min(w, h) * 0.22, cx = w / 2, st = cocoAt(Math.min(1, tau)), sinkK = 0;
    if (sinkAt >= 0) { sinkK = Math.min(1, (now - sinkAt) / 1300); }
    var d = st.d + sinkK * 1.6, y = st.y + (1 - st.y) * Math.min(1, sinkK * 3);
    var bottom = wl + d * r, cyS = bottom - r; // centre of the sphere = rim height
    // water behind
    c.fillStyle = wg; c.fillRect(bx0 + 12, wl, bx1 - bx0 - 24, bb - wl - 8);
    // shell outside
    c.save(); c.translate(cx, cyS); c.rotate(sinkK * 0.5);
    c.fillStyle = "#6b4426"; c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = "#3a2414"; c.beginPath(); c.arc(0, 0, r * 0.93, 0, Math.PI); c.closePath(); c.fill();
    // water inside, height y (fraction of r) above the bottom
    if (y > 0.002) {
      var hy = r * 0.93 * (1 - y), xw = Math.sqrt(Math.max(0, 1 - (1 - y) * (1 - y))) * r * 0.93;
      c.fillStyle = "rgba(110,180,235,.9)"; c.beginPath(); c.moveTo(-xw, hy);
      c.arc(0, 0, r * 0.93, Math.asin(Math.min(1, hy / (r * 0.93))), Math.PI - Math.asin(Math.min(1, hy / (r * 0.93)))); c.closePath(); c.fill();
    }
    // notches at equal times
    c.strokeStyle = "#f2d27a"; c.lineWidth = 2;
    NOTCH.forEach(function (ny) {
      var yy = r * 0.93 * (1 - ny), xx = Math.sqrt(Math.max(0, 1 - (1 - ny) * (1 - ny))) * r * 0.93;
      c.beginPath(); c.moveTo(-xx, yy); c.lineTo(-xx + r * 0.1, yy); c.moveTo(xx, yy); c.lineTo(xx - r * 0.1, yy); c.stroke();
    });
    c.fillStyle = "#14123a"; c.beginPath(); c.arc(0, r * 0.965, r * 0.035, 0, TAU); c.fill();
    c.restore();
    // water in front (surface line)
    c.fillStyle = "rgba(60,120,190,.35)"; c.fillRect(bx0 + 12, wl, bx1 - bx0 - 24, bb - wl - 8);
    c.strokeStyle = "rgba(200,230,255,.8)"; c.lineWidth = 2; c.beginPath();
    for (var x = bx0 + 12; x <= bx1 - 12; x += 6) { var yy2 = wl + (RM ? 0 : Math.sin(x * 0.05 + now / 600) * 1.4); x === bx0 + 12 ? c.moveTo(x, yy2) : c.lineTo(x, yy2); }
    c.stroke();
    // readouts
    var b = Math.min(9, Math.floor(tau * 10));
    $("cbat").textContent = sinkAt >= 0 ? "10" : b + " / 10"; $("cmin").textContent = sinkAt >= 0 ? "60" : String(Math.floor(tau * 60)); $("cstk").textContent = sticks + " / 12";
  }
  function stepCoco(now) {
    var dt = lastT ? Math.min(0.25, (now - lastT) / 1000) : 0; lastT = now;
    if (sinkAt >= 0) {
      if (now - sinkAt > 1600) { sinkAt = -1; tau = 0; sticks = sticks >= 12 ? 1 : sticks + 1; }
      return;
    }
    if (speed === 1 && FIX == null) tau = (thaiNow().min % 60) / 60; else tau += dt * speed / 3600;
    if (tau >= 1) { sinkAt = now; tau = 1; if (AC && speed > 1) { gong(AC.currentTime + 0.05, 150); } }
  }

  // ---------- frame loop ----------
  function frame(now) {
    raf = 0;
    var more = false;
    HITS = HITS.filter(function (hh) { return now - hh.t < 7000; });
    if (sndcv && sndOn) { drawSound(now); if (HITS.length) more = true; }
    if (coco && cocoOn) { stepCoco(now); drawCoco(now); more = true; }
    if (more) raf = requestAnimationFrame(frame);
  }
  if (sndcv) {
    onVisible(sndcv, function (v) { sndOn = v; if (v) { drawSound(performance.now()); } });
    var bind = function (id, fn) { $(id).addEventListener("click", function () { var a = ac(); if (a) fn(a.currentTime + 0.05); }); };
    bind("sgong", function (t) { gong(t); }); bind("sdrum", function (t) { drum(t); }); bind("sroll", function (t) { roll(t); }); bind("shorn", function (t) { horn(t); });
  }
  if (coco) {
    cocoInit();
    onVisible(coco, function (v) { cocoOn = v; lastT = 0; if (v) kick(); });
    document.querySelectorAll("[data-sp]").forEach(function (b) {
      b.addEventListener("click", function () {
        speed = +b.dataset.sp; ac();
        document.querySelectorAll("[data-sp]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        if (speed === 1) cocoInit();
      });
    });
    drawCoco(performance.now());
  }

  // ---------- quiz ----------
  var Q = { i: 0, score: 0, list: [] };
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function group(h) { var k = h === 0 ? 6 : ((h - 1) % 6) + 1; return [k % 24, (k + 6) % 24, (k + 12) % 24, (k + 18) % 24]; }
  function newQuiz() {
    var hrs = shuffle([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 0, 12, 6, 18]).slice(0, 8);
    Q.list = hrs.map(function (h, i) { return { h: h, m: Math.random() < 0.3 ? 30 : 0, type: i % 2 ? "say" : "time" }; });
    Q.i = 0; Q.score = 0; showQ();
  }
  function showQ() {
    var q = Q.list[Q.i], o = say(q.h * 60 + q.m), qq = $("qq"), qa = $("qa");
    $("qn").textContent = (Q.i + 1) + " / " + Q.list.length; $("qs").textContent = Q.score; $("qf").textContent = "";
    $("qnext").hidden = true;
    if (q.type === "time") qq.innerHTML = esc(U.q_which_time) + " <b lang=\"th\">" + esc(o.th) + "</b>" + (EN ? " <i>" + esc(o.ro) + "</i>" : "") + "?";
    else qq.innerHTML = esc(U.q_which_say) + " <b>" + o.hh + "</b>?";
    qa.innerHTML = "";
    shuffle(group(q.h)).forEach(function (h) {
      var a = say(h * 60 + q.m), bt = document.createElement("button"); bt.type = "button";
      if (q.type === "time") bt.textContent = a.hh; else { bt.innerHTML = '<span lang="th">' + esc(a.th) + "</span>" + (EN ? "<small>" + esc(a.ro) + "</small>" : ""); }
      bt.addEventListener("click", function () {
        var ok = h === q.h;
        qa.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
        bt.classList.add(ok ? "ok" : "no");
        if (ok) { Q.score++; $("qf").textContent = U.q_right; }
        else { $("qf").textContent = U.q_wrong + " " + (q.type === "time" ? o.hh : o.th) + "."; qa.querySelectorAll("button")[shuffleIdx(qa, q, o)].classList.add("ok"); }
        $("qs").textContent = Q.score;
        var last = Q.i === Q.list.length - 1;
        $("qnext").textContent = last ? U.q_again : U.q_next; $("qnext").hidden = false;
        if (last) $("qf").textContent += " " + U.q_done + ": " + Q.score + " / " + Q.list.length;
        var x = H[h]; if (ok) ring(x.ring[1], Math.min(2, x.ring[0] || 1));
      });
      bt.dataset.h = h; qa.appendChild(bt);
    });
  }
  function shuffleIdx(qa, q) { var bs = qa.querySelectorAll("button"); for (var i = 0; i < bs.length; i++) if (+bs[i].dataset.h === q.h) return i; return 0; }
  if ($("qa")) {
    $("qnext").addEventListener("click", function () { if (Q.i >= Q.list.length - 1) newQuiz(); else { Q.i++; showQ(); } });
    newQuiz();
  }

  // ---------- Lanna ----------
  var lcv = $("lanncv");
  function drawLanna() {
    if (!lcv) return;
    var f = fit(lcv), c = f.c, w = f.w, h = f.h, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36, rw = R * 0.28;
    var n = thaiNow().min, cur = say(Math.floor(n)).w;
    c.fillStyle = "#14123a"; c.fillRect(0, 0, w, h);
    c.textAlign = "center"; c.textBaseline = "middle";
    for (var i = 0; i < 16; i++) {
      var t0 = 360 + i * 90, a0 = ang(t0) - Math.PI / 2, a1 = ang(t0 + 90) - Math.PI / 2, dayW = i < 8;
      c.strokeStyle = i === cur ? "#fff6dd" : dayW ? (i % 2 ? "#ffb347" : "#ffc94d") : (i % 2 ? "#7b5cd6" : "#a67cff");
      c.lineWidth = rw; c.beginPath(); c.arc(cx, cy, R, a0 + 0.01, a1 - 0.01); c.stroke();
      var mid = ang(t0 + 45), p = pt(cx, cy, R, mid), kind = i % 4;
      glyph(c, p[0], p[1], rw * 0.32, kind, i === cur ? "#14123a" : dayW ? "#3a2108" : "#f3eccf");
      var lp = pt(cx, cy, R + rw * 0.5 + R * 0.12, ang(t0));
      c.fillStyle = "rgba(255,246,221,.75)"; c.font = "600 " + Math.max(10, R * 0.075) + "px " + FONT_TH;
      if (i % 2 === 0) c.fillText(fmtMin(t0), lp[0], lp[1]);
    }
    var ah = ang(n), tip = pt(cx, cy, R + rw * 0.5, ah);
    c.strokeStyle = "#fff6dd"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(tip[0], tip[1]); c.stroke();
    c.fillStyle = "#fff6dd"; c.beginPath(); c.arc(cx, cy, 5, 0, TAU); c.fill();
    c.font = "600 " + Math.max(12, R * 0.09) + "px " + FONT_TH; c.fillStyle = "rgba(255,246,221,.7)"; c.fillText(U.l_now, cx, cy - R * 0.36);
    c.font = "700 " + Math.max(15, R * 0.15) + "px " + FONT_SERIF; c.fillStyle = "#ffc94d";
    var nm = LAN[cur][0].replace(/^ยาม/, ""), parts = nm.split(" · ");
    c.fillText("ยาม" + parts[0], cx, cy + R * 0.02);
    c.font = "500 " + Math.max(11, R * 0.08) + "px " + FONT_TH; c.fillStyle = "rgba(255,246,221,.8)";
    c.fillText(fmtMin(360 + cur * 90) + "–" + fmtMin(450 + cur * 90), cx, cy + R * 0.24);
    document.querySelectorAll(".lan li").forEach(function (li) { li.classList.toggle("on", +li.dataset.w === cur); });
  }
  function glyph(c, x, y, s, kind, col) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.5, s * 0.22); c.lineCap = "round";
    if (kind === 0) { c.beginPath(); c.arc(-s * 0.2, s * 0.6, s * 1.1, -Math.PI * 0.62, -Math.PI * 0.02); c.stroke(); c.beginPath(); c.arc(s * 0.85, s * 0.55, s * 0.28, 0, TAU); c.fill(); }      // buffalo horn
    else if (kind === 1) { c.beginPath(); c.ellipse(0, -s * 0.45, s * 0.75, s * 0.28, 0, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-s * 0.75, -s * 0.45); c.lineTo(-s * 0.6, s * 0.6); c.lineTo(s * 0.6, s * 0.6); c.lineTo(s * 0.75, -s * 0.45); c.stroke(); } // drum
    else if (kind === 2) { c.beginPath(); c.moveTo(-s, -s * 0.12); c.lineTo(s * 0.4, -s * 0.12); c.lineTo(s, -s * 0.6); c.lineTo(s, s * 0.6); c.lineTo(s * 0.4, s * 0.12); c.lineTo(-s, s * 0.12); c.closePath(); c.fill(); } // trumpet
    else { c.beginPath(); c.arc(0, 0, s * 0.35, 0, TAU); c.fill(); }
    c.restore();
  }

  // ---------- วันไท: two gears of 10 and 12 names ----------
  // Anchor: 1 Jan 2022 = กาบยี (stem 0, branch 2), from the 2022 Lanna calendar; it also gives 14–16 Apr 2022 as เมืองเร้า, เปิกเส็ด, กัดใค้.
  var gcv = $("gearcv"), ST = T.stems, BR = T.branches, ANCHOR = Date.UTC(2022, 0, 1);
  var gS = 0, gB = 0, gTS = 0, gTB = 0, gearRaf = 0, gearFirst = true, wdOff = 0;
  var mod = function (a, n) { return ((a % n) + n) % n; };
  function civil(off) { return new Date(thaiNow().ms + 7 * 3600e3 + off * 86400000); }
  function dayIndex(off) { var d = civil(off); return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ANCHOR) / 86400000); }
  function eraYear(off) {
    var d = civil(off), y = d.getUTCFullYear(), after = d.getUTCMonth() > 3 || (d.getUTCMonth() === 3 && d.getUTCDate() >= 16);
    var cs = y - 638 - (after ? 0 : 1), k = cs - 1384;           // CS 1384 = ปีเต่ายี
    return { cs: cs, s: mod(8 + k, 10), b: mod(2 + k, 12) };
  }
  function setWd(off) {
    wdOff = off;
    var n = dayIndex(off), s = mod(n, 10), b = mod(n + 2, 12);
    $("wdname").textContent = ST[s][0] + BR[b][0]; $("wdro").textContent = ST[s][1] + " " + BR[b][1];
    $("wddate").textContent = new Date(thaiNow().ms + off * 86400000).toLocaleDateString(EN ? "en-GB" : "th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", year: "numeric" });
    var y = eraYear(off);
    $("wyname").textContent = "ปี" + ST[y.s][0] + BR[y.b][0] + " · " + U.cs + " " + y.cs;
    $("wyro").textContent = ST[y.s][1] + " " + BR[y.b][1] + " · " + (EN ? BR[y.b][2] : BR[y.b][3]);
    gTS = n; gTB = n + 2;
    if (gearFirst || RM) { gS = gTS; gB = gTB; gearFirst = false; drawGear(); return; }
    if (!gearRaf) gearRaf = requestAnimationFrame(function step() {
      gS += (gTS - gS) * 0.16; gB += (gTB - gB) * 0.16;
      if (Math.abs(gTS - gS) < 0.003) { gS = gTS; gB = gTB; }
      drawGear(); gearRaf = gS !== gTS ? requestAnimationFrame(step) : 0;
    });
  }
  function drawGear() {
    if (!gcv) return;
    var f = fit(gcv), c = f.c, w = f.w, h = f.h, cx = w / 2, cy = h / 2 + h * 0.04, R = Math.min(w, h) * 0.43;
    c.fillStyle = "#14123a"; c.fillRect(0, 0, w, h);
    c.textAlign = "center"; c.textBaseline = "middle";
    var curB = mod(Math.round(gB), 12), curS = mod(Math.round(gS), 10);
    // outer ring: twelve last names
    c.strokeStyle = "rgba(166,124,255,.35)"; c.lineWidth = R * 0.36; c.beginPath(); c.arc(cx, cy, R * 0.82, 0, TAU); c.stroke();
    for (var i = 0; i < 12; i++) {
      var a = (i - gB) * TAU / 12, e0 = pt(cx, cy, R * 0.65, a + Math.PI / 12), e1 = pt(cx, cy, R * 0.99, a + Math.PI / 12);
      c.strokeStyle = "rgba(20,18,58,.8)"; c.lineWidth = 2; c.beginPath(); c.moveTo(e0[0], e0[1]); c.lineTo(e1[0], e1[1]); c.stroke();
      var on = i === curB && Math.abs(gB - Math.round(gB)) < 0.05, p = pt(cx, cy, R * 0.82, a), fz = Math.max(12, R * 0.1);
      c.fillStyle = on ? "#fff6dd" : "rgba(255,246,221,.8)"; c.font = (on ? "700 " : "600 ") + fz + "px " + FONT_TH;
      c.fillText(BR[i][0], p[0], p[1] - fz * 0.35);
      c.fillStyle = on ? "#ffc94d" : "rgba(196,189,224,.75)"; c.font = "500 " + Math.max(9, R * 0.06) + "px " + FONT_TH;
      c.fillText(EN ? BR[i][2] : BR[i][3], p[0], p[1] + fz * 0.55);
    }
    // inner gear: ten first names
    var r0 = R * 0.5, r1 = R * 0.6;
    c.beginPath();
    for (var k = 0; k < 10; k++) {
      var ak = (k - gS) * TAU / 10;
      [[-0.2, r0], [-0.12, r1], [0.12, r1], [0.2, r0]].forEach(function (q, j) { var pp = pt(cx, cy, q[1], ak + q[0]); (k || j) ? c.lineTo(pp[0], pp[1]) : c.moveTo(pp[0], pp[1]); });
    }
    c.closePath(); c.fillStyle = "#ffc94d"; c.fill();
    c.fillStyle = "#14123a"; c.beginPath(); c.arc(cx, cy, R * 0.12, 0, TAU); c.fill();
    for (var k2 = 0; k2 < 10; k2++) {
      var a2 = (k2 - gS) * TAU / 10, q = pt(cx, cy, R * 0.41, a2), on2 = k2 === curS && Math.abs(gS - Math.round(gS)) < 0.05;
      c.fillStyle = on2 ? "#14123a" : "rgba(58,33,8,.75)"; c.font = (on2 ? "700 " : "600 ") + Math.max(11, R * 0.085) + "px " + FONT_TH;
      c.save(); c.translate(q[0], q[1]); c.rotate(a2); c.fillText(ST[k2][0], 0, 0); c.restore();
    }
    // pointer
    c.fillStyle = "#fff6dd"; c.beginPath(); c.moveTo(cx, cy - R * 1.02); c.lineTo(cx - R * 0.06, cy - R * 1.12); c.lineTo(cx + R * 0.06, cy - R * 1.12); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,246,221,.5)"; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cx, cy - R * 1.02); c.lineTo(cx, cy - R * 0.3); c.stroke(); c.setLineDash([]);
    c.fillStyle = "#fff6dd"; c.font = "700 " + Math.max(12, R * 0.11) + "px Fraunces,Georgia,serif"; c.fillText("60", cx, cy);
  }
  if (gcv) {
    $("wdprev").addEventListener("click", function () { setWd(wdOff - 1); });
    $("wdnext").addEventListener("click", function () { setWd(wdOff + 1); });
    $("wdtoday").addEventListener("click", function () { setWd(0); });
    setWd(0);
  }

  // ---------- sun ----------
  var lonv = $("lonv"), skycv = $("skycv"), city = "cm";
  function cityRow(k) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === k) return CITIES[i]; return CITIES[2]; }
  function drawLon() {
    if (!lonv) return;
    var f = fit(lonv), c = f.c, w = f.w, h = f.h, n = thaiNow(), L0 = 97.2, L1 = 106.2, padX = 26;
    var X = function (lon) { return padX + (lon - L0) / (L1 - L0) * (w - 2 * padX); };
    var Y = function (lat) { return 30 + (20.6 - lat) / (20.6 - 7.2) * (h - 70); };
    c.fillStyle = "#14123a"; c.fillRect(0, 0, w, h);
    c.font = "600 13px " + FONT_TH; c.textBaseline = "alphabetic";
    for (var lo = 98; lo <= 106; lo++) { c.strokeStyle = "rgba(255,255,255,.07)"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(lo), 18); c.lineTo(X(lo), h - 26); c.stroke(); c.fillStyle = "rgba(255,246,221,.45)"; c.textAlign = "center"; c.fillText(lo + "°", X(lo), h - 8); }
    var xb = X(100.4945), xu = X(105);
    c.setLineDash([6, 5]); c.strokeStyle = "rgba(255,143,107,.85)"; c.lineWidth = 2; c.beginPath(); c.moveTo(xb, 18); c.lineTo(xb, h - 26); c.stroke(); c.setLineDash([]);
    c.strokeStyle = "#ffc94d"; c.lineWidth = 3; c.beginPath(); c.moveTo(xu, 18); c.lineTo(xu, h - 26); c.stroke();
    c.fillStyle = "#ffc94d"; c.textAlign = "right"; c.fillText(U.u_line, xu - 6, 16);
    c.fillStyle = "#ff8f6b"; c.textAlign = "left"; c.fillText(U.u_bmt, xb + 6, h - 30);
    c.strokeStyle = "rgba(255,246,221,.6)"; c.lineWidth = 1.5; var ay = h - 46;
    c.beginPath(); c.moveTo(xb + 4, ay); c.lineTo(xu - 4, ay); c.lineTo(xu - 12, ay - 5); c.moveTo(xu - 4, ay); c.lineTo(xu - 12, ay + 5); c.stroke();
    c.fillStyle = "rgba(255,246,221,.8)"; c.textAlign = "center"; c.fillText("+17 m 56 s", (xb + xu) / 2, ay - 7);
    CITIES.forEach(function (ct) {
      var s = solar(n.ms, ct[3], ct[4]), x = X(ct[4]), y = Y(ct[3]), on = ct[0] === city;
      c.fillStyle = on ? "#ffc94d" : "#fff6dd"; c.beginPath(); c.arc(x, y, on ? 7 : 5, 0, TAU); c.fill();
      c.font = (on ? "700 " : "600 ") + "14px " + FONT_TH; c.textAlign = x > w * 0.75 ? "right" : "left";
      var dx = x > w * 0.75 ? -10 : 10;
      c.fillText((EN ? ct[1] : ct[2]), x + dx, y - 2);
      c.fillStyle = on ? "#ffc94d" : "rgba(255,246,221,.7)"; c.font = "600 13px " + FONT_TH;
      c.fillText(U.noon + " " + fmtMin(s.noon), x + dx, y + 14);
    });
  }
  function hand(c, x, y, s, col, label) {
    c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = col; c.lineCap = "round"; c.lineWidth = s * 0.22;
    c.beginPath(); c.ellipse(0, s * 0.25, s * 0.42, s * 0.48, 0, 0, TAU); c.fill();
    [-0.3, -0.1, 0.1, 0.3].forEach(function (k, i) { c.beginPath(); c.moveTo(k * s, 0); c.lineTo(k * s * 1.25, -s * (0.55 + (i === 1 || i === 2 ? 0.15 : 0))); c.stroke(); });
    c.beginPath(); c.moveTo(-s * 0.35, s * 0.25); c.lineTo(-s * 0.75, -s * 0.05); c.stroke();
    if (label) { c.fillStyle = "#14123a"; c.font = "700 " + s * 0.5 + "px " + FONT_TH; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 0, s * 0.3); }
    c.restore();
  }
  function drawSky() {
    if (!skycv) return;
    var ct = cityRow(city), f = fit(skycv), c = f.c, w = f.w, h = f.h, n = thaiNow();
    var day0 = n.ms - n.min * 60e3, s = solar(n.ms, ct[3], ct[4]);
    var T0 = 300, T1 = 1170, X = function (t) { return 20 + (t - T0) / (T1 - T0) * (w - 40); }, hz = h * 0.78, Y = function (alt) { return hz - alt / 90 * (hz - 18); };
    var k = Math.max(0, Math.min(1, (solar(n.ms, ct[3], ct[4]).alt + 6) / 20));
    var g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, mix("#0b0a24", "#2e6bc4", k)); g.addColorStop(1, mix("#1d1b55", "#9cc8f0", k));
    c.fillStyle = g; c.fillRect(0, 0, w, hz);
    c.fillStyle = "#1e3a2a"; c.fillRect(0, hz, w, h - hz);
    // clock ticks
    c.font = "600 12px " + FONT_TH; c.textAlign = "center"; c.fillStyle = "rgba(255,246,221,.7)";
    for (var tt = 360; tt <= 1080; tt += 180) { c.fillText(fmtMin(tt), X(tt), hz + 18); }
    c.setLineDash([4, 4]); c.strokeStyle = "rgba(255,246,221,.5)"; c.beginPath(); c.moveTo(X(720), 10); c.lineTo(X(720), hz); c.stroke(); c.setLineDash([]);
    c.strokeStyle = "#ffc94d"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(s.noon), 10); c.lineTo(X(s.noon), hz); c.stroke();
    // path
    c.strokeStyle = "rgba(255,215,94,.7)"; c.lineWidth = 2.5; c.beginPath(); var first = true;
    for (var t = Math.max(T0, s.rise - 10); t <= Math.min(T1, s.set + 10); t += 5) { var al = solar(day0 + t * 60e3, ct[3], ct[4]).alt; var px = X(t), py = Y(Math.max(-2, al)); first ? c.moveTo(px, py) : c.lineTo(px, py); first = false; }
    c.stroke();
    // hand-spans: one per hour after sunrise up to noon, one per hour before sunset after noon
    for (var i = 1; i <= 6; i++) {
      var tm = s.rise + i * 60, ta = s.set - i * 60;
      if (tm <= s.noon + 1) { var am = solar(day0 + tm * 60e3, ct[3], ct[4]).alt; hand(c, X(tm), Y(am) + 18, 16, "rgba(255,246,221,.85)", String(i)); }
      if (ta >= s.noon - 1 && i < 6) { var aa = solar(day0 + ta * 60e3, ct[3], ct[4]).alt; hand(c, X(ta), Y(aa) + 18, 16, "rgba(255,246,221,.55)", String(i)); }
    }
    // sun now
    if (n.min >= T0 && n.min <= T1) { var sa = s.alt; if (sa > -1) drawSun(c, X(n.min), Y(sa), 11); }
    $("urise").textContent = fmtMin(s.rise); $("unoon").textContent = fmtMin(s.noon); $("uset").textContent = fmtMin(s.set);
    var sp;
    if (n.min < s.rise || n.min > s.set) sp = U.u_down;
    else if (n.min <= s.noon) sp = ((n.min - s.rise) / 60).toFixed(1) + " " + U.spans;
    else sp = ((s.set - n.min) / 60).toFixed(1) + " " + U.spans;
    $("uspan").textContent = sp;
  }
  document.querySelectorAll("[data-city]").forEach(function (b) {
    b.addEventListener("click", function () {
      city = b.dataset.city;
      document.querySelectorAll("[data-city]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      drawLon(); drawSky();
    });
  });

  // ---------- ticks, resize ----------
  function all() { if (heroOn) drawHero(); if (scene) heroText(); drawSay(); drawLanna(); drawGear(); drawLon(); drawSky(); if (sndcv) drawSound(performance.now()); }
  var rz = 0; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(all, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
  all();
  if (FIX == null && !CARD) setInterval(function () { if (heroOn) drawHero(); heroText(); drawLanna(); drawLon(); drawSky(); }, 15000);
})();
