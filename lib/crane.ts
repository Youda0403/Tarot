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
];
export type Photo = {
  image: HTMLCanvasElement;
  thumbnail: string;
  scale: number;
  rotation: number;
  flip: boolean;
};
export type Outcome = 0 | 1 | "fail";
export type Scene = {
  photos: Photo[];
  theme: number;
  title: string;
  message: string;
  outcome: Outcome;
};
export const DURATION = 6800;
const mix = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

export function pose(time: number, targetX = 240, failed = false) {
  const t = Math.max(0, time) / 1000;
  let x = targetX,
    y = 188,
    open = 1,
    prizeY = 383,
    prizeX = targetX,
    held = false,
    result = false;
  if (t < 0.8) x = mix(156, targetX, ease(t / 0.8));
  else if (t < 1.8) y = mix(188, 335, ease((t - 0.8) / 1));
  else if (t < 2.2) {
    y = 335;
    open = 1 - ease((t - 1.8) / 0.4);
  } else if (t < 3.1) {
    y = mix(335, 210, ease((t - 2.2) / 0.9));
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
  const targetX = targetIndex === 0 ? 210 : 274;
  const p = pose(time, targetX, failed);
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
  text(scene.title.trim() || "CATCH ME!", 236, 113, 29, theme.dark, 300);
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
  const plush = (
    x: number,
    y: number,
    size: number,
    color: string,
    kind = 0,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(x) * 0.18);
    if (kind) {
      star(0, 0, size, color);
    } else {
      box(-size * 0.7, -size, size * 1.4, size * 1.6, size * 0.55, color);
      box(-size * 0.65, -size * 1.35, size * 0.45, size * 0.65, 8, color);
      box(size * 0.2, -size * 1.35, size * 0.45, size * 0.65, 8, color);
    }
    ctx.fillStyle = "#735f65";
    ctx.beginPath();
    ctx.arc(-size * 0.22, -2, 2, 0, 7);
    ctx.arc(size * 0.22, -2, 2, 0, 7);
    ctx.fill();
    line(-3, 7, 3, 7, "#a78388", 1.5);
    ctx.restore();
  };
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

  // Clear, evenly staggered rows make the cabinet feel fully stocked.
  [
    [105, 384, 21, "#e6bfcf"],
    [151, 377, 22, "#fff4cc"],
    [196, 390, 21, "#c1d8c3"],
    [241, 376, 22, "#d2c4e6"],
    [286, 389, 21, "#efb8bc"],
    [331, 377, 22, "#fff4cc"],
    [372, 391, 20, "#c1d8c3"],
  ].forEach((a, i) =>
    plush(
      a[0] as number,
      a[1] as number,
      a[2] as number,
      a[3] as string,
      i % 3 === 1 ? 1 : 0,
    ),
  );
  const pileLayouts = [
    [
      [112, 411, 58, 72, -0.14],
      [186, 428, 60, 74, 0.08],
      [260, 409, 58, 72, -0.08],
      [340, 426, 60, 74, 0.12],
    ],
    [
      [146, 426, 58, 72, 0.13],
      [222, 405, 59, 73, -0.08],
      [300, 428, 58, 72, 0.1],
      [373, 410, 57, 70, -0.12],
    ],
  ] as const;
  scene.photos.forEach((photo, photoIndex) =>
    pileLayouts[photoIndex].forEach(([x, y, maxW, maxH, rotation]) =>
      drawPhoto(photo, x, y, maxW, maxH, rotation),
    ),
  );
  [
    [106, 440, 24, "#efb8bc"],
    [170, 447, 25, "#fff4cc"],
    [252, 449, 24, "#c1d8c3"],
    [320, 446, 25, "#d2c4e6"],
    [374, 449, 22, "#efb8bc"],
  ].forEach((a, i) =>
    plush(
      a[0] as number,
      a[1] as number,
      a[2] as number,
      a[3] as string,
      i % 2,
    ),
  );

  const targetPhoto = scene.photos[targetIndex];
  if (targetPhoto) {
    const droppedFor = Math.max(0, time - 3420);
    const fallingWobble =
      failed && !p.held && droppedFor < 700
        ? Math.sin(droppedFor / 65) * 0.18 * (1 - ease(droppedFor / 700))
        : 0;
    const swing = p.held ? Math.sin(time / 170) * 0.045 : fallingWobble;
    drawPhoto(targetPhoto, p.prizeX, p.prizeY, 61, 76, swing);
  }
  // Visible mouth of the chute, aligned with the retrieval bay below.
  box(288, 411, 76, 36, 4, "#b9bdc5", theme.dark);
  box(296, 418, 60, 19, 3, "#4d4c59");
  line(293, 415, 359, 415, "#f7f5f0", 2);
  line(299, 440, 354, 440, "#e4e3e7", 2);
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
  ellipse(480, 28, 12, theme.dark);
  box(316, 465, 48, 13, 5, theme.dark);
  ellipse(465, 25, 12, theme.dark);
  box(318, 461, 44, 11, 5, theme.body);
  ellipse(461, 22, 10, theme.body);
  ctx.beginPath();
  ctx.ellipse(340, 458, 15, 6, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.stroke();
  text("DROP", 340, 465, 9, theme.dark);
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
    drawPhoto(targetPhoto, p.prizeX, p.prizeY, 61, 76, -0.04 * ease((time - 4400) / 400));
    ctx.restore();
    ctx.fillStyle = "#332d3b55";
    ctx.fillRect(250, 567, 127, 6);
  }
  text("CATCHU!  /  POCKET ARCADE", 240, 625, 9, theme.dark);
  if (p.result) {
    const elapsed = (time - 4550) / 1000;
    const pop = Math.min(1, elapsed / 0.45);
    const size = 1 + Math.sin(pop * Math.PI) * 0.24;
    const customMessage = scene.message.trim();
    const resultX = customMessage ? 240 : 400;
    const resultY = customMessage ? 213 : 169;
    ctx.save();
    ctx.translate(resultX, resultY - ease(pop) * 5);
    if (!customMessage) ctx.rotate(0.07);
    ctx.scale(size, size);
    ctx.font = '900 31px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#fff9e9";
    const message = customMessage || (failed ? "Fail" : "GET!");
    if (!customMessage) {
      const letters = message.split("");
      const gap = 24;
      letters.forEach((letter, i) => {
        ctx.save();
        ctx.translate((i - (letters.length - 1) / 2) * gap, i % 2 ? 1 : -2);
        ctx.rotate((i % 2 ? 1 : -1) * 0.08);
        ctx.textAlign = "center";
        ctx.strokeText(letter, 0, 0);
        ctx.fillStyle = failed ? theme.dark : i % 2 ? "#e3a83f" : theme.dark;
        ctx.fillText(letter, 0, 0);
        ctx.restore();
      });
    } else {
      ctx.textAlign = "center";
      ctx.strokeText(message, 0, 0, 300);
      ctx.fillStyle = theme.dark;
      ctx.fillText(message, 0, 0, 300);
    }
    ctx.restore();
    for (let i = 0; i < (failed ? 6 : 10); i++) {
      const q = ease(Math.min(1, elapsed / 0.55));
      const angle = (i / (failed ? 6 : 10)) * Math.PI * 2;
      star(
        resultX + Math.cos(angle) * (24 + q * 28),
        resultY - 5 + Math.sin(angle) * (10 + q * 17),
        ((failed ? 2 : 3) + (i % 3)) * (0.7 + 0.3 * Math.sin(elapsed * 5 + i)),
        failed ? "#b6a9ae" : i % 2 ? theme.dark : "#e3b655",
      );
    }
  }
  ctx.restore();
}

export async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("PNG, JPG, WebP 사진을 선택해 줘.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("사진은 20MB 이하로 넣어 줘.");
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
    if (r < 0) throw new Error("사진이 완전히 투명해. 다른 사진을 넣어 줘.");
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
