import { drawSprite, spriteSize, BALLOON_FRAMES, balloonPalette, CLOUD_GRID, CLOUD_PALETTE, STAR_GRID, STAR_PALETTE, SUN_GRID, SUN_PALETTE, MOON_GRID, MOON_PALETTE, skyPalette } from "./pixelart.js";
import { generateQuest, timeForStage } from "./quests.js";
import { drawHud, hitTestHud, layoutHud, drawStartOverlay, hitTestStartOverlay, drawGameOverOverlay, hitTestGameOverOverlay, drawSoundControls, hitTestSoundControls } from "./hud-ui.js";
import { drawQuestBar, hitTestQuestBar, layoutQuestBar, makeBarrierDebris, drawBarrierDebris, updateBarrierDebris } from "./quest-ui.js";
import { InputHandler } from "./input.js";
import * as sfx from "./audio.js";
import { playMusic, duckMusic, toggleMusic, isMusicOn, setTimeOfDayMix } from "./music.js";
import { calendarForTime, SEASON_SONG_IDS, nightAmount } from "./calendar.js";
import { drawSeasonParticles, SEASON_WEATHER } from "./particles.js";

sfx.registerDuck(duckMusic);

const BEST_KEY = "hdbbbc_best_stage";
const BALLOON_HUES = ["warm", "cool", "pink", "mint"];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "idle"; // idle | playing | answered | burst | gameover
    this.stage = 1;
    // Time flows continuously from the moment the page loads, independent
    // of stage/answers — a day and a year are both real-time clocks (see
    // calendar.js), so the sky slowly runs through its scenes rather than
    // snapping on each correct answer.
    this._clockStart = performance.now();
    this.calendar = calendarForTime(0);
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.hue = BALLOON_HUES[0];
    this.frame = 0;
    this.clouds = [];
    this.stars = [];
    this.shards = [];
    this.barrierDebris = [];
    this.confetti = [];
    this._raf = null;
    this._lastT = 0;
    this.answeredInfo = null;
    this.justBeatBest = false;
    this.streak = 0;
    this._warnedTimer = false;

    this._spawnBackground();
    this._resize();
    window.addEventListener("resize", () => this._resize());

    this.input = new InputHandler(canvas, (x, y) => this._onTap(x, y));
    window.addEventListener("keydown", (e) => this._onKey(e));

    playMusic("title");

    this._lastT = performance.now();
    this._loop(this._lastT);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;

    this.hudBottom = layoutHud(w).bottom;

    // Sprite grids are drawn at 2x their original detail (finer, smoother
    // silhouettes), so pixelSize is halved here to keep on-screen size the
    // same as before.
    this.pixelSize = Math.max(1.5, Math.min(w, h) / 180);
    const balloonSpriteH = BALLOON_FRAMES[0].length * this.pixelSize;
    // Balloon stays fixed near the bottom; the barrier descends toward it.
    this.balloonStartY = h - balloonSpriteH / 2 - 24;
    this.balloonY = this.balloonStartY;
    this.balloonX = w / 2;

    // Barrier travels from just below the HUD down to just above the
    // balloon's head — reaching that point means the nails touch it.
    const barrierM = layoutQuestBar(w, this.hudBottom, this.quest);
    const barrierH = barrierM.bottom - barrierM.top;
    this.barrierStartTop = this.hudBottom;
    this.barrierEndTop = Math.max(this.barrierStartTop, this.balloonStartY - balloonSpriteH / 2 - 16 - barrierH);
    this.barrierTop = this.barrierStartTop;
  }

  _spawnBackground() {
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random(),
        y: Math.random(),
        scale: 1 + Math.random() * 1.5,
        speed: 0.0018 + Math.random() * 0.003,
      });
    }
    for (let i = 0; i < 24; i++) {
      this.stars.push({ x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2 });
    }
  }

  start() {
    this.stage = 1;
    this.shards = [];
    this.confetti = [];
    this.justBeatBest = false;
    this.streak = 0;
    sfx.liftOff();
    playMusic(SEASON_SONG_IDS[this.calendar.season]);
    setTimeOfDayMix(this.calendar.timeOfDay);
    this._nextQuest();
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _nextQuest() {
    this.quest = generateQuest(this.stage);
    this.questDuration = timeForStage(this.stage);
    this.questStart = performance.now();
    this.state = "playing";
    this.answeredInfo = null;
    this._warnedTimer = false;
    // Quest content changed size, so the barrier's real height and travel
    // range may have changed too — recompute before it starts descending.
    this._resize();
  }

  _onAnswer(choice) {
    if (this.state !== "playing") return;
    const correct = choice === this.quest.answer;
    this.answeredInfo = { picked: choice, answer: this.quest.answer, correct };
    if (correct) {
      this.state = "answered";
      this.streak++;
      sfx.answerCorrect(this.streak);
      sfx.barrierBreak();
      this.barrierDebris = makeBarrierDebris(this.width, this.barrierTop, this.quest);
      setTimeout(() => {
        this.stage++;
        if (this.stage - 1 > this.best) {
          this.best = this.stage - 1;
          this.justBeatBest = true;
          localStorage.setItem(BEST_KEY, String(this.best));
          sfx.newBest();
        }
        this._nextQuest();
      }, 550);
    } else {
      this.streak = 0;
      sfx.answerWrong();
      this._burst();
    }
  }

  _burst() {
    this.state = "burst";
    const bx = this.balloonX;
    const by = this.balloonY;
    this.shards = [];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const speed = 60 + Math.random() * 140;
      this.shards.push({
        x: bx,
        y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 1,
      });
    }
    sfx.balloonPop();
    setTimeout(() => this._gameOver(), 900);
  }

  _gameOver() {
    this.state = "gameover";
    this.gameOverAt = performance.now();
    playMusic("gameover");
    if (this.stage - 1 > this.best) {
      this.best = this.stage - 1;
      this.justBeatBest = true;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    if (this.justBeatBest) this._spawnConfetti();
  }

  // A burst of colorful confetti for the "new record" moment on the
  // game-over screen — the one visual a kid actually wants to screenshot
  // and show a friend, so it gets real physics (burst + gravity + drift),
  // not just a static badge.
  _spawnConfetti() {
    const colors = ["#fbbf24", "#f97316", "#ef4444", "#22c55e", "#60a5fa", "#f472b6"];
    this.confetti = [];
    for (let i = 0; i < 60; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = 220 + Math.random() * 260;
      this.confetti.push({
        x: this.width / 2,
        y: this.height * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 10,
        w: 6 + Math.random() * 5,
        h: 9 + Math.random() * 6,
        color: colors[i % colors.length],
        life: 1,
      });
    }
  }

  // --- Input ---------------------------------------------------------

  _onTap(x, y) {
    sfx.resumeAudio();
    const w = this.width;
    const h = this.height;

    // Sound/music toggles live bottom-left on every scene, so check them
    // before any state-specific hit-testing below.
    const soundHit = hitTestSoundControls(w, h, x, y);
    if (soundHit === "sound") {
      const nowMuted = sfx.toggleMute();
      if (!nowMuted) sfx.tap();
      return;
    }
    if (soundHit === "music") {
      const on = toggleMusic();
      if (on) playMusic(this._musicForState());
      sfx.tap();
      return;
    }

    if (this.state === "idle") {
      if (hitTestStartOverlay(w, h, x, y) === "start") {
        sfx.tap();
        this.start();
      }
      return;
    }
    if (this.state === "gameover") {
      if (hitTestGameOverOverlay(w, h, x, y, this.justBeatBest) === "retry") {
        sfx.tap();
        this.start();
      }
      return;
    }
    if (this.state === "playing") {
      const choice = hitTestQuestBar(w, this.barrierTop, this.quest, x, y);
      if (choice !== null) {
        this._onAnswer(choice);
        return;
      }
    }
    if (hitTestHud(w, x, y) === "home") {
      sfx.tap();
      window.location.href = "../../index.html";
    }
  }

  // Which loop should be playing for the current state — used both when
  // entering a state and when re-enabling music after it was toggled off.
  _musicForState() {
    if (this.state === "gameover") return "gameover";
    if (this.state === "playing" || this.state === "answered" || this.state === "burst") {
      return SEASON_SONG_IDS[this.calendar.season];
    }
    return "title";
  }

  _onKey(e) {
    if (this.state !== "playing" || !["1", "2", "3", "4"].includes(e.key)) return;
    const idx = Number(e.key) - 1;
    if (this.quest && this.quest.choices[idx] !== undefined) {
      this._onAnswer(this.quest.choices[idx]);
    }
  }

  // --- Loop ------------------------------------------------------------

  _loop(t) {
    const dt = Math.min(64, t - this._lastT);
    this._lastT = t;
    this._update(t, dt);
    this._draw(t);
    this._raf = requestAnimationFrame((t2) => this._loop(t2));
  }

  _update(t, dt) {
    const prevCalendar = this.calendar;
    this.calendar = calendarForTime(t - this._clockStart);
    // Season/time-of-day only need to touch music on the rare frame where
    // the discrete slot actually changes — playMusic() is already a no-op
    // when the id matches, but gating here keeps setTimeOfDayMix from
    // reapplying the same gain ramp every single frame for no reason.
    if (this.calendar.season !== prevCalendar.season) {
      playMusic(this._musicForState());
    }
    if (this.calendar.timeOfDay !== prevCalendar.timeOfDay) {
      setTimeOfDayMix(this.calendar.timeOfDay);
    }

    // Clouds drift slowly for ambient sky motion.
    for (const c of this.clouds) {
      c.y += c.speed * (dt / 16);
      if (c.y > 1.15) {
        c.y = -0.15;
        c.x = Math.random();
      }
    }

    if (this.state === "playing") {
      const elapsed = t - this.questStart;
      const pct = Math.min(1, elapsed / this.questDuration);
      this.timerFraction = 1 - pct;
      if (!this._warnedTimer && this.timerFraction < 0.3) {
        this._warnedTimer = true;
        sfx.timerWarn();
      }
      // Balloon stays put near the bottom, just bobbing gently; the barrier
      // itself descends toward it as time runs out. Reaching the balloon
      // means the nails touch it and it bursts.
      this.balloonY = this.balloonStartY + Math.sin(t / 500) * 4;
      this.barrierTop = this.barrierStartTop + (this.barrierEndTop - this.barrierStartTop) * pct;
      if (pct >= 1) {
        this._burst();
      }
    } else if (this.state === "answered") {
      // Balloon stays put; only the broken barrier pieces animate away.
      this.balloonY = this.balloonStartY + Math.sin(t / 500) * 4;
      updateBarrierDebris(this.barrierDebris, dt);
    }

    if (this.state === "burst") {
      for (const s of this.shards) {
        s.x += s.vx * (dt / 1000);
        s.y += s.vy * (dt / 1000);
        s.vy += 300 * (dt / 1000);
        s.life -= dt / 900;
      }
    }

    if (this.confetti.length) {
      for (const c of this.confetti) {
        c.x += c.vx * (dt / 1000);
        c.y += c.vy * (dt / 1000);
        c.vy += 420 * (dt / 1000);
        c.rot += c.vrot * (dt / 1000);
        c.life -= dt / 2600;
      }
      this.confetti = this.confetti.filter((c) => c.life > 0);
    }
  }

  _draw(t) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cal = this.calendar;

    const sky = skyPalette(cal.season + cal.seasonProgress, cal.timeOfDayFloat);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars fade in/out with how "night" it currently is, rather than
    // popping on at a hard evening cutoff — matches the sky's own smooth
    // blend as time passes.
    const night = nightAmount(cal.timeOfDayFloat);
    if (night > 0) {
      ctx.save();
      for (const s of this.stars) {
        const tw = 0.5 + 0.5 * Math.sin(t / 400 + s.phase);
        ctx.globalAlpha = (0.25 + tw * 0.4) * night;
        drawSprite(ctx, STAR_GRID, STAR_PALETTE, s.x * w, s.y * h * 0.5, 2);
      }
      ctx.restore();
    }

    // Sun and moon cross-fade over the same ramp, so one visibly dissolves
    // into the other instead of an instant swap at the day/night boundary.
    const sunX = w * 0.85;
    const sunY = h * 0.14;
    const sunMoonSize = this.pixelSize * 1.4;
    if (night < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - night;
      drawSprite(ctx, SUN_GRID, SUN_PALETTE, sunX, sunY, sunMoonSize);
      ctx.restore();
    }
    if (night > 0) {
      ctx.save();
      ctx.globalAlpha = night;
      drawSprite(ctx, MOON_GRID, MOON_PALETTE, sunX, sunY, sunMoonSize);
      ctx.restore();
    }

    for (const c of this.clouds) {
      const ps = Math.max(2, Math.round(this.pixelSize * 0.7 * c.scale));
      drawSprite(ctx, CLOUD_GRID, CLOUD_PALETTE, c.x * w, c.y * h, ps);
    }

    if (this.state === "burst" || this.state === "gameover") {
      this._drawShards(ctx);
    } else {
      this._drawBalloon(ctx);
    }

    drawSeasonParticles(ctx, w, h, SEASON_WEATHER[cal.seasonName], t);

    ctx.save();
    ctx.globalAlpha = sky.overlayAlpha;
    ctx.fillStyle = sky.overlayColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    if (this.state === "answered") {
      drawBarrierDebris(ctx, this.barrierDebris);
      drawHud(ctx, w, this.stage, this.best);
    } else if (this.state === "playing") {
      drawHud(ctx, w, this.stage, this.best);
      drawQuestBar(ctx, w, this.barrierTop, {
        quest: this.quest,
        timerFraction: this.timerFraction ?? 1,
        timerWarn: (this.timerFraction ?? 1) < 0.3,
        answered: this.answeredInfo,
      });
    }

    if (this.state === "idle") {
      drawStartOverlay(ctx, w, h, this.best);
    } else if (this.state === "gameover") {
      const reached = Math.max(1, this.stage - 1);
      drawGameOverOverlay(ctx, w, h, reached, this.best, this.justBeatBest, t - this.gameOverAt);
    }

    if (this.confetti.length) this._drawConfetti(ctx);

    // Sound/music toggles are always on top, on every scene.
    drawSoundControls(ctx, w, h, !sfx.isMuted(), isMusicOn());
  }

  _drawBalloon(ctx) {
    const grid = BALLOON_FRAMES[this.frame];
    const palette = balloonPalette(this.hue);
    const size = spriteSize(grid, this.pixelSize);
    drawSprite(ctx, grid, palette, this.balloonX - size.w / 2, this.balloonY - size.h / 2, this.pixelSize);
  }

  _drawShards(ctx) {
    ctx.save();
    const palette = balloonPalette(this.hue);
    for (const s of this.shards) {
      if (s.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = palette.X;
      const size = this.pixelSize * 1.6;
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    }
    ctx.restore();
  }

  _drawConfetti(ctx) {
    ctx.save();
    for (const c of this.confetti) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.life * 1.5);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.restore();
  }
}
