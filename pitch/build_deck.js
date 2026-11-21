// Synapsis pitch deck (6 slides, 16:9) for CDTM Valencia Hacks 2026 - Sherpas challenge.
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fi = require("react-icons/fi");
const {applyTheme} = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const THEME = {
  name: "Synapsis",
  headFontFace: "Inter", bodyFontFace: "Inter",
  colors: {
    dk1: "1B2A2A", lt1: "FFFFFF", dk2: "0B4F48", lt2: "F6F7F5",
    accent1: "0F6E64", accent2: "E8A33D", accent3: "E4F0ED", accent4: "5A6A68",
    accent5: "B9D8D2", accent6: "FCEFD4", hlink: "0F6E64", folHlink: "0B4F48",
  },
};
const HEX = THEME.colors;
const OUT = process.argv[2] || "Synapsis_pitch.pptx";

async function icon(Comp, color, px = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, {color: "#" + color, size: px, strokeWidth: 1.8}));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";               // 10 x 5.625 in
  pres.title = "Synapsis - pitch deck";
  pres.author = "Team [Team name]";
  pres.theme = {headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace};
  const C = pres.SchemeColor;

  // ---------- layouts ----------
  pres.defineSlideMaster({
    title: "Title dark", background: {color: HEX.dk2},
    objects: [
      {placeholder: {options: {name: "title", type: "title", x: 0.7, y: 1.35, w: 6.2, h: 1.2, fontSize: 60, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0}, text: ""}},
      {placeholder: {options: {name: "body", type: "body", x: 0.7, y: 2.6, w: 6.0, h: 0.8, fontSize: 22, color: C.accent5, valign: "top", align: "left", margin: 0}, text: ""}},
    ],
  });
  pres.defineSlideMaster({
    title: "Content", background: {color: HEX.lt2},
    objects: [
      {placeholder: {options: {name: "title", type: "title", x: 0.6, y: 0.4, w: 8.8, h: 0.9, fontSize: 30, bold: true, color: C.text1, valign: "top", align: "left", margin: 0}, text: ""}},
    ],
    slideNumber: {x: 9.25, y: 5.2, w: 0.4, h: 0.25, fontSize: 9, color: HEX.accent4, align: "right"},
  });

  // ---------- 1. Title ----------
  pres.addSection({title: "Opening"});
  let s = pres.addSlide({masterName: "Title dark", sectionTitle: "Opening"});
  s.addText("Synapsis", {placeholder: "title"});
  s.addText("Every family hears it from their advisor first.", {placeholder: "body"});
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: 0.7, y: 3.6, w: 2.55, h: 0.6, rectRadius: 0.3, fill: {color: C.accent2}, line: {color: C.accent2},
    hyperlink: {url: "https://example.com/replace-with-video-link", tooltip: "[VIDEO LINK]"}, objectName: "Video button"});
  s.addImage({data: await icon(Fi.FiPlayCircle, HEX.dk1), x: 0.9, y: 3.74, w: 0.32, h: 0.32, objectName: "Play icon"});
  s.addText("Watch our video", {x: 1.3, y: 3.6, w: 1.9, h: 0.6, fontSize: 16, bold: true, color: C.text1, valign: "middle", margin: 0, isTextBox: true,
    hyperlink: {url: "https://example.com/replace-with-video-link", tooltip: "[VIDEO LINK]"}});
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: 7.55, y: 1.6, w: 1.75, h: 1.75, rectRadius: 0.12, fill: {color: C.background1}, line: {color: C.background1}, objectName: "QR placeholder"});
  s.addText([{text: "QR code", options: {bold: true, breakLine: true}}, {text: "→ [VIDEO LINK]"}], {x: 7.55, y: 1.6, w: 1.75, h: 1.75, fontSize: 11, color: C.accent4, align: "center", valign: "middle", isTextBox: true});
  s.addText("Scan to watch", {x: 7.55, y: 3.45, w: 1.75, h: 0.3, fontSize: 11, color: C.accent5, align: "center", margin: 0, isTextBox: true});
  s.addText("[Team name]  ·  CDTM Valencia Hacks 2026  ·  Sherpas challenge", {x: 0.7, y: 4.85, w: 8.6, h: 0.3, fontSize: 11, color: C.accent5, margin: 0, isTextBox: true});
  s.addNotes("Synapsis. When something happens - a law change, a market drop, a change in a family's life - every family hears what it means for them from their advisor, before they have to ask. Replace the video button link and the QR placeholder with the real video link.");

  // ---------- 2. Problem ----------
  pres.addSection({title: "Problem"});
  s = pres.addSlide({masterName: "Content", sectionTitle: "Problem"});
  s.addText("One advisor. 150 families. Each one wants to feel like the only one.", {placeholder: "title"});
  const probs = [
    [Fi.FiRss, "They hear it from the news first"],
    [Fi.FiVolumeX, "Silence reads as “nobody is watching”"],
    [Fi.FiInbox, "30 drafts a day, approved one by one"],
  ];
  for (let i = 0; i < probs.length; i++) {
    const y = 2.2 + i * 0.85;
    s.addShape(pres.shapes.OVAL, {x: 0.6, y, w: 0.55, h: 0.55, fill: {color: C.accent3}, line: {color: C.accent3}, objectName: `Problem icon bg ${i + 1}`});
    s.addImage({data: await icon(probs[i][0], HEX.accent1), x: 0.72, y: y + 0.12, w: 0.31, h: 0.31, objectName: `Problem icon ${i + 1}`});
    s.addText(probs[i][1], {x: 1.35, y, w: 3.9, h: 0.55, fontSize: 16, color: C.text1, valign: "middle", margin: 0, isTextBox: true});
  }
  // 150 family dots around one advisor
  const cx = 7.45, cy = 3.3, rings = [[0.66, 18], [0.91, 28], [1.16, 40], [1.41, 64]];
  let n = 0;
  for (const [r, count] of rings) for (let k = 0; k < count; k++) {
    const a = (2 * Math.PI * k) / count + r;   // small offset per ring
    const d = 0.085;
    s.addShape(pres.shapes.OVAL, {x: cx + r * Math.cos(a) - d / 2, y: cy + r * Math.sin(a) * 0.98 - d / 2, w: d, h: d,
      fill: {color: n % 37 === 5 ? C.accent2 : C.accent1, transparency: n % 37 === 5 ? 0 : 25}, line: {color: n % 37 === 5 ? C.accent2 : C.accent1, transparency: 100}});
    n++;
  }
  s.addShape(pres.shapes.OVAL, {x: cx - 0.45, y: cy - 0.45, w: 0.9, h: 0.9, fill: {color: C.accent1}, line: {color: C.accent1}, objectName: "Advisor"});
  s.addImage({data: await icon(Fi.FiUser, HEX.lt1), x: cx - 0.24, y: cy - 0.24, w: 0.48, h: 0.48, objectName: "Advisor icon"});
  s.addText(`${n} families · 1 advisor`, {x: cx - 1.5, y: 4.9, w: 3.0, h: 0.3, fontSize: 11, color: C.accent4, align: "center", margin: 0, isTextBox: true});
  s.addNotes("Families hear about changes from the news or a generic newsletter. Silence reads as 'nobody is watching'. And the advisor can't approve 30 personal drafts a day one by one.");

  // ---------- 3. Solution ----------
  pres.addSection({title: "Solution"});
  s = pres.addSlide({masterName: "Content", sectionTitle: "Solution"});
  s.addText("Synapsis makes your advisor first to tell", {placeholder: "title"});
  const steps = [
    [Fi.FiUserCheck, "Know", "Each family's plan, key dates and worries"],
    [Fi.FiRadio, "Watch", "Laws, markets and life events, matched to each family"],
    [Fi.FiMessageCircle, "Tell", "A personal message, voice note or AI call, approved in bulk"],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 3.0;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x, y: 1.5, w: 2.7, h: 2.75, rectRadius: 0.15, fill: {color: C.background1}, line: {color: "E3E1D9", width: 1},
      shadow: {type: "outer", color: "000000", opacity: 0.08, blur: 8, offset: 2, angle: 90}, objectName: `Step card ${i + 1}`});
    s.addShape(pres.shapes.OVAL, {x: x + 0.3, y: 1.8, w: 0.75, h: 0.75, fill: {color: C.accent3}, line: {color: C.accent3}});
    s.addImage({data: await icon(steps[i][0], HEX.accent1), x: x + 0.47, y: 1.97, w: 0.41, h: 0.41, objectName: `Step icon ${i + 1}`});
    s.addText(`${i + 1}`, {x: x + 1.95, y: 1.78, w: 0.5, h: 0.4, fontSize: 14, bold: true, color: C.accent2, align: "right", margin: 0, isTextBox: true});
    s.addText(steps[i][1], {x: x + 0.3, y: 2.75, w: 2.2, h: 0.45, fontSize: 22, bold: true, color: C.text1, margin: 0, isTextBox: true});
    s.addText(steps[i][2], {x: x + 0.3, y: 3.2, w: 2.2, h: 0.9, fontSize: 14, color: C.accent4, valign: "top", margin: 0, isTextBox: true});
    if (i < 2) s.addImage({data: await icon(Fi.FiChevronRight, HEX.accent5), x: x + 2.72, y: 2.72, w: 0.26, h: 0.26});
  }
  s.addText("Calm first, then what it means for you. Numbers only from the plan and official sources.",
    {x: 0.6, y: 4.5, w: 8.8, h: 0.4, fontSize: 14, italic: true, color: C.accent1, margin: 0, isTextBox: true});
  s.addNotes("Step 1 Know: a profile of each family (risk, worries, key plan dates). Step 2 Watch: a tracker of laws, markets and life events, and which families each one touches. Step 3 Tell: a personal message for each family, approved by the advisor in bulk, delivered as a message, a voice note or an AI call. Note: in the prototype the profile comes from the plan and from what families tell us in calls and in the app.");

  // ---------- 4. Product ----------
  pres.addSection({title: "Product"});
  s = pres.addSlide({masterName: "Content", sectionTitle: "Product"});
  s.addText("Two interfaces, one promise", {placeholder: "title"});
  const phones = [
    {x: 0.75, label: "Family app", items: ["What their advisor shared", "Voice notes and a call on demand", "Next call: date, time, how often"]},
    {x: 5.25, label: "Advisor view", items: ["One event → a draft per family", "Bulk approval · who needs you first", "AI call summaries + Done"]},
  ];
  for (const p of phones) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: p.x, y: 1.35, w: 1.75, h: 3.65, rectRadius: 0.22, fill: {color: C.text1}, line: {color: C.text1}, objectName: `${p.label} phone frame`});
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: p.x + 0.09, y: 1.47, w: 1.57, h: 3.41, rectRadius: 0.15, fill: {color: C.accent3}, line: {color: C.accent3}, objectName: `${p.label} screenshot placeholder`});
    s.addImage({data: await icon(Fi.FiImage, HEX.accent1), x: p.x + 0.67, y: 2.8, w: 0.4, h: 0.4});
    s.addText("[Insert screenshot]", {x: p.x + 0.09, y: 3.25, w: 1.57, h: 0.3, fontSize: 10, color: C.accent1, align: "center", margin: 0, isTextBox: true});
    s.addText(p.label, {x: p.x + 1.95, y: 1.45, w: 2.3, h: 0.45, fontSize: 20, bold: true, color: C.text1, margin: 0, isTextBox: true});
    for (let i = 0; i < p.items.length; i++) {
      const y = 2.1 + i * 0.75;
      s.addShape(pres.shapes.OVAL, {x: p.x + 1.95, y: y + 0.08, w: 0.22, h: 0.22, fill: {color: C.accent2}, line: {color: C.accent2}});
      s.addText(p.items[i], {x: p.x + 2.3, y, w: 1.95, h: 0.6, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true});
    }
  }
  s.addNotes("Family app: what their advisor shared, voice notes, a call when they want it, choose the date and time of the next call, and set preferences (how often, what time). Advisor view: one event creates a personal draft for every family it touches, bulk approval, a list that shows who needs you first, and AI call summaries (2-3 lines, full transcript, client requests, a Done button). Live demo: first-to-tell-sherpas.pages.dev");

  // ---------- 5. Business case ----------
  pres.addSection({title: "Business"});
  s = pres.addSlide({masterName: "Content", sectionTitle: "Business"});
  s.addText("The business case", {placeholder: "title"});
  const biz = [
    [Fi.FiBriefcase, "Who pays", "Advisors and their firms, through Sherpas"],
    [Fi.FiClock, "Value", "Hours saved, families who feel looked after, more families per advisor"],
    [Fi.FiLayers, "Model", "[Pricing idea: per-advisor add-on to Sherpas]"],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 3.0, accent = i === 2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x, y: 1.5, w: 2.7, h: 2.55, rectRadius: 0.15, fill: {color: accent ? C.accent6 : C.background1},
      line: {color: accent ? C.accent2 : "E3E1D9", width: 1, dashType: accent ? "dash" : "solid"}, objectName: `Business block ${i + 1}`});
    s.addImage({data: await icon(biz[i][0], accent ? HEX.dk1 : HEX.accent1), x: x + 0.3, y: 1.8, w: 0.45, h: 0.45, objectName: `Business icon ${i + 1}`});
    s.addText(biz[i][1], {x: x + 0.3, y: 2.45, w: 2.2, h: 0.45, fontSize: 20, bold: true, color: C.text1, margin: 0, isTextBox: true});
    s.addText(biz[i][2], {x: x + 0.3, y: 2.9, w: 2.2, h: 1.0, fontSize: 14, color: C.accent4, valign: "top", margin: 0, isTextBox: true});
  }
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: 0.6, y: 4.3, w: 8.8, h: 0.6, rectRadius: 0.3, fill: {color: C.accent1}, line: {color: C.accent1}, objectName: "Why Sherpas"});
  s.addText("Why Sherpas: plans and data are already there.", {x: 0.9, y: 4.3, w: 8.3, h: 0.6, fontSize: 16, bold: true, color: C.background1, valign: "middle", margin: 0, isTextBox: true});
  s.addNotes("Who pays: financial advisors and their firms, through Sherpas. Value: hours saved on approving messages, families who feel looked after, advisors who can serve more families with the same quality. Model: add the pricing idea (for example a per-advisor add-on to Sherpas). Do not quote numbers we have not measured.");

  // ---------- 6. Team ----------
  pres.addSection({title: "Team"});
  s = pres.addSlide({masterName: "Content", sectionTitle: "Team"});
  s.addText("Meet the team", {placeholder: "title"});
  for (let i = 0; i < 5; i++) {
    const x = 0.6 + i * 1.79;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x, y: 1.4, w: 1.62, h: 2.65, rectRadius: 0.14, fill: {color: C.background1}, line: {color: "E3E1D9", width: 1}, objectName: `Team card ${i + 1}`});
    s.addShape(pres.shapes.OVAL, {x: x + 0.36, y: 1.62, w: 0.9, h: 0.9, fill: {color: C.accent3}, line: {color: C.accent3}, objectName: `Photo placeholder ${i + 1}`});
    s.addImage({data: await icon(Fi.FiCamera, HEX.accent1), x: x + 0.63, y: 1.89, w: 0.36, h: 0.36});
    s.addText("[Name]", {x: x + 0.1, y: 2.7, w: 1.42, h: 0.35, fontSize: 14, bold: true, color: C.text1, align: "center", margin: 0, isTextBox: true});
    s.addText("[Role]", {x: x + 0.1, y: 3.05, w: 1.42, h: 0.3, fontSize: 12, color: C.accent1, align: "center", margin: 0, isTextBox: true});
    s.addText("[University]", {x: x + 0.1, y: 3.4, w: 1.42, h: 0.3, fontSize: 11, color: C.accent4, align: "center", margin: 0, isTextBox: true});
  }
  s.addText("If a family hears nothing, it should mean nothing needs doing.", {x: 0.6, y: 4.35, w: 8.8, h: 0.55, fontSize: 18, italic: true, bold: true, color: C.accent1, align: "center", margin: 0, isTextBox: true});
  s.addNotes("Closing line: If a family hears nothing, it should mean nothing needs doing.");

  await pres.writeFile({fileName: OUT});
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch(e => { console.error(e); process.exit(1); });
