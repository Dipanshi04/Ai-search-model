// Draws the "I'm Running" social share card — a 1080x1920 (story-format)
// PNG combining the runner's photo, name, BIB, category, event details,
// and the current sponsor lineup. Shared between public-web (offered right
// after registration) and runner-app (offered anytime from Runner Home),
// so both apps stay pixel-identical without duplicating this logic.

export interface ShareCardSponsor {
  name?: string;
  logoUrl?: string;
  category?: { name: string } | null;
}

export interface ShareCardOptions {
  name: string;
  bibNumber: string;
  category: string; // 'RUN_3K' | 'RUN_5K'
  avatarSrc: string | null;
  sponsors: ShareCardSponsor[];
  nrcLogoSrc: string;
  isaLogoSrc: string;
  solugenixLogoSrc: string;
  imcLogoSrc: string;
}

const NAVY = '#1B2A5B';
const ORANGE = '#F5821F';
const FONT_DISPLAY = "'Big Shoulders Display', sans-serif";
const FONT_BODY = "'Manrope', sans-serif";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadImageSafe(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

function drawImageContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function drawShareCard(canvas: HTMLCanvasElement, opts: ShareCardOptions): Promise<HTMLCanvasElement> {
  const W = 1080;

  const usableSponsors = opts.sponsors.filter((s) => s.logoUrl).slice(0, 10);

  const [nrcLogo, isaLogo, solugenixLogo, imcLogo, avatar, ...sponsorLogos] = await Promise.all([
    loadImageSafe(opts.nrcLogoSrc),
    loadImageSafe(opts.isaLogoSrc),
    loadImageSafe(opts.solugenixLogoSrc),
    loadImageSafe(opts.imcLogoSrc),
    loadImageSafe(opts.avatarSrc),
    ...usableSponsors.map((s) => loadImageSafe(s.logoUrl)),
  ]);

  // Wait for the brand fonts to be ready so canvas text doesn't fall back
  // to a system serif on the very first render.
  try {
    await Promise.all([
      document.fonts.load(`800 100px ${FONT_DISPLAY}`),
      document.fonts.load(`700 30px ${FONT_BODY}`),
    ]);
  } catch {
    // Fonts are a nice-to-have for this canvas — fall back silently.
  }

  // Story-share platforms (Instagram/WhatsApp Status) render into a fixed
  // 9:16 frame and crop whatever doesn't fit it — so the output canvas is
  // always exactly 1080x1920, never taller. Content is painted once onto
  // an unconstrained "natural" canvas first (its height varies with photo
  // presence and how many sponsor categories there are), then composited
  // into the fixed frame at 1:1 if it already fits, or scaled down (never
  // cropped) if it doesn't — the same "contain" idea as an <img>, just
  // done by hand since this is a canvas, not an element.
  const STORY_W = 1080, STORY_H = 1920;

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = W;
  measureCanvas.height = 1;
  const naturalHeight = paint(measureCanvas.getContext('2d')!, W, {
    nrcLogo, isaLogo, solugenixLogo, imcLogo, avatar, sponsorLogos, usableSponsors, opts,
  }) + 40;

  const naturalCanvas = document.createElement('canvas');
  naturalCanvas.width = W;
  naturalCanvas.height = naturalHeight;
  paint(naturalCanvas.getContext('2d')!, W, { nrcLogo, isaLogo, solugenixLogo, imcLogo, avatar, sponsorLogos, usableSponsors, opts });

  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const scale = Math.min(1, STORY_H / naturalHeight);
  const drawW = W * scale, drawH = naturalHeight * scale;
  ctx.drawImage(naturalCanvas, (STORY_W - drawW) / 2, (STORY_H - drawH) / 2, drawW, drawH);

  return canvas;
}

interface PaintAssets {
  nrcLogo: HTMLImageElement | null;
  isaLogo: HTMLImageElement | null;
  solugenixLogo: HTMLImageElement | null;
  imcLogo: HTMLImageElement | null;
  avatar: HTMLImageElement | null;
  sponsorLogos: (HTMLImageElement | null)[];
  usableSponsors: ShareCardSponsor[];
  opts: ShareCardOptions;
}

// Draws the full card and returns the final y position content reached —
// used both to measure the required canvas height and, on the real pass,
// to know where the footer belongs.
function paint(ctx: CanvasRenderingContext2D, W: number, assets: PaintAssets): number {
  const { nrcLogo, isaLogo, solugenixLogo, imcLogo, avatar, sponsorLogos, usableSponsors, opts } = assets;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, ctx.canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // ---- Green City Partner badge, top-right ----
  if (imcLogo) {
    const bx = W - 250, by = 60, bw = 190, bh = 150;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(27,42,91,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(27,42,91,0.55)';
    ctx.font = `700 15px ${FONT_BODY}`;
    ctx.fillText('GREEN CITY', bx + bw / 2, by + 34);
    ctx.fillText('PARTNER', bx + bw / 2, by + 54);
    drawImageContain(ctx, imcLogo, bx + bw / 2, by + 100, 90, 70);
  }

  // ---- Centered lockup: NRC / Presents / ISA / Co-Sponsored By / Solugenix ----
  let y = 70;
  if (nrcLogo) {
    drawImageContain(ctx, nrcLogo, W / 2, y + 55, 340, 110);
    y += 130;
  }
  ctx.fillStyle = 'rgba(27,42,91,0.45)';
  ctx.font = `700 22px ${FONT_BODY}`;
  y += 20;
  ctx.fillText('P R E S E N T S', W / 2, y);
  y += 20;
  if (isaLogo) {
    drawImageContain(ctx, isaLogo, W / 2, y + 55, 280, 100);
    y += 130;
  }
  ctx.fillStyle = 'rgba(27,42,91,0.6)';
  ctx.font = `800 26px ${FONT_BODY}`;
  y += 20;
  ctx.fillText('INDORE SOFTWARE ASSOCIATION', W / 2, y);
  y += 34;
  ctx.fillStyle = 'rgba(27,42,91,0.45)';
  ctx.font = `700 18px ${FONT_BODY}`;
  ctx.fillText('C O - S P O N S O R E D   B Y', W / 2, y);
  y += 20;
  if (solugenixLogo) {
    drawImageContain(ctx, solugenixLogo, W / 2, y + 34, 220, 60);
    y += 70;
  }

  // ---- Big statement: "I'M" + diagonal "RUNNING" band ----
  y += 55;
  ctx.fillStyle = NAVY;
  ctx.font = `800 110px ${FONT_DISPLAY}`;
  ctx.fillText("I'M", W / 2, y);

  y += 150;
  ctx.save();
  ctx.translate(W / 2, y - 30);
  ctx.rotate(-0.05);
  ctx.fillStyle = NAVY;
  ctx.fillRect(-W * 0.65, -95, W * 1.3, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 150px ${FONT_DISPLAY}`;
  ctx.fillText('RUNNING', 0, 55);
  ctx.restore();
  y += 130;

  // ---- Photo (skipped, with a bigger name below, if none is available) ----
  // A colorful gradient halo behind the frame — echoing the ribbon on the
  // hero runner graphic — fills what would otherwise be a flat, empty gap
  // between the banner and the photo.
  const hasPhoto = !!avatar;
  if (hasPhoto) {
    y += 50;
    const size = 380;
    const haloR = size / 2 + 34;
    const haloCx = W / 2, haloCy = y + size / 2;
    const halo = ctx.createConicGradient(-Math.PI / 2, haloCx, haloCy);
    halo.addColorStop(0, '#F5821F');
    halo.addColorStop(0.35, '#E91E8C');
    halo.addColorStop(0.65, '#7C3AED');
    halo.addColorStop(1, '#F5821F');
    ctx.save();
    ctx.beginPath();
    ctx.arc(haloCx, haloCy, haloR, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();
    ctx.restore();

    const px = W / 2 - size / 2, py = y;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 36);
    ctx.clip();
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(px, py, size, size);
    drawImageCover(ctx, avatar!, px, py, size, size);
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 36);
    ctx.stroke();

    // BIB sticker, overlapping the photo's bottom-right corner.
    const bibText = `#${opts.bibNumber}`;
    ctx.font = `800 30px ${FONT_BODY}`;
    const bibW = ctx.measureText(bibText).width + 44;
    const bibCx = px + size - 10, bibCy = py + size;
    ctx.save();
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.roundRect(bibCx - bibW / 2, bibCy - 26, bibW, 52, 26);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bibCx - bibW / 2, bibCy - 26, bibW, 52, 26);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bibText, bibCx, bibCy + 10);
    ctx.restore();

    y += size + 70;
  } else {
    y += 90;
  }

  // ---- Category + BIB pills (only need the BIB pill again here when
  // there's no photo, since the sticker above already showed it) ----
  const catLabel = opts.category === 'RUN_5K' ? '5K CHALLENGE' : '3K FUN RUN';
  ctx.font = `800 26px ${FONT_BODY}`;
  const bibPillText = `BIB #${opts.bibNumber}`;
  const catW = ctx.measureText(catLabel).width + 56;
  const bibW2 = hasPhoto ? 0 : ctx.measureText(bibPillText).width + 56;
  const pillGap = 16;
  const pillH = 52;
  const totalPillW = catW + (hasPhoto ? 0 : pillGap + bibW2);
  let pillX = W / 2 - totalPillW / 2;

  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.roundRect(pillX, y - pillH / 2 - 8, catW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(catLabel, pillX + catW / 2, y + 8);

  if (!hasPhoto) {
    pillX += catW + pillGap;
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.roundRect(pillX, y - pillH / 2 - 8, bibW2, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bibPillText, pillX + bibW2 / 2, y + 8);
  }

  // ---- Name (bigger when there's no photo to fill the space) ----
  // The gap has to clear the name font's own height (130px when there's
  // no photo), not just a fixed offset, or it overlaps the row above.
  y += hasPhoto ? 100 : 165;
  ctx.fillStyle = ORANGE;
  ctx.font = `800 ${hasPhoto ? 72 : 130}px ${FONT_DISPLAY}`;
  ctx.fillText(opts.name.toUpperCase(), W / 2, y);

  // ---- Date / time / venue ----
  y += 70;
  ctx.fillStyle = 'rgba(27,42,91,0.75)';
  ctx.font = `700 30px ${FONT_BODY}`;
  ctx.fillText('27 September 2026  ·  6:30 AM Onwards  ·  Basketball Complex', W / 2, y);

  // ---- Sponsors, grouped by category (matches the website's sponsor
  // strip) — one label per category above a row of its logos, instead of
  // a flat unlabeled grid. ----
  const validSponsors = sponsorLogos
    .map((img, i) => ({ img, sponsor: usableSponsors[i] }))
    .filter((s): s is { img: HTMLImageElement; sponsor: ShareCardSponsor } => s.img !== null);

  const groups: { label: string; items: { img: HTMLImageElement }[] }[] = [];
  const groupIndex = new Map<string, number>();
  for (const { img, sponsor } of validSponsors) {
    const label = sponsor.category?.name || 'Supported By';
    let idx = groupIndex.get(label);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(label, idx);
      groups.push({ label, items: [] });
    }
    groups[idx]!.items.push({ img });
  }

  if (groups.length > 0) {
    y += 70;

    const boxSize = 130;
    const boxGap = 18;
    const groupGap = 40;
    const labelHeight = 36;

    const groupHeight = labelHeight + boxSize + groupGap;
    const totalHeight = groups.length * groupHeight;

    // Tinted card behind the whole section so it reads as one grouped
    // block instead of logos floating loose on the page.
    const cardPad = 40;
    const cardW = W - 160;
    ctx.fillStyle = 'rgba(27,42,91,0.04)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - cardW / 2, y - 8, cardW, totalHeight + 70 + cardPad, 28);
    ctx.fill();

    y += 40;
    ctx.fillStyle = 'rgba(27,42,91,0.45)';
    ctx.font = `700 24px ${FONT_BODY}`;
    ctx.fillText('O U R   P A R T N E R S', W / 2, y);
    y += 46;

    for (const group of groups) {
      ctx.fillStyle = 'rgba(27,42,91,0.5)';
      ctx.font = `700 20px ${FONT_BODY}`;
      ctx.fillText(group.label.toUpperCase(), W / 2, y);
      y += 24;

      const rowW = group.items.length * boxSize + (group.items.length - 1) * boxGap;
      const rowStartX = W / 2 - rowW / 2;
      group.items.forEach(({ img }, i) => {
        const cx = rowStartX + i * (boxSize + boxGap) + boxSize / 2;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(27,42,91,0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - boxSize / 2, y, boxSize, boxSize, 14);
        ctx.fill();
        ctx.stroke();
        drawImageContain(ctx, img, cx, y + boxSize / 2, boxSize - 24, boxSize - 24);
      });
      y += boxSize + groupGap;
    }
    y += cardPad - groupGap;
  }

  // ---- Footer ----
  y += 60;
  ctx.strokeStyle = 'rgba(27,42,91,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 220, y);
  ctx.lineTo(W / 2 + 220, y);
  ctx.stroke();
  y += 40;
  ctx.fillStyle = 'rgba(27,42,91,0.5)';
  ctx.font = `700 26px ${FONT_BODY}`;
  ctx.fillText('marathon.theisa.in', W / 2, y);

  return y;
}
