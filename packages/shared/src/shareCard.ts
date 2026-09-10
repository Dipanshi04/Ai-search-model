// Draws the "I'm Running" social share card — a 1080x1920 (story-format)
// PNG combining the runner's photo, name, BIB, category, event details,
// and the current sponsor lineup. Shared between public-web (offered right
// after registration) and runner-app (offered anytime from Runner Home),
// so both apps stay pixel-identical without duplicating this logic.

export interface ShareCardSponsor {
  name?: string;
  logoUrl?: string;
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

  // The photo block adds ~440px that a fixed canvas height can't account
  // for, so this is painted twice: once against a throwaway 1x1 canvas
  // purely to find out how tall the real content ends up being (canvas
  // draw calls don't throw just because they land outside the visible
  // area), then for real once the canvas is sized to fit it exactly.
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = W;
  measureCanvas.height = 1;
  const finalY = paint(measureCanvas.getContext('2d')!, W, {
    nrcLogo, isaLogo, solugenixLogo, imcLogo, avatar, sponsorLogos, usableSponsors, opts,
  });

  canvas.width = W;
  canvas.height = finalY + 40;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, W, { nrcLogo, isaLogo, solugenixLogo, imcLogo, avatar, sponsorLogos, usableSponsors, opts });

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
  const hasPhoto = !!avatar;
  if (hasPhoto) {
    y += 70;
    const size = 380;
    const px = W / 2 - size / 2, py = y;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 36);
    ctx.clip();
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(px, py, size, size);
    drawImageCover(ctx, avatar!, px, py, size, size);
    ctx.restore();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 36);
    ctx.stroke();
    y += size + 60;
  } else {
    y += 90;
  }

  // ---- Category (left) / BIB (right) ----
  const catLabel = opts.category === 'RUN_5K' ? '5K CHALLENGE' : '3K FUN RUN';
  ctx.fillStyle = ORANGE;
  ctx.font = `800 30px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.fillText(catLabel, 110, y);
  ctx.textAlign = 'right';
  ctx.fillText(`BIB #${opts.bibNumber}`, W - 110, y);
  ctx.textAlign = 'center';

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

  // ---- Sponsors ----
  const validSponsorLogos = sponsorLogos
    .map((img, i) => ({ img, name: usableSponsors[i]?.name }))
    .filter((s): s is { img: HTMLImageElement; name: string | undefined } => s.img !== null);

  if (validSponsorLogos.length > 0) {
    y += 90;
    ctx.fillStyle = 'rgba(27,42,91,0.45)';
    ctx.font = `700 24px ${FONT_BODY}`;
    ctx.fillText('O U R   P A R T N E R S', W / 2, y);
    y += 40;

    const cols = 4;
    const cellW = 220, cellH = 130;
    const gridW = cols * cellW;
    const startX = W / 2 - gridW / 2;
    const rows = Math.ceil(validSponsorLogos.length / cols);

    validSponsorLogos.forEach(({ img }, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * cellW + cellW / 2;
      const cyTop = y + row * cellH;
      const boxW = cellW - 30, boxH = cellH - 30;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(27,42,91,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, cyTop, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();
      drawImageContain(ctx, img, cx, cyTop + boxH / 2, boxW - 24, boxH - 24);
    });
    y += rows * cellH;
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
