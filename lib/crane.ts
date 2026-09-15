export const THEMES = [
  {
    name: "Strawberry",
    label: "딸기우유",
    body: "#ef9dad",
    dark: "#ac526c",
    light: "#fce6e8",
  },
  {
    name: "Soda",
    label: "소다",
    body: "#98c9dc",
    dark: "#467a98",
    light: "#e6f3f8",
  },
  {
    name: "Melon",
    label: "멜론",
    body: "#b9cf98",
    dark: "#718956",
    light: "#f0f4dd",
  },
  {
    name: "Grape",
    label: "포도",
    body: "#baacd9",
    dark: "#7f699f",
    light: "#eee9f7",
  },
  {
    name: "Midnight",
    label: "한밤중",
    body: "#717b9f",
    dark: "#3e4565",
    light: "#e4e6f1",
  },
  { name: "Apricot", label: "살구크림", body: "#edb58c", dark: "#a56b4e", light: "#fff0df" },
  { name: "Forest", label: "숲속녹차", body: "#526e64", dark: "#30493f", light: "#e2eee5" },
];
export type Photo = {
  image: HTMLCanvasElement;
  thumbnail: string;
  scale: number;
  rotation: number;
  flip: boolean;
};
export type Outcome = 0 | 1 | "fail" | "lucky";
export type Scene = {
  photos: Photo[];
  theme: number;
  title: string;
  message: string;
  outcome: Outcome;
  pileSeed?: number;
  pileCount?: number;
  pickSeed?: number;
};
export const DURATION = 6800;
const mix = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

export function makePile(seed = 0, count = 2, total = 8) {
  const columns = Math.max(2, Math.min(6, Math.round(total / 2)));
  let state = (Math.imul(seed + 1, 2654435761)) >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const layout = [0, 1].flatMap(row => {
    const ids = Array.from({ length: columns }, (_, i) => count > 1 ? (i + row) % 2 : 0);
    for (let i = columns - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.map((photoIndex, col) => ({
      id: row * columns + col, row, photoIndex,
      x: columns === 2 ? 165 + (col * 2 + row) * 47 + (random() - 0.5) * 8
        : 117 + col * (237 / (columns - 1)) + (random() - 0.5) * 20,
      y: (columns === 2 ? 416 + row * 5 : row ? 428 : 399) + (random() - 0.5) * (columns === 2 ? 4 : 14),
      rotation: (random() - 0.5) * 0.65,
      maxW: 61, maxH: 76,
    }));
  });
  // Keep each uploaded character eligible on the left without changing row totals.
  if (count > 1) for (const photoIndex of [0, 1]) {
    if (!layout.some(item => item.x < 240 && item.photoIndex === photoIndex)) {
      const left = layout.find(item => item.x < 240)!;
      const right = layout.find(item => item.row === left.row && item.photoIndex === photoIndex)!;
      [left.photoIndex, right.photoIndex] = [right.photoIndex, left.photoIndex];
    }
  }
  return layout;
}

export function pose(time: number, targetX = 240, failed = false, targetY = 383) {
  const t = Math.max(0, time) / 1000;
  let x = targetX,
    y = 188,
    open = 1,
    prizeY = targetY,
    prizeX = targetX,
    held = false,
    result = false;
  if (t < 0.8) x = mix(156, targetX, ease(t / 0.8));
  else if (t < 1.8) y = mix(188, targetY - 48, ease((t - 0.8) / 1));
  else if (t < 2.2) {
    y = targetY - 48;
    open = 1 - ease((t - 1.8) / 0.4);
  } else if (t < 3.1) {
    y = mix(targetY - 48, 210, ease((t - 2.2) / 0.9));
    open = 0;
    held = true;
  } else if (t < 3.8) {
    x = mix(targetX, 325, ease((t - 3.1) / 0.7));
    y = 210;
    open = 0;
    held = !failed || t < 3.42;
    if (failed && !held) {
      const releaseX = mix(targetX, 325, ease((3.42 - 3.1) / 0.7));
      const fall = (t - 3.42) / 0.7;
      prizeX = mix(releaseX, releaseX + 12, ease(fall));
      prizeY = mix(258, 402, fall * fall);
    }
  } else {
    x = mix(325, 156, ease((t - 4.55) / 1.2));
    y = mix(210, 188, ease((t - 4.55) / 0.6));
    open = ease((t - 3.8) / 0.22);
    if (failed) {
      const releaseX = mix(targetX, 325, ease((3.42 - 3.1) / 0.7));
      const fall = (t - 3.42) / 0.7;
      prizeX = mix(releaseX, releaseX + 12, ease(fall));
      prizeY = mix(258, 402, fall * fall);
      if (fall >= 1)
        prizeY -= Math.sin(Math.min(1, (fall - 1) * 2) * Math.PI) * 6;
    } else {
      const fall = Math.max(0, (t - 3.8) / 0.8);
      prizeX = 325;
      prizeY = mix(258, 545, fall * fall);
      if (fall >= 1) prizeY -= Math.sin(Math.min(1, (t - 4.6) / 0.4) * Math.PI) * 6;
    }
    result = t >= 4.55;
  }
  if (held) {
    prizeX = x;
    prizeY = y + 48;
  }
  return { x, y, open, prizeX, prizeY, held, result };
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  time: number,
) {
  const theme = THEMES[scene.theme] || THEMES[0];
  const failed = scene.outcome === "fail";
  const targetIndex = scene.outcome === 1 && scene.photos[1] ? 1 : 0;
  const pile = makePile(scene.pileSeed, scene.photos.length, scene.pileCount);
  const candidates = pile.filter(item => item.photoIndex === targetIndex && item.x < 240);
  const selection = (Math.imul((scene.pickSeed ?? 0) + 1, 2654435761) >>> 0) / 4294967296;
  const target = candidates[Math.floor(selection * candidates.length)] || pile[0];
  const lucky = scene.outcome === "lucky" && scene.photos.length === 2;
  const partner = lucky ? pile.filter(item => item.photoIndex !== targetIndex)
    .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0] : undefined;
  const p = pose(time, target.x, failed, target.y);
  const pairProgress = ease((time - 2200) / 600);
  const pairOffset = lucky ? pairProgress * 23 : 0;
  const partnerX = partner ? mix(partner.x, p.prizeX + 23, pairProgress) : 0;
  const partnerY = partner ? mix(partner.y, p.prizeY + 15, pairProgress) : 0;
  const w = ctx.canvas.width;
  ctx.save();
  ctx.scale(w / 480, w / 480);
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke?: string,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    max = 380,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(s, x, y, max);
  };
  const line = (
    x: number,
    y: number,
    x2: number,
    y2: number,
    color: string,
    width = 3,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const star = (x: number, y: number, r: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        rr = i % 2 ? r * 0.46 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };
  ctx.fillStyle = "#faf6ee";
  ctx.fillRect(0, 0, 480, 640);
  ctx.fillStyle = theme.light;
  for (let y = 12; y < 640; y += 24)
    for (let x = 12; x < 480; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 7);
      ctx.fill();
    }
  text("A LITTLE LUCK, A LOT OF LOVE", 240, 30, 10, theme.dark);
  ctx.fillStyle = "#dfd2c6";
  ctx.beginPath();
  ctx.ellipse(240, 603, 182, 13, 0, 0, 7);
  ctx.fill();
  box(91, 576, 39, 24, 8, theme.dark);
  box(350, 576, 39, 24, 8, theme.dark);
  box(58, 54, 372, 537, 29, theme.dark);
  box(50, 46, 372, 537, 29, theme.body, theme.dark);
  box(65, 59, 342, 89, 20, "#fff9ea", theme.dark);
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = (i + Math.floor(time / 180)) % 3 === 0 ? "#fff" : "#ebc679";
    ctx.beginPath();
    ctx.arc(83 + i * 25, 71, 3, 0, 7);
    ctx.fill();
  }
  ctx.font = "italic 900 29px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillStyle = theme.dark;
  ctx.fillText(scene.title.trim() || "CATCH ME!", 236, 113, 300);
  text("♡  YOUR FAVORITE, NOW A PRIZE  ♡", 236, 134, 8, theme.dark);
  box(72, 161, 328, 296, 16, theme.dark);
  box(81, 170, 310, 277, 9, theme.light);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(81, 170, 310, 277, 9);
  ctx.clip();
  for (let i = 0; i < 6; i++)
    line(90 + i * 60, 172, 90 + i * 60, 446, "#ffffff66", 1);
  box(91, 177, 290, 9, 4, "#d0c7c3");
  line(104, 181, 365, 181, "#fdfaf3", 3);
  const drawPhoto = (
    photo: Photo,
    x: number,
    y: number,
    maxW: number,
    maxH: number,
    rotation = 0,
    scale = 1,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation + (photo.rotation * Math.PI) / 180);
    ctx.scale(photo.flip ? -1 : 1, 1);
    const ratio =
      Math.min(maxW / photo.image.width, maxH / photo.image.height) *
      photo.scale *
      scale;
    const iw = photo.image.width * ratio,
      ih = photo.image.height * ratio;
    ctx.shadowColor = "#fffdf7";
    ctx.shadowBlur = 0;
    for (const [ox, oy] of [
      [-3, 0],
      [3, 0],
      [0, -3],
      [0, 3],
    ]) {
      ctx.shadowOffsetX = ox;
      ctx.shadowOffsetY = oy;
      ctx.drawImage(photo.image, -iw / 2, -ih / 2, iw, ih);
    }
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 5;
    ctx.shadowColor = "#75646a44";
    ctx.drawImage(photo.image, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  };

  const drawClaw = () => {
  line(p.x, 185, p.x, p.y, "#958d91", 4);
  box(p.x - 16, p.y - 7, 32, 19, 7, "#fff8e9", "#97868b");
  const spread = 12 + p.open * 17;
  for (const side of [-1, 1]) {
    line(p.x + side * 10, p.y + 8, p.x + side * spread, p.y + 33, "#8b7e86", 6);
    line(
      p.x + side * spread,
      p.y + 33,
      p.x + side * (spread - 10),
      p.y + 48,
      "#8b7e86",
      6,
    );
    line(p.x + side * 10, p.y + 8, p.x + side * spread, p.y + 33, "#fff8e9", 2);
  }
  };
  const targetPhoto = scene.photos[targetIndex];
  const drawRig = () => {
    if (targetPhoto) {
      const droppedFor = Math.max(0, time - 3420);
      const wobble = failed && !p.held && droppedFor < 700
        ? Math.sin(droppedFor / 65) * 0.18 * (1 - ease(droppedFor / 700)) : 0;
      const straightening = ease((time - 2200) / 350);
      const rotation = time < 2200 ? target.rotation
        : target.rotation * (1 - straightening) +
          (p.held ? Math.sin(time / 170) * 0.045 : wobble) * straightening;
      if (lucky && partner) {
        if (p.held) {
          line(p.x, p.y + 42, p.prizeX - pairOffset, p.prizeY - 26, "#b6abb0", 2);
          line(p.x, p.y + 42, partnerX, partnerY - 26, "#b6abb0", 2);
        }
        drawPhoto(scene.photos[partner.photoIndex], partnerX, partnerY, 61, 76,
          partner.rotation * (1 - pairProgress) + Math.sin(time / 190) * 0.1 * pairProgress);
      }
      drawPhoto(targetPhoto, p.prizeX - pairOffset, p.prizeY, 61, 76, rotation);
    }
    // Always draw fingers in front of the held doll, as one depth group.
    drawClaw();
  };
  let rigDrawn = false;
  pile.slice().sort((a, b) => a.y - b.y).forEach(item => {
    if (time < 3100 && !rigDrawn && item.y >= target.y) { drawRig(); rigDrawn = true; }
    if (item.id === target.id || item.id === partner?.id) return;
    const photo = scene.photos[item.photoIndex];
    if (photo) drawPhoto(photo, item.x, item.y, item.maxW, item.maxH, item.rotation);
  });
  if (!rigDrawn) drawRig();

  // Visible mouth of the chute, aligned with the retrieval bay below.
  ctx.beginPath();
  ctx.roundRect(288, 418, 76, 57, [5, 5, 0, 0]);
  ctx.fillStyle = "#b9bdc5";
  ctx.fill();
  ctx.strokeStyle = theme.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  line(294, 422, 358, 422, "#f7f5f0", 2);

  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.4;
  line(95, 206, 145, 180, "#fff", 8);
  line(95, 226, 169, 183, "#fff", 3);
  line(345, 437, 383, 414, "#fff", 7);
  ctx.restore();
  // Integrated sloped deck: joystick at left, one large DROP button at right.
  box(65, 459, 342, 47, 10, theme.dark);
  box(65, 453, 342, 40, 10, "#fff2e3", theme.dark);
  ctx.fillStyle = theme.dark;
  ctx.beginPath();
  ctx.ellipse(122, 480, 27, 8, 0, 0, 7);
  ctx.fill();
  line(122, 479, 119, 460, "#6f6268", 6);
  ctx.fillStyle = "#fff9ea";
  ctx.beginPath();
  ctx.arc(118, 456, 11, 0, 7);
  ctx.fill();
  ctx.strokeStyle = theme.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  box(191, 463, 62, 22, 4, "#443d4e");
  text("01 PLAY", 222, 478, 10, "#fff4cc");
  const ellipse = (y: number, rx: number, ry: number, fill: string) => {
    ctx.beginPath(); ctx.ellipse(340, y, rx, ry, 0, 0, 7);
    ctx.fillStyle = fill; ctx.fill();
  };
  ellipse(472, 25, 13, theme.body);
  ctx.beginPath();
  ctx.ellipse(340, 469, 18, 8, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.stroke();
  const rgb = [1, 3, 5].map(start => parseInt(theme.body.slice(start, start + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  text("DROP", 340, 476, 10, luminance < 0.3 ? "#ffffff" : theme.dark);
  box(102, 519, 58, 43, 6, theme.light, theme.dark);
  box(127, 525, 6, 22, 2, theme.dark);
  text("COIN", 131, 558, 8, theme.dark);

  text("P R I Z E  O U T", 312, 516, 10, "#fff8ed", 150);
  box(241, 522, 145, 56, 10, theme.dark);
  box(250, 526, 127, 47, 6, "#443d4e");
  if (!failed && targetPhoto && time >= 3800) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(250, 526, 127, 47, 6);
    ctx.clip();
    if (lucky && partner)
      drawPhoto(scene.photos[partner.photoIndex], partnerX, partnerY, 61, 76, 0.06);
    drawPhoto(targetPhoto, p.prizeX - pairOffset, p.prizeY, 61, 76, -0.04 * ease((time - 4400) / 400));
    ctx.restore();
    ctx.fillStyle = "#332d3b55";
    ctx.fillRect(250, 567, 127, 6);
  }
  text("CATCHU!  /  POCKET ARCADE", 240, 625, 9, theme.dark);
  if (p.result) {
    const elapsed = (time - 4550) / 1000;
    const pop = Math.min(1, elapsed / 0.45);
    const exit = Math.max(0, Math.min(1, (time - 6150) / 450));
    const exitScale = exit < 0.25
      ? 1 + 0.12 * ease(exit / 0.25)
      : 1.12 * (1 - ease((exit - 0.25) / 0.75));
    const size = (1 + Math.sin(pop * Math.PI) * 0.24) * exitScale;
    if (failed) {
      ctx.save();
      const gloom = ctx.createLinearGradient(0, 0, 0, 640);
      gloom.addColorStop(0, "#344f89");
      gloom.addColorStop(1, "#a4bfdf");
      ctx.globalAlpha = ease(pop) * 0.28;
      ctx.fillStyle = gloom;
      ctx.fillRect(0, 0, 480, 640);
      ctx.globalAlpha = ease(pop) * 0.3;
      for (let i = 0; i < 11; i++)
        line(100 + i * 28, 180, 100 + i * 28, 205 + (i % 4) * 17 + ease(pop) * 28, "#4a6595", 2);
      ctx.restore();
    }
    const customMessage = scene.message.trim();
    if (!failed) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(81, 170, 310, 277, 9);
      ctx.clip();
      for (let burst = 0; burst < 3; burst++) {
        const age = elapsed - burst * 0.22;
        if (age < 0) continue;
        const progress = Math.min(1, age / 1.6);
        ctx.globalAlpha = 1 - progress;
        for (let i = 0; i < 14; i++) {
          const angle = i / 14 * Math.PI * 2;
          const radius = (1 - (1 - progress) ** 3) * (65 + burst * 10);
          star(145 + burst * 90 + Math.cos(angle) * radius,
            275 - burst * 16 + Math.sin(angle) * radius + progress * progress * 55,
            (3 + i % 3) * (1 - progress * 0.5),
            ["#fff9e2", "#efc56c", theme.body][i % 3]);
        }
      }
      ctx.restore();
    }
    if (lucky) {
      // Deterministic confetti: preview and GIF use identical particle paths.
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(81, 170, 310, 277, 9);
      ctx.clip();
      for (let i = 0; i < 56; i++) {
        const age = elapsed - (i % 7) * 0.055;
        if (age < 0) continue;
        const life = Math.min(1, age / 2.05);
        const angle = -Math.PI + (i * 2.399963) % Math.PI;
        const speed = 65 + (i * 37) % 105;
        const x = 236 + Math.cos(angle) * speed * age;
        const y = 265 + Math.sin(angle) * speed * age + 88 * age * age;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(i + age * (i % 2 ? 5 : -5));
        ctx.globalAlpha = (1 - ease(Math.max(0, (life - 0.7) / 0.3))) * (1 - exit);
        ctx.fillStyle = ["#ef9dad", "#efc56c", "#98c9dc", "#b9cf98", "#baacd9", "#fff9e2"][i % 6];
        ctx.scale(0.45 + Math.abs(Math.cos(age * 7 + i)) * 0.55, 1);
        ctx.fillRect(-3, -5, 6, 10);
        ctx.restore();
      }
      ctx.restore();
    }
    const resultX = 366;
    const resultY = 218;
    ctx.save();
    ctx.translate(resultX, resultY - ease(pop) * 5);
    ctx.scale(size, size);
    const bubbleW = 150;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const radius = i % 2 ? 0.82 : 1;
      ctx.lineTo(Math.cos(angle) * bubbleW / 2 * radius, -10 + Math.sin(angle) * 35 * radius);
    }
    ctx.closePath();
    ctx.fillStyle = failed ? "#e5edf9" : "#fff4cb";
    ctx.fill();
    ctx.strokeStyle = failed ? "#7085aa" : theme.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '900 28px Arial, sans-serif';
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#fff9e9";
    const message = customMessage || (failed ? "FAIL!" : lucky ? "Lucky!" : "GET!");
    ctx.textAlign = "center";
    ctx.fillStyle = failed ? "#506991" : theme.dark;
    ctx.fillText(message, 0, 0, bubbleW - 24);
    ctx.restore();
  }
  ctx.restore();
}

export async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("PNG, JPG, WebP 사진을 선택해 주세요.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("사진은 20MB 이하로 넣어 주세요.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const c = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    c.width = Math.max(1, Math.round(image.width * scale));
    c.height = Math.max(1, Math.round(image.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let l = c.width,
      t = c.height,
      r = -1,
      b = -1;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (data[(y * c.width + x) * 4 + 3] > 16) {
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
    if (r < 0) throw new Error("사진이 완전히 투명해요. 다른 사진을 넣어 주세요.");
    const out = document.createElement("canvas");
    out.width = r - l + 1;
    out.height = b - t + 1;
    out
      .getContext("2d")!
      .drawImage(c, l, t, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
