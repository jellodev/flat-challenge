const KYUNG_URL = "https://kyungkorea.com/";
const DAY_MS = 86400000;
const KST_OFFSET_MS = 9 * 3600000;
const SHARE_SALT = "kyung-51-surface-tension";
const STORAGE_KEY = "kyung-surface-progress-v2";
const ENDING_SECONDS = 8;
const MIN_DOME = 0.5;
const POUR_THRESHOLD = 0.45;
const SLOSH_OMEGA = 2 * Math.PI * 2.2;
const SLOSH_ZETA = 0.04;
const TABLE_SPILL_LIMIT = 0.006;
const SUBSTEPS = 4;
const ENDING_HTML = `
  <p class="eyebrow">ALL CLEAR!</p>
  <h2>골무에 볼록이라니…<br>사람 맞나요?</h2>
  <p class="lead">연습은 여기까지.<br>이제 <b>진짜 한 잔</b>을 따를 차례예요.</p>
  <a class="primary" href="${KYUNG_URL}" rel="noopener">진짜 한 잔 보러 가기 →</a>
  <p class="countdown"></p>
  <button class="ghost">자랑부터 하고 갈래요</button>
  <p class="legal">경고: 지나친 음주는 뇌졸중, 기억력 손상이나 치매를 유발합니다. 임신 중 음주는 기형아 출생 위험을 높입니다.</p>`;

const STAGES = [
  {
    name: "소주잔", cup: 1, tension: 0.08, flow: 0.5, time: 30, tremor: 0.012,
    wobble: 0.6, leg: 0, legKick: 0, quake: 0, quakeCount: 0,
    water: 0, clink: 0, glug: 0.2, rush: 0, leftover: 0.2,
    intro: "넘치기 직전까지,<br>아니 조금 더! 볼록하게!",
  },
  {
    name: "미니 소주잔", cup: 0.82, tension: 0.06, flow: 0.75, time: 32, tremor: 0.018,
    wobble: 0.4, leg: 20, legKick: 28, quake: 0, quakeCount: 0,
    water: 0.3, clink: 0.35, glug: 0.25, rush: 0.2, leftover: 0.35,
    intro: "어? 잔이 작아졌다!",
  },
  {
    name: "에스프레소잔", cup: 0.66, tension: 0.045, flow: 1, time: 28, tremor: 0.022,
    wobble: 0.45, leg: 0, legKick: 0, quake: 4, quakeCount: 1,
    water: 0.35, clink: 0.4, glug: 0.3, rush: 0.25, leftover: 0.35,
    intro: "더 작아졌다…?<br>근데 왠지 불안하다.",
  },
  {
    name: "병뚜껑", cup: 0.5, tension: 0.035, flow: 1.35, time: 30, tremor: 0.028,
    wobble: 0.3, leg: 10, legKick: 34, quake: 4.5, quakeCount: 1,
    water: 0.4, clink: 0.45, glug: 0.35, rush: 0.3, leftover: 0.4,
    intro: "이걸… 잔이라고?",
  },
  {
    name: "골무", cup: 0.36, tension: 0.028, flow: 1.8, time: 36, tremor: 0.034,
    wobble: 0.25, leg: 8, legKick: 40, quake: 5, quakeCount: 2,
    water: 0.45, clink: 0.5, glug: 0.4, rush: 0.3, leftover: 0.45,
    intro: "마지막 잔.<br>행운을 빌어요.",
  },
];

const COPY = {
  fall: [
    "흘린 술은 주워 담을 수 없죠.<br>첫 잔부터 다시.",
    "넘친 건 술이 아니라<br>자신감이었습니다.",
    "잔이 작았던 게 아니라<br>욕심이 컸던 거예요.",
    "인생도 술자리도,<br>가끔은 첫 잔으로 돌아갑니다.",
    "여기까지 온 것도 대단해요.<br>다시 올 수 있다면 더 대단하고요.",
    "포기하면 편해요.<br>근데 편하려고 시작한 건 아니잖아요?",
  ],
  firstFall: [
    "첫 잔부터 흘렸다.<br>괜찮아, 아무도 안 봤어.",
    "주르륵. 행주 어디 있어요?",
    "테이블이 먼저 취해버렸다.",
  ],
  flat: [
    "가득은 찼는데 볼록하진 않아!",
    "평평한 잔은 그냥 성실한 잔이야.",
    "조금만 더 용기를 냈어야지!",
  ],
  short: [
    "반잔은 예의가 아니야!",
    "이 잔으로 건배하면 다들 눈치챈다.",
  ],
  timeout: [
    "다들 잔 들고 기다리다 팔 떨어지겠다!",
    "건배 타이밍 놓쳤다. 분위기 싸늘…",
  ],
  success: [
    "잔 위로 볼록! 이게 바로 표면장력!",
    "안 흘렸다! 안 넘쳤다! 완벽해!",
    "손목 스냅 무엇… 혹시 고수?",
  ],
};

const $ = (id) => document.getElementById(id);
const el = {
  canvas: $("scene"), stage: $("stage"), toasts: $("toasts"), hint: $("hint"),
  hudStage: $("hudStage"), hudCup: $("hudCup"), gauge: $("gaugeFill"), mute: $("muteBtn"),
  pour: $("pourBtn"), cheers: $("cheersBtn"),
  title: $("titleScreen"), start: $("startBtn"), challenge: $("challengeBanner"), best: $("bestRecord"),
  intro: $("introScreen"), introStep: $("introStep"), introCup: $("introCup"), introText: $("introText"), go: $("goBtn"),
  result: $("resultScreen"), resultEyebrow: $("resultEyebrow"), resultTitle: $("resultTitle"), resultText: $("resultText"),
  resultPrimary: $("resultPrimary"), share: $("shareBtn"),
  ending: $("endingScreen"), endingCard: $("endingCard"),
};
const ctx = el.canvas.getContext("2d");

const todayKey = () => Math.floor((Date.now() + KST_OFFSET_MS) / DAY_MS);
const hoursUntilReset = () => Math.max(1, Math.ceil((DAY_MS - ((Date.now() + KST_OFFSET_MS) % DAY_MS)) / 3600000));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function freshProgress() {
  return { day: todayKey(), at: 0, best: 0, attempts: 0, falls: 0, cheated: false, rid: Math.random().toString(36).slice(2, 8) };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.day === todayKey()) return { ...freshProgress(), ...saved };
  } catch {}
  return freshProgress();
}

function rollDay() {
  if (progress.day === todayKey()) return false;
  Object.assign(progress, freshProgress());
  saveProgress();
  return true;
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
}

const progress = loadProgress();

const game = {
  mode: "title",
  stageIndex: 0,
  round: 0,
  plan: null,
  level: 0,
  tilt: 0,
  tiltVel: 0,
  pressing: false,
  dragging: false,
  seenIntro: new Set(),
  bottleX: 0,
  bottleVel: 0,
  targetX: 0,
  keyDir: 0,
  glassX: 0,
  glassVel: 0,
  slosh: 0,
  sloshVel: 0,
  gush: 0,
  flow: 0,
  landX: 0,
  inGlass: true,
  tableVol: 0,
  puddles: [],
  elapsed: 0,
  quakeShake: 0,
  legJitter: 0,
  waterUsed: false,
  drainFrom: 0,
  drainT: 0,
  spillT: 0,
  spillKind: "",
  golden: false,
  ghostUntil: 0,
  bottleTaps: [],
  lastResult: null,
  endingTimer: null,
  time: 0,
};

const particles = [];

function buildPlan(stage, rng) {
  const plan = {
    legs: [], quakes: [], clinks: [],
    wobblePhase: rng() * Math.PI * 2,
    tremorPhase: [rng() * 6.28, rng() * 6.28, rng() * 6.28],
    water: rng() < stage.water,
    glug: rng() < stage.glug,
    rush: rng() < stage.rush,
    leftover: rng() < stage.leftover ? 0.3 + rng() * 0.35 : 0,
    legAnnounced: false,
  };
  if (stage.leg) {
    let t = 1 + rng() * 2;
    while (t < stage.time) {
      const d = 1.2 + rng() * 1;
      plan.legs.push({ start: t, end: t + d });
      t += d + 2 + rng() * 2;
    }
  }
  for (let i = 0; i < stage.quakeCount; i++) {
    plan.quakes.push({ start: 3 + rng() * stage.time * 0.4, dur: 1.6, warned: false });
  }
  if (rng() < stage.clink) {
    plan.clinks.push({ start: 2 + rng() * (stage.time - 6), warned: false, hit: false });
  }
  return plan;
}

function startStage(index) {
  game.stageIndex = index;
  game.waterUsed = false;
  game.round = 0;
  const stage = STAGES[index];
  el.hudStage.textContent = index + 1;
  el.hudCup.textContent = stage.name;
  resetRound(true);
  if (game.seenIntro.has(index)) {
    toast(`STAGE ${index + 1} · ${stage.name}`);
    beginPlay();
    return;
  }
  game.seenIntro.add(index);
  el.introStep.textContent = `STAGE ${index + 1}`;
  el.introCup.textContent = stage.name;
  el.introText.innerHTML = stage.intro;
  showOverlay(el.intro);
  game.mode = "intro";
}

function resetRound(fresh) {
  const stage = STAGES[game.stageIndex];
  const rng = mulberry32(fnv1a(`${progress.day}:${game.stageIndex}:${progress.attempts}:${game.round}`));
  game.plan = buildPlan(stage, rng);
  game.level = fresh ? game.plan.leftover : 0;
  game.tilt = 0;
  game.tiltVel = 0;
  game.gush = 0;
  game.flow = 0;
  game.elapsed = 0;
  game.slosh = 0;
  game.sloshVel = 0;
  game.glassX = 0;
  game.glassVel = 0;
  game.tableVol = 0;
  game.puddles = [];
  game.quakeShake = 0;
  game.legJitter = 0;
  game.pressing = false;
  game.bottleX = view.w * 0.34;
  game.bottleVel = 0;
  game.targetX = game.bottleX;
  particles.length = 0;
  updateGauge();
}

function beginPlay() {
  if (rollDay()) toast("자정이 지나 오늘의 기록이 새로 시작됐어요.");
  hideOverlays();
  game.mode = "play";
  progress.attempts += 1;
  progress.at = game.stageIndex;
  saveProgress();
  const plan = game.plan;
  if (plan.leftover > 0) toast("누가 밑잔을 남겼다! 버릴 순 없지…", "warn");
  if (plan.rush) toast("새 병 개봉! 오늘따라 콸콸 나온다!", "warn");
  else if (plan.glug) toast("병이 비어간다… 꿀렁꿀렁!", "warn");
  lateNightEgg();
  setControls(true);
}

function setControls(enabled) {
  el.pour.disabled = !enabled;
  el.cheers.disabled = !enabled;
  if (!enabled) stopPour();
}

function startPour() {
  if (game.mode !== "play") return;
  game.pressing = true;
  el.pour.classList.add("is-active");
  el.hint.classList.add("is-hidden");
  audio.ensure();
}

function stopPour() {
  game.pressing = false;
  el.pour.classList.remove("is-active");
}

function legEnvelope(t, plan) {
  for (const leg of plan.legs) {
    if (t >= leg.start && t <= leg.end) return Math.sin(Math.PI * (t - leg.start) / (leg.end - leg.start));
  }
  return 0;
}

function quakeEnvelope(t, plan) {
  let env = 0;
  for (const q of plan.quakes) {
    const tau = t - q.start;
    if (tau >= 0 && tau <= q.dur) env = Math.max(env, Math.min(1, tau / 0.15) * (1 - tau / q.dur));
  }
  return env;
}

function tremorAt(t, stage, plan) {
  const [a, b, c] = plan.tremorPhase;
  return stage.tremor * (0.5 * Math.sin(2 * Math.PI * 1.3 * t + a) + 0.3 * Math.sin(2 * Math.PI * 3.7 * t + b) + 0.2 * Math.sin(2 * Math.PI * 8.1 * t + c));
}

function update(dt) {
  game.time += dt;
  updateParticles(dt);
  if (game.mode === "draining") {
    game.drainT += dt;
    game.level = game.drainFrom * Math.max(0, 1 - game.drainT / 0.9);
    if (game.drainT >= 1.1) {
      game.round += 1;
      resetRound(false);
      game.mode = "play";
      setControls(true);
      toast("이번엔 진짜 술! 다시 따르자.");
    }
    return;
  }
  if (game.mode === "spilling") {
    game.spillT += dt;
    if (game.spillT > 1) showFall(game.spillKind);
    return;
  }
  if (game.mode !== "play") {
    game.tilt = Math.max(0, game.tilt - dt / 0.3);
    game.flow = 0;
    return;
  }

  const stage = STAGES[game.stageIndex];
  const plan = game.plan;
  game.elapsed += dt;
  const t = game.elapsed;

  if (game.keyDir) game.targetX += game.keyDir * 260 * dt;
  game.targetX = clamp(game.targetX, view.w * 0.15, view.w * 0.92);
  game.bottleVel += (40 * (game.targetX - game.bottleX) - 9 * game.bottleVel) * dt;
  game.bottleX += game.bottleVel * dt;

  const before = game.tilt + tremorAt(t - dt, stage, plan);
  game.tiltVel += ((game.pressing ? 3.2 : -4.5) - 2.2 * game.tiltVel) * dt;
  game.tilt += game.tiltVel * dt;
  if (game.tilt <= 0 || game.tilt >= 1) {
    game.tilt = clamp(game.tilt, 0, 1);
    game.tiltVel = 0;
  }
  const effTilt = game.tilt + tremorAt(t, stage, plan);
  if (before < POUR_THRESHOLD && effTilt >= POUR_THRESHOLD && game.tiltVel > 0) {
    game.gush += stage.flow * 0.03 * clamp(game.tiltVel, 0, 2) ** 2;
    audio.glug();
  }
  let flow = effTilt > POUR_THRESHOLD ? stage.flow * Math.pow((effTilt - POUR_THRESHOLD) / (1 - POUR_THRESHOLD), 1.5) : 0;
  flow *= 1 + (plan.glug ? 0.6 : 0.25) * Math.sin(2 * Math.PI * 5.3 * t) * Math.sin(2 * Math.PI * 1.1 * t + plan.wobblePhase);
  if (plan.rush) flow *= 1.3;
  const gushOut = Math.min(game.gush, game.gush * dt / 0.1 + 0.002 * dt);
  game.gush -= gushOut;
  game.flow = Math.max(0, flow) + gushOut / dt;
  const flowNorm = game.flow / stage.flow;

  stepGlass(dt, t, stage, plan);

  const g = geometry();
  game.landX = bottlePose(g).tip.x + Math.min(flowNorm, 1.2) * g.base * 0.12;
  game.inGlass = Math.abs(game.landX - g.cx) < (g.topHalf - g.wall) * 0.9;
  const poured = game.flow * dt;
  if (poured > 0) {
    if (game.inGlass) {
      game.level += poured;
    } else {
      game.tableVol += poured;
      addPuddle(game.landX, g, poured);
    }
  }

  stepSlosh(dt, t, stage, plan, flowNorm);

  announce(t, plan);
  audio.pour(flowNorm);

  if (game.tableVol > TABLE_SPILL_LIMIT) return triggerSpill("table");
  if (game.level + Math.abs(game.slosh) > 1 + stage.tension) return triggerSpill("overflow");
  updateGauge();
  if (t >= stage.time) showFail("timeout");
}

function stepGlass(dt, t, stage, plan) {
  const leg = legEnvelope(t, plan);
  const quake = quakeEnvelope(t, plan);
  const vBefore = game.glassVel;
  if (leg > 0 && Math.random() < dt * 9) game.glassVel += (Math.random() * 2 - 1) * stage.legKick * leg;
  if (quake > 0 && Math.random() < dt * 12) game.glassVel += (Math.random() * 2 - 1) * stage.quake * 30 * quake;
  for (const c of plan.clinks) {
    if (!c.hit && t >= c.start) {
      c.hit = true;
      const dir = Math.random() < 0.5 ? -1 : 1;
      game.glassVel += dir * 80;
      game.sloshVel += dir * 0.28;
      audio.clink();
    }
  }
  game.glassVel *= Math.exp(-5 * dt);
  game.glassX += game.glassVel * dt;
  const limit = view.w * 0.28;
  if (Math.abs(game.glassX) > limit) {
    game.glassX = Math.sign(game.glassX) * limit;
    game.glassVel *= -0.3;
  }
  game.sloshVel -= (game.glassVel - vBefore) * 0.0008;
  game.legJitter = leg * 1.5;
  game.quakeShake = quake * 7;
}

function stepSlosh(dt, t, stage, plan, flowNorm) {
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    const tt = t - dt + h * (i + 1);
    let force = stage.wobble * Math.sin(2 * Math.PI * 1.9 * tt + plan.wobblePhase);
    force += stage.leg * legEnvelope(tt, plan) * Math.sin(2 * Math.PI * 6.5 * tt);
    for (const q of plan.quakes) {
      const tau = tt - q.start;
      if (tau >= 0 && tau <= q.dur) {
        const env = Math.min(1, tau / 0.15) * (1 - tau / q.dur);
        force += stage.quake * env * (0.6 * Math.sin(2 * Math.PI * 2.2 * tau) + 0.4 * Math.sin(2 * Math.PI * 3.1 * tau + 1));
      }
    }
    if (game.inGlass && flowNorm > 0) game.sloshVel += (Math.random() * 2 - 1) * flowNorm * 0.4 * Math.sqrt(h);
    game.sloshVel += (force - SLOSH_OMEGA * SLOSH_OMEGA * game.slosh - 2 * SLOSH_ZETA * SLOSH_OMEGA * game.sloshVel) * h;
    game.slosh += game.sloshVel * h;
  }
}

function addPuddle(x, g, amount) {
  const last = game.puddles[game.puddles.length - 1];
  if (last && Math.abs(last.x - x) < 10) {
    last.r = Math.min(60, last.r + amount * 2500);
  } else {
    game.puddles.push({ x, r: 4 + amount * 2500 });
  }
  if (Math.random() < 0.5) particles.push({ x, y: g.tableY, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 80, life: 0.8 });
}

function announce(t, plan) {
  for (const q of plan.quakes) {
    if (!q.warned && t >= q.start - 0.4) {
      q.warned = true;
      toast("우르르르… 지진이다!!", "warn");
      audio.rumble(q.dur + 0.4);
      vibrate([80, 40, 120, 40, 200]);
    }
  }
  for (const c of plan.clinks) {
    if (!c.warned && t >= c.start - 0.6) {
      c.warned = true;
      toast("옆자리에서 갑자기 건배 제의가!!", "warn");
    }
  }
  if (!plan.legAnnounced && plan.legs.length && t >= plan.legs[0].start) {
    plan.legAnnounced = true;
    toast("맞은편 부장님 다리 떨기 시작… 덜덜덜", "warn");
  }
}

function triggerSpill(kind) {
  game.mode = "spilling";
  game.spillKind = kind;
  game.spillT = 0;
  setControls(false);
  vibrate(200);
  audio.pour(0);
  progress.falls += 1;
  progress.at = 0;
  saveProgress();
  if (kind === "table") return;
  const g = geometry();
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    particles.push({ x: g.cx + side * g.topHalf, y: g.rimY, vx: side * (20 + Math.random() * 60), vy: -30 - Math.random() * 60, life: 1 });
  }
  game.puddles.push({ x: g.cx - g.topHalf * 1.4, r: 18 }, { x: g.cx + g.topHalf * 1.4, r: 22 });
}

function updateParticles(dt) {
  const tableY = view.h * 0.8;
  for (const p of particles) {
    p.vy += 600 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > tableY) {
      p.y = tableY;
      p.vy = 0;
      p.vx *= 0.9;
    }
    p.life -= dt * 0.6;
  }
}

function judge() {
  if (game.mode !== "play") return;
  const stage = STAGES[game.stageIndex];
  stopPour();
  if (game.flow > 0.02 * stage.flow) {
    toast("아직 따르는 중! 손 떼고 건배!");
    return;
  }
  audio.clink();
  if (game.level + Math.abs(game.slosh) * 1.5 > 1 + stage.tension) return triggerSpill("lift");
  const dome = (game.level - 1) / stage.tension;
  if (game.level < 0.9) return showFail("short");
  if (dome < MIN_DOME) return showFail("flat");
  if (game.plan.water && !game.waterUsed) {
    game.waterUsed = true;
    game.mode = "draining";
    game.drainFrom = game.level;
    game.drainT = 0;
    setControls(false);
    toast("잠깐… 이거 물이잖아?!", "warn");
    return;
  }
  showSuccess(dome);
}

function showSuccess(dome) {
  game.mode = "result";
  setControls(false);
  const stageNo = game.stageIndex + 1;
  progress.best = Math.max(progress.best, stageNo);
  progress.at = Math.min(stageNo, STAGES.length - 1);
  saveProgress();
  const grade = dome >= 0.9 ? "★★★ 볼록 장인" : dome >= 0.7 ? "★★ 예쁜 볼록" : "★ 수줍은 볼록";
  game.lastResult = { ok: true };
  el.resultEyebrow.textContent = `STAGE ${stageNo} CLEAR`;
  el.resultTitle.textContent = grade;
  el.resultText.innerHTML = pick(COPY.success) + (dome >= 0.9 ? "<br><b>🏅 표면장력 장인 배지 획득!</b>" : "");
  el.resultPrimary.textContent = stageNo === STAGES.length ? "마지막 잔 비우기 ▶" : "다음 잔 ▶";
  showOverlay(el.result);
}

function showFall(kind) {
  game.mode = "result";
  const fromStage = game.stageIndex + 1;
  game.lastResult = { ok: false, fall: true };
  el.resultEyebrow.textContent = `STAGE ${fromStage} · 흘린 잔 ${progress.falls}`;
  el.resultTitle.textContent = { overflow: "앗! 넘쳤다!", table: "테이블에 따랐다!", lift: "건배하다 흘렸다!" }[kind];
  el.resultText.innerHTML = pick(fromStage === 1 ? COPY.firstFall : COPY.fall);
  el.resultPrimary.textContent = fromStage === 1 ? "다시 하기 ↺" : "첫 잔부터 다시 ↺";
  showOverlay(el.result);
}

function showFail(kind) {
  game.mode = "result";
  setControls(false);
  game.lastResult = { ok: false, fall: false };
  el.resultEyebrow.textContent = `STAGE ${game.stageIndex + 1} · ${STAGES[game.stageIndex].name}`;
  el.resultTitle.textContent = { flat: "아직 평평해!", short: "너무 모자라!", timeout: "TIME OVER" }[kind];
  el.resultText.innerHTML = pick(COPY[kind]);
  el.resultPrimary.textContent = "이 잔 다시 ↺";
  showOverlay(el.result);
}

function onResultPrimary() {
  const result = game.lastResult;
  if (result?.ok) {
    if (game.stageIndex + 1 >= STAGES.length) return showEnding();
    return startStage(game.stageIndex + 1);
  }
  startStage(result?.fall ? 0 : game.stageIndex);
}

function showEnding() {
  game.mode = "ending";
  el.endingCard.innerHTML = ENDING_HTML;
  const countdown = el.endingCard.querySelector(".countdown");
  el.endingCard.querySelector(".ghost").addEventListener("click", () => {
    clearTimeout(game.endingTimer);
    countdown.textContent = "자랑 다 하면 위 버튼 눌러줘요. 진짜 잔이 기다려요!";
    share();
  });
  showOverlay(el.ending);
  vibrate([60, 60, 60]);
  let remaining = ENDING_SECONDS;
  const tick = () => {
    if (remaining <= 0) {
      location.replace(KYUNG_URL);
      return;
    }
    countdown.textContent = `${remaining}초 뒤 자동으로 이동해요`;
    remaining -= 1;
    game.endingTimer = setTimeout(tick, 1000);
  };
  tick();
}

function showOverlay(node) {
  hideOverlays();
  node.classList.add("is-open");
  node.inert = false;
  node.querySelector(".primary")?.focus({ preventScroll: true });
}

function hideOverlays() {
  for (const node of [el.title, el.intro, el.result, el.ending]) {
    node.classList.remove("is-open");
    node.inert = true;
  }
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function updateGauge() {
  const stage = STAGES[game.stageIndex];
  el.gauge.style.transform = `scaleX(${clamp(1 - game.elapsed / stage.time, 0, 1)})`;
}

function toast(message, cls = "") {
  const node = document.createElement("div");
  node.className = `toast ${cls}`;
  node.textContent = message;
  el.toasts.prepend(node);
  while (el.toasts.children.length > 3) el.toasts.lastChild.remove();
  setTimeout(() => node.classList.add("out"), 2400);
  setTimeout(() => node.remove(), 2750);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function lateNightEgg() {
  const hour = new Date(Date.now() + KST_OFFSET_MS).getUTCHours();
  if (hour < 4 && Math.random() < 0.5) toast("새벽에 이러고 있다니… 막차는 확인했어요?", "gold");
}

function buildShareUrl() {
  const payload = [progress.day.toString(36), progress.best, progress.attempts.toString(36), progress.rid, progress.cheated ? 1 : 0].join(".");
  const sig = fnv1a(payload + SHARE_SALT).toString(36);
  return `${location.origin}${location.pathname}#c=${payload}.${sig}`;
}

function parseChallenge() {
  const match = location.hash.match(/^#c=([0-9a-z.]+)$/);
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length !== 6) return { forged: true };
  const [dayStr, best, attemptsStr, rid, cheat, sig] = parts;
  if (fnv1a([dayStr, best, attemptsStr, rid, cheat].join(".") + SHARE_SALT).toString(36) !== sig) return { forged: true };
  return {
    day: parseInt(dayStr, 36),
    best: clamp(parseInt(best, 10) || 0, 0, STAGES.length),
    attempts: parseInt(attemptsStr, 36) || 0,
    cheat: cheat === "1",
  };
}

function renderChallenge() {
  const c = parseChallenge();
  el.challenge.classList.remove("expired");
  el.challenge.hidden = !c;
  if (!c) return;
  if (c.forged) {
    el.challenge.classList.add("expired");
    el.challenge.textContent = "조작된 도전장 발견! 표면장력은 못 속여요.";
    return;
  }
  if (c.day !== todayKey()) {
    el.challenge.classList.add("expired");
    el.challenge.textContent = "자정이 지나서 만료된 도전장이에요. 오늘 기록으로 새로 붙어봐요!";
    return;
  }
  const eye = c.cheat ? " 👀" : "";
  const h = hoursUntilReset();
  if (c.best === 0) {
    el.challenge.textContent = `📮 도착한 도전장: 친구는 ${c.attempts}번 시도해서 첫 잔도 못 깼대요${eye}. 넌 다르겠지? (${h}시간 남음)`;
  } else if (c.best === STAGES.length) {
    el.challenge.textContent = `📮 도착한 도전장: 친구가 ${c.attempts}번 만에 올클리어${eye}! 사람 맞아? (${h}시간 남음)`;
  } else {
    el.challenge.textContent = `📮 도착한 도전장: 친구는 ${c.attempts}번 시도해서 STAGE ${c.best}까지 깼대요${eye}. 이겨볼까? (${h}시간 남음)`;
  }
}

async function share() {
  rollDay();
  const url = buildShareUrl();
  const reached = progress.best >= STAGES.length ? "올클리어" : progress.best ? `STAGE ${progress.best}까지 클리어` : "첫 잔도 못 깸";
  const text = `🫗 찰랑찰랑 볼록 대작전 — 나 ${progress.attempts}번 시도, ${reached}. 오늘 자정까지 이겨봐`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "찰랑찰랑 볼록 대작전", text, url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast("도전장 복사 완료! 오늘 자정까지 유효해요.", "gold");
  } catch {
    window.prompt("이 링크를 복사해서 보내세요", url);
  }
}

const audio = {
  ctx: null,
  muted: false,
  pourGain: null,
  ensure() {
    if (this.ctx) {
      if (this.ctx.state !== "running") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(2);
    noise.loop = true;
    const band = this.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900;
    band.Q.value = 1.4;
    this.pourGain = this.ctx.createGain();
    this.pourGain.gain.value = 0;
    noise.connect(band).connect(this.pourGain).connect(this.ctx.destination);
    noise.start();
  },
  noiseBuffer(seconds) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  },
  pour(amount) {
    if (!this.pourGain) return;
    const target = this.muted ? 0 : clamp(amount, 0, 1.5) * 0.12;
    this.pourGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  },
  tone(freqFrom, freqTo, seconds, volume) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(freqTo, now + seconds);
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.05);
  },
  glug() {
    this.tone(180, 520, 0.12, 0.25);
  },
  clink() {
    this.tone(2637, 2600, 0.6, 0.12);
    this.tone(3520, 3480, 0.6, 0.12);
  },
  rumble(seconds) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(seconds);
    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 120;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.9, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    src.connect(low).connect(g).connect(this.ctx.destination);
    src.start(now);
  },
};

const view = { w: 0, h: 0, dpr: 1 };

function resize() {
  const rect = el.stage.getBoundingClientRect();
  if (view.w > 0 && rect.width > 0) {
    const ratio = rect.width / view.w;
    game.bottleX *= ratio;
    game.targetX *= ratio;
  }
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = rect.width;
  view.h = rect.height;
  el.canvas.width = Math.round(rect.width * view.dpr);
  el.canvas.height = Math.round(rect.height * view.dpr);
}

function geometry() {
  const stage = STAGES[game.stageIndex];
  const base = Math.min(view.h * 0.4, view.w * 0.5, 260);
  const gh = base * stage.cup;
  const tableY = view.h * 0.8;
  const cx = view.w / 2 + game.glassX;
  const wall = Math.max(2.5, gh * 0.05);
  const topHalf = gh * 0.39;
  const botHalf = gh * 0.28;
  const rimY = tableY - gh;
  const innerBot = tableY - gh * 0.17;
  return { base, gh, tableY, cx, wall, topHalf, botHalf, rimY, innerBot };
}

function innerHalfAt(g, y) {
  const t = (g.innerBot - y) / (g.innerBot - g.rimY);
  return lerp(g.botHalf - g.wall, g.topHalf - g.wall, t);
}

function draw() {
  const { w, h, dpr } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (game.quakeShake > 0) ctx.translate((Math.random() * 2 - 1) * game.quakeShake, (Math.random() * 2 - 1) * game.quakeShake * 0.5);
  const g = geometry();
  if (game.legJitter > 0) g.cx += (Math.random() * 2 - 1) * game.legJitter;
  drawBackdrop(g);
  drawPuddles(g);
  drawLiquid(g);
  drawGlass(g);
  drawGhost(g);
  drawStream(g);
  drawBottle(g);
  drawParticles();
}

function drawBackdrop(g) {
  const { w, h } = view;
  ctx.fillStyle = "#e9a15c";
  ctx.fillRect(-20, g.tableY, w + 40, h - g.tableY + 20);
  ctx.fillStyle = "#d48945";
  for (let y = g.tableY + 18; y < h + 20; y += 22) ctx.fillRect(-20, y, w + 40, 3);
  ctx.fillStyle = "#222";
  ctx.fillRect(-20, g.tableY - 1.5, w + 40, 3);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(g.cx, g.tableY + 3, g.botHalf * 1.15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPuddles(g) {
  ctx.save();
  ctx.fillStyle = "rgba(170, 225, 245, 0.85)";
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  for (const p of game.puddles) {
    ctx.beginPath();
    ctx.ellipse(p.x, g.tableY + 6, p.r, p.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function liquidStyle(g, top) {
  const grad = ctx.createLinearGradient(0, top, 0, g.innerBot);
  if (game.mode === "draining") {
    grad.addColorStop(0, "rgba(90, 170, 255, 0.75)");
    grad.addColorStop(1, "rgba(60, 140, 240, 0.85)");
  } else {
    grad.addColorStop(0, "rgba(110, 200, 236, 0.8)");
    grad.addColorStop(1, "rgba(70, 170, 220, 0.85)");
  }
  return grad;
}

function surfacePath(g, half, surf, tiltPx, domePx) {
  ctx.lineTo(g.cx + half, surf + tiltPx);
  if (domePx > 0) {
    ctx.bezierCurveTo(
      g.cx + half * 0.6, surf + tiltPx * 0.6 - domePx * 1.33,
      g.cx - half * 0.6, surf - tiltPx * 0.6 - domePx * 1.33,
      g.cx - half, surf - tiltPx,
    );
  } else {
    ctx.lineTo(g.cx - half, surf - tiltPx);
  }
}

function drawLiquid(g) {
  const stage = STAGES[game.stageIndex];
  const level = game.level;
  if (level <= 0.001) return;
  const innerH = g.innerBot - g.rimY;
  const tiltPx = game.slosh * innerH * 3;
  const surf = g.innerBot - clamp(level, 0, 1) * innerH;
  const half = innerHalfAt(g, surf);
  const botHalf = g.botHalf - g.wall;
  const domePx = level > 1 ? clamp((level - 1) / stage.tension, 0, 1.2) * Math.max(5, innerH * 0.14) : 0;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g.cx - botHalf, g.innerBot);
  ctx.lineTo(g.cx + botHalf, g.innerBot);
  surfacePath(g, half, surf, tiltPx, domePx);
  ctx.closePath();
  ctx.fillStyle = liquidStyle(g, surf - domePx);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(g.cx + half, surf + tiltPx);
  surfacePath(g, half, surf, tiltPx, domePx);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawGlass(g) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(g.cx - g.topHalf, g.rimY);
  ctx.lineTo(g.cx - g.botHalf, g.tableY);
  ctx.lineTo(g.cx + g.botHalf, g.tableY);
  ctx.lineTo(g.cx + g.topHalf, g.rimY);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(g.cx - g.botHalf + 2, g.innerBot, (g.botHalf - 2) * 2, g.tableY - g.innerBot - 1);
  ctx.beginPath();
  ctx.moveTo(g.cx - g.topHalf + g.wall * 1.4, g.rimY + 6);
  ctx.lineTo(g.cx - g.botHalf + g.wall * 1.4, g.innerBot - 6);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = Math.max(2, g.wall * 0.7);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(g.cx, g.rimY, g.topHalf, Math.max(2, g.gh * 0.035), 0, 0, Math.PI * 2);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawGhost(g) {
  if (game.time > game.ghostUntil) return;
  const innerH = g.innerBot - g.rimY;
  const maxDome = Math.max(5, innerH * 0.14);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  const lines = [
    [g.rimY, "#222"],
    [g.rimY - MIN_DOME * maxDome, "#2a9d5c"],
    [g.rimY - maxDome, "#e8436a"],
  ];
  for (const [y, color] of lines) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(g.cx - g.topHalf - 30, y);
    ctx.lineTo(g.cx + g.topHalf + 30, y);
    ctx.stroke();
  }
  ctx.restore();
}

function bottlePose(g) {
  const length = g.base * 1.05;
  const tremorX = game.plan ? tremorAt(game.elapsed * 1.7, STAGES[game.stageIndex], game.plan) * 350 : 0;
  const tip = { x: game.bottleX + tremorX, y: g.rimY - g.base * 0.4 };
  const angle = lerp(2.95, 3.95, game.tilt);
  return { length, tip, angle };
}

function drawBottle(g) {
  const { length, tip, angle } = bottlePose(g);
  const neckW = length * 0.075;
  const bodyW = length * 0.2;
  const neckLen = length * 0.3;
  const shoulder = length * 0.42;
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -neckW / 2);
  ctx.lineTo(neckLen, -neckW / 2);
  ctx.quadraticCurveTo(shoulder, -bodyW / 2, shoulder + length * 0.06, -bodyW / 2);
  ctx.lineTo(length, -bodyW / 2);
  ctx.quadraticCurveTo(length + 4, 0, length, bodyW / 2);
  ctx.lineTo(shoulder + length * 0.06, bodyW / 2);
  ctx.quadraticCurveTo(shoulder, bodyW / 2, neckLen, neckW / 2);
  ctx.lineTo(0, neckW / 2);
  ctx.closePath();
  const glass = ctx.createLinearGradient(0, -bodyW / 2, 0, bodyW / 2);
  if (game.golden) {
    glass.addColorStop(0, "rgba(255, 241, 168, 0.9)");
    glass.addColorStop(1, "rgba(224, 168, 0, 0.9)");
  } else {
    glass.addColorStop(0, "rgba(255, 255, 255, 0.75)");
    glass.addColorStop(0.5, "rgba(255, 255, 255, 0.45)");
    glass.addColorStop(1, "rgba(235, 242, 245, 0.7)");
  }
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(shoulder + length * 0.08, -bodyW * 0.32);
  ctx.lineTo(length * 0.94, -bodyW * 0.32);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = Math.max(2, bodyW * 0.07);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = "#d9ae3c";
  ctx.strokeStyle = "#a9831f";
  ctx.lineWidth = 1.5;
  ctx.fillRect(-2, -neckW / 2 - 2, length * 0.09, neckW + 4);
  ctx.strokeRect(-2, -neckW / 2 - 2, length * 0.09, neckW + 4);
  const labelX = length * 0.6;
  const labelW = length * 0.33;
  ctx.fillStyle = "#fffdf8";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  ctx.fillRect(labelX, -bodyW / 2 + 2.5, labelW, bodyW - 5);
  ctx.strokeRect(labelX, -bodyW / 2 + 2.5, labelW, bodyW - 5);
  ctx.strokeStyle = "rgba(60, 60, 60, 0.45)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const [at, span] of [[0.12, 0.22], [0.2, 0.32], [0.82, 0.3], [0.9, 0.18]]) {
    ctx.moveTo(labelX + labelW * at, -bodyW * span);
    ctx.lineTo(labelX + labelW * at, bodyW * span);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(labelX + labelW * 0.5, 0, bodyW * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = "#d8283a";
  ctx.fill();
  ctx.restore();
}

function bottleLabelHit(x, y) {
  const g = geometry();
  const { length, tip, angle } = bottlePose(g);
  const dx = x - tip.x;
  const dy = y - tip.y;
  const along = dx * Math.cos(angle) + dy * Math.sin(angle);
  const across = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return along > length * 0.4 && along < length && Math.abs(across) < length * 0.12;
}

function drawStream(g) {
  if (game.flow <= 0.002 || game.mode !== "play") return;
  const stage = STAGES[game.stageIndex];
  const { tip } = bottlePose(g);
  const innerH = g.innerBot - g.rimY;
  const endY = game.inGlass ? g.innerBot - clamp(game.level, 0, 1) * innerH : g.tableY;
  const width = clamp(game.flow / stage.flow, 0.05, 1.6) * Math.max(4, g.base * 0.035);
  const endX = game.landX + Math.sin(game.time * 31) * 0.8;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tip.x - width / 2, tip.y);
  ctx.quadraticCurveTo(endX - width * 0.3, tip.y, endX - width * 0.3, endY);
  ctx.lineTo(endX + width * 0.3, endY);
  ctx.quadraticCurveTo(endX + width * 0.3, tip.y - width, tip.x + width / 2, tip.y);
  ctx.closePath();
  ctx.fillStyle = "rgba(110, 200, 236, 0.9)";
  ctx.strokeStyle = "rgba(34, 34, 34, 0.5)";
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.fillStyle = "rgba(120, 200, 240, 0.95)";
  for (const p of particles) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function pointerX(e) {
  return e.clientX - el.canvas.getBoundingClientRect().left;
}

function onCanvasDown(e) {
  const rect = el.canvas.getBoundingClientRect();
  if (bottleLabelHit(e.clientX - rect.left, e.clientY - rect.top)) tapBottle();
  if (game.mode !== "play") return;
  capturePointer(el.canvas, e);
  game.dragging = true;
  game.targetX = pointerX(e);
  el.hint.classList.add("is-hidden");
}

function onCanvasMove(e) {
  if (game.dragging) game.targetX = pointerX(e);
}

function capturePointer(node, e) {
  try { node.setPointerCapture(e.pointerId); } catch {}
}

function stopDrag() {
  game.dragging = false;
}

function tapBottle() {
  const now = performance.now();
  game.bottleTaps = game.bottleTaps.filter((t) => now - t < 2000);
  game.bottleTaps.push(now);
  if (game.bottleTaps.length >= 5) {
    game.bottleTaps = [];
    game.golden = !game.golden;
    toast(game.golden ? "✨ 황금 병 발견! 기분만 두 배 좋아진다." : "원래 병으로 돌아왔다.", "gold");
  }
}

let typed = "";
const heldArrows = { ArrowLeft: false, ArrowRight: false };

function syncKeyDir() {
  game.keyDir = (heldArrows.ArrowRight ? 1 : 0) - (heldArrows.ArrowLeft ? 1 : 0);
}

function onKeyDown(e) {
  if (game.mode !== "play") {
    if (e.repeat && (e.code === "Space" || e.code === "Enter")) e.preventDefault();
    return;
  }
  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) startPour();
    return;
  }
  if (e.code in heldArrows) {
    e.preventDefault();
    heldArrows[e.code] = true;
    syncKeyDir();
    return;
  }
  if (e.code === "Enter") {
    e.preventDefault();
    judge();
    return;
  }
  if (e.key && e.key.length === 1) {
    typed = (typed + e.key.toLowerCase()).slice(-5);
    if (typed === "kyung") {
      game.ghostUntil = game.time + 3;
      progress.cheated = true;
      saveProgress();
      toast("👀 잔의 속마음이 3초간 보인다! (도전장에 기록됨)", "gold");
    }
  }
}

function onKeyUp(e) {
  if (e.code === "Space") stopPour();
  if (e.code in heldArrows) {
    heldArrows[e.code] = false;
    syncKeyDir();
  }
}

function bind() {
  el.canvas.addEventListener("pointerdown", onCanvasDown);
  el.canvas.addEventListener("pointermove", onCanvasMove);
  el.pour.addEventListener("pointerdown", (e) => {
    capturePointer(el.pour, e);
    startPour();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    el.canvas.addEventListener(type, stopDrag);
    el.pour.addEventListener(type, stopPour);
  }
  for (const node of [el.canvas, el.pour, el.cheers]) node.addEventListener("contextmenu", (e) => e.preventDefault());
  for (const node of [el.pour, el.cheers, el.mute]) node.addEventListener("mousedown", (e) => e.preventDefault());
  el.cheers.addEventListener("click", judge);
  el.start.addEventListener("click", () => {
    audio.ensure();
    startStage(progress.at);
  });
  el.go.addEventListener("click", beginPlay);
  el.resultPrimary.addEventListener("click", onResultPrimary);
  el.share.addEventListener("click", share);
  el.mute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    el.mute.textContent = audio.muted ? "🔇" : "🔊";
    el.mute.setAttribute("aria-label", audio.muted ? "소리 켜기" : "소리 끄기");
    audio.pour(0);
  });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => {
    stopPour();
    stopDrag();
    heldArrows.ArrowLeft = false;
    heldArrows.ArrowRight = false;
    syncKeyDir();
  });
  new ResizeObserver(resize).observe(el.stage);
  window.addEventListener("hashchange", renderChallenge);
}

function init() {
  bind();
  resize();
  renderChallenge();
  if (progress.at > 0) el.start.textContent = `이어하기 ▶ STAGE ${progress.at + 1}`;
  if (progress.attempts > 0) {
    el.best.hidden = false;
    el.best.textContent = `🏆 오늘 최고: ${progress.best ? `STAGE ${progress.best} 클리어` : "아직 0잔"} · 흘린 잔 ${progress.falls}`;
  }
  game.stageIndex = progress.at;
  game.bottleX = view.w * 0.34;
  game.targetX = game.bottleX;
  el.hudStage.textContent = game.stageIndex + 1;
  el.hudCup.textContent = STAGES[game.stageIndex].name;
  setControls(false);
  for (const node of [el.intro, el.result, el.ending]) node.inert = true;
  el.start.focus({ preventScroll: true });
  requestAnimationFrame(frame);
}

init();
