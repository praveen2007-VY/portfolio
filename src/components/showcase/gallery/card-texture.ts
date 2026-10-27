import * as THREE from "three";

export type CardArt = {
  title: string;
  category: string | null;
  summary: string | null;
  tech: string[];
  featured: boolean;
  coverUrl: string | null;
};

const W = 1024;
const H = 640;
const R = 40;

function fonts() {
  const style = getComputedStyle(document.documentElement);
  const sans = style.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif";
  const mono = style.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace";
  return { sans, mono };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Wraps text to at most `maxLines`, adding an ellipsis when truncated. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    line = words[i];
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const truncated = lines.join(" ").length < words.join(" ").length;
  if (truncated && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.replace(/[\s,.;:]+$/, "")}…`;
  }
  return lines.slice(0, maxLines);
}

function initials(title: string) {
  const parts = title.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function drawAbstractCover(ctx: CanvasRenderingContext2D, art: CardArt, sans: string) {
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#0d1836");
  base.addColorStop(1, "#060b1a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const blob = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  blob(W * 0.78, H * 0.18, W * 0.62, "rgba(31,69,224,0.62)");
  blob(W * 0.12, H * 0.95, W * 0.5, "rgba(34,211,238,0.22)");

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 190px ${sans}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(initials(art.title), 56, 300);
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function draw(ctx: CanvasRenderingContext2D, art: CardArt, img: HTMLImageElement | null) {
  const { sans, mono } = fonts();
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundRect(ctx, 0, 0, W, H, R);
  ctx.clip();

  if (img) drawImageCover(ctx, img);
  else drawAbstractCover(ctx, art, sans);

  // Legibility scrim behind the text block.
  const scrim = ctx.createLinearGradient(0, H * 0.32, 0, H);
  scrim.addColorStop(0, "rgba(5,9,22,0)");
  scrim.addColorStop(0.45, "rgba(5,9,22,0.82)");
  scrim.addColorStop(1, "rgba(5,9,22,0.96)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  const pad = 56;
  ctx.textBaseline = "alphabetic";

  // Category (top-left) and featured label (top-right).
  if (art.category) {
    ctx.font = `500 22px ${mono}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = "rgba(186,230,253,0.9)";
    ctx.fillText(art.category.toUpperCase(), pad, 76);
    ctx.letterSpacing = "0px";
  }
  if (art.featured) {
    ctx.font = `600 22px ${sans}`;
    const label = "★  Featured";
    const w = ctx.measureText(label).width + 40;
    roundRect(ctx, W - pad - w, 44, w, 46, 23);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, W - pad - w + 20, 75);
  }

  // Title, summary, tags, affordance.
  ctx.font = `600 54px ${sans}`;
  const titleLines = wrap(ctx, art.title, W - pad * 2, 2);
  ctx.font = `400 26px ${sans}`;
  const summaryLines = art.summary ? wrap(ctx, art.summary, W - pad * 2, 2) : [];

  let y = H - 64 - 44 - 22 - summaryLines.length * 36 - titleLines.length * 60;
  ctx.font = `600 54px ${sans}`;
  ctx.fillStyle = "#ffffff";
  for (const line of titleLines) {
    y += 60;
    ctx.fillText(line, pad, y);
  }
  ctx.font = `400 26px ${sans}`;
  ctx.fillStyle = "rgba(203,213,235,0.92)";
  y += 8;
  for (const line of summaryLines) {
    y += 36;
    ctx.fillText(line, pad, y);
  }

  ctx.font = `500 20px ${mono}`;
  let x = pad;
  const tagY = H - 58;
  for (const tag of art.tech.slice(0, 4)) {
    const w = ctx.measureText(tag).width + 28;
    if (x + w > W - pad - 230) break;
    roundRect(ctx, x, tagY - 30, w, 40, 10);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    ctx.fillStyle = "rgba(226,232,240,0.95)";
    ctx.fillText(tag, x + 14, tagY - 3);
    x += w + 10;
  }

  ctx.font = `600 24px ${sans}`;
  ctx.fillStyle = "#7dd3fc";
  const cta = "View project  →";
  ctx.fillText(cta, W - pad - ctx.measureText(cta).width, tagY - 3);

  ctx.restore();

  // Fine inner border.
  roundRect(ctx, 1, 1, W - 2, H - 2, R);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Card artwork rendered once into a 1024×640 canvas texture: the real cover
 * image when one exists, otherwise an abstract cover from the title and
 * category (never a fake screenshot). Redraws when the image and fonts load.
 */
export function createCardTexture(art: CardArt, maxAnisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);

  let img: HTMLImageElement | null = null;
  let disposed = false;
  const redraw = () => {
    if (disposed) return;
    draw(ctx, art, img);
    texture.needsUpdate = true;
  };

  redraw();
  void document.fonts?.ready.then(redraw);

  if (art.coverUrl) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      img = image;
      redraw();
    };
    image.src = art.coverUrl;
  }

  return {
    texture,
    dispose() {
      disposed = true;
      texture.dispose();
      canvas.width = canvas.height = 0;
    },
  };
}
