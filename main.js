const EVENT_START = new Date("2027-03-08T00:00:00+05:30");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const body = document.body;
const hero = document.querySelector("#hero");
const heroIntro = document.querySelector("#hero-intro");
const heroWelcome = document.querySelector("#hero-welcome");
const heroHeading = document.querySelector("#hero-heading");
const startButton = document.querySelector("#start-celebration");
const resetButton = document.querySelector("#reset-hero");
const musicToggle = document.querySelector("#music-toggle");
const audio = document.querySelector("#bg-music");
const calendarButton = document.querySelector("#add-calendar");
const countdownNote = document.querySelector("#countdown-note");
const dateHint = document.querySelector("#date-hint");
const dateRevealed = document.querySelector("#date-revealed");
const gates = [...document.querySelectorAll(".gate-portal")];
const fwCanvas = document.querySelector("#fireworks");

const units = {
  days: document.querySelector("[data-unit='days']"),
  hours: document.querySelector("[data-unit='hours']"),
  minutes: document.querySelector("[data-unit='minutes']"),
  seconds: document.querySelector("[data-unit='seconds']"),
};

let fadeFrame = null;

/* ==========================================================================
   Countdown
   ========================================================================== */
function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const remaining = EVENT_START.getTime() - Date.now();
  if (remaining <= 0) {
    units.days.textContent = "0";
    units.hours.textContent = "00";
    units.minutes.textContent = "00";
    units.seconds.textContent = "00";
    countdownNote.textContent = "The celebrations are here";
    return;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  units.days.textContent = String(Math.floor(totalSeconds / 86400));
  units.hours.textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
  units.minutes.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
  units.seconds.textContent = pad(totalSeconds % 60);
}

/* ==========================================================================
   Local Mangal Rang Audio
   ========================================================================== */
function setMusicUI(playing) {
  musicToggle.setAttribute("aria-pressed", String(playing));
  musicToggle.setAttribute(
    "aria-label",
    playing ? "Pause Mangal Rang" : "Play Mangal Rang"
  );
}

function fadeAudioTo(targetVolume, durationMs, onDone) {
  if (fadeFrame) window.cancelAnimationFrame(fadeFrame);
  const startVolume = audio.volume;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startTime) / durationMs);
    audio.volume = startVolume + (targetVolume - startVolume) * progress;
    if (progress < 1) {
      fadeFrame = window.requestAnimationFrame(step);
    } else {
      fadeFrame = null;
      if (onDone) onDone();
    }
  }

  fadeFrame = window.requestAnimationFrame(step);
}

function playMusic() {
  audio.volume = 0;
  const attempt = audio.play();
  if (attempt && typeof attempt.then === "function") {
    attempt
      .then(() => {
        setMusicUI(true);
        fadeAudioTo(0.85, 900);
      })
      .catch(() => {
        setMusicUI(false);
      });
  } else {
    setMusicUI(true);
    fadeAudioTo(0.85, 900);
  }
}

function pauseMusic() {
  if (audio.paused) {
    setMusicUI(false);
    return;
  }
  setMusicUI(false);
  fadeAudioTo(0, 350, () => {
    audio.pause();
  });
}

/* ==========================================================================
   Golden Fireworks / Firecrackers on Hero Sky
   ========================================================================== */
const fireworks = (() => {
  const ctx = fwCanvas.getContext("2d");
  const PALETTE = [
    "#fff9df",
    "#ffe896",
    "#ffd166",
    "#f7b538",
    "#ff9f43",
    "#fff3c4",
  ];
  let width = 0;
  let height = 0;
  let rockets = [];
  let particles = [];
  let flashes = [];
  let running = false;
  let rafId = null;
  let launchTimer = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    fwCanvas.width = Math.round(width * dpr);
    fwCanvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst(x, y, count = 80, power = 1.25) {
    flashes.push({ x, y, radius: 22 * power, max: 130 * power, alpha: 0.68 });
    const ringColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    for (let i = 0; i < count; i += 1) {
      const isOuter = i < count * 0.72;
      const angle = (Math.PI * 2 * i) / (isOuter ? count * 0.72 : count * 0.28) + (Math.random() - 0.5) * 0.16;
      const speed = (isOuter ? 1.8 + Math.random() * 3.4 : 0.7 + Math.random() * 1.6) * power;
      particles.push({
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: 0.0075 + Math.random() * 0.0075,
        size: isOuter ? 1.8 + Math.random() * 1.8 : 1.3 + Math.random() * 1.2,
        color: isOuter
          ? Math.random() > 0.3
            ? ringColor
            : PALETTE[Math.floor(Math.random() * PALETTE.length)]
          : "#fffbe6",
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  function launchRocket(targetX, targetY, power = 1.2) {
    rockets.push({
      x: targetX + (Math.random() - 0.5) * 32,
      y: height * 0.58,
      targetX,
      targetY,
      vx: (targetX - (targetX + (Math.random() - 0.5) * 20)) * 0.02,
      vy: -7.5 - Math.random() * 2.5,
      power,
    });
  }

  function launchRandom() {
    if (!running || document.hidden || window.scrollY > height * 0.9) return;
    const x = width * (0.14 + Math.random() * 0.72);
    const y = height * (0.14 + Math.random() * 0.34);
    launchRocket(x, y, 1.05 + Math.random() * 0.35);
  }

  function tick() {
    if (!running) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "lighter";

    // Rising golden rockets
    for (let i = rockets.length - 1; i >= 0; i -= 1) {
      const r = rockets[i];
      const prevX = r.x;
      const prevY = r.y;
      r.x += r.vx;
      r.y += r.vy;
      r.vy *= 0.985;

      ctx.strokeStyle = "rgba(255, 232, 160, 0.9)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();

      ctx.fillStyle = "#fff9df";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
      ctx.fill();

      if (r.y <= r.targetY || r.vy > -1.2) {
        burst(r.x, r.y, 76 + Math.floor(Math.random() * 22), r.power);
        rockets.splice(i, 1);
      }
    }

    // Golden sky flashes + warm lake reflection glow
    for (let i = flashes.length - 1; i >= 0; i -= 1) {
      const f = flashes[i];
      f.radius += 3.4;
      f.alpha *= 0.9;
      if (f.alpha < 0.015) {
        flashes.splice(i, 1);
        continue;
      }
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      grad.addColorStop(0, `rgba(255, 240, 178, ${f.alpha})`);
      grad.addColorStop(0.45, `rgba(247, 181, 56, ${f.alpha * 0.45})`);
      grad.addColorStop(1, "rgba(247, 181, 56, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Falling golden willow sparks
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.px = p.x;
      p.py = p.y;
      p.vx *= 0.972;
      p.vy = p.vy * 0.972 + 0.032;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.twinkle += 0.34;

      if (p.alpha <= 0.02) {
        particles.splice(i, 1);
        continue;
      }

      const shimmer = 0.65 + 0.35 * Math.sin(p.twinkle);
      ctx.globalAlpha = Math.max(0, p.alpha * shimmer);

      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.95;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x - p.vx * 3.4, p.y - p.vy * 3.4);
      ctx.stroke();

      ctx.fillStyle = "#fffbe6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    rafId = window.requestAnimationFrame(tick);
  }

  function start() {
    if (REDUCED_MOTION) return;
    resize();
    if (!running) {
      running = true;
      rafId = window.requestAnimationFrame(tick);
    }
    // Grand opening volley of golden firecrackers over Jagmandir
    burst(width * 0.24, height * 0.3, 84, 1.25);
    window.setTimeout(() => running && burst(width * 0.78, height * 0.26, 88, 1.3), 240);
    window.setTimeout(() => running && burst(width * 0.5, height * 0.42, 92, 1.35), 520);
    window.setTimeout(() => running && launchRocket(width * 0.2, height * 0.4, 1.15), 820);
    window.setTimeout(() => running && launchRocket(width * 0.82, height * 0.38, 1.2), 1150);

    if (launchTimer) window.clearInterval(launchTimer);
    launchTimer = window.setInterval(launchRandom, 1450);
  }

  function stop() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (launchTimer) window.clearInterval(launchTimer);
    rockets = [];
    particles = [];
    flashes = [];
    ctx.clearRect(0, 0, width, height);
  }

  window.addEventListener("resize", () => {
    if (running) resize();
  });

  return { start, stop };
})();

/* ==========================================================================
   Start & Reset Celebration Flow
   ========================================================================== */
function startCelebration() {
  if (body.classList.contains("is-lit")) return;
  body.classList.add("is-lit");
  body.classList.remove("is-locked");
  heroIntro.inert = true;
  heroWelcome.inert = false;
  resetButton.hidden = false;
  resetButton.classList.remove("is-faded");
  musicToggle.hidden = false;
  fireworks.start();
  playMusic();
  heroHeading.focus({ preventScroll: true });
}

function resetCelebration() {
  window.scrollTo({ top: 0, behavior: "instant" });
  body.classList.remove("is-lit");
  body.classList.add("is-locked");
  heroIntro.inert = false;
  heroWelcome.inert = true;
  resetButton.hidden = true;
  musicToggle.hidden = true;
  fireworks.stop();
  pauseMusic();
  startButton.focus();
}

startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startCelebration();
});

hero.addEventListener("click", () => {
  if (!body.classList.contains("is-lit")) {
    startCelebration();
  }
});

resetButton.addEventListener("click", resetCelebration);

musicToggle.addEventListener("click", () => {
  if (audio.paused) {
    playMusic();
  } else {
    pauseMusic();
  }
});

function syncResetPill() {
  if (!body.classList.contains("is-lit")) return;
  resetButton.classList.toggle("is-faded", window.scrollY > window.innerHeight * 0.45);
}

window.addEventListener("scroll", syncResetPill, { passive: true });

/* ==========================================================================
   Interactive Golden Date Gates
   ========================================================================== */
gates.forEach((gate) => {
  gate.addEventListener("click", () => {
    const isOpen = gate.classList.toggle("is-open");
    gate.setAttribute("aria-expanded", String(isOpen));
    const allOpen = gates.every((g) => g.classList.contains("is-open"));
    dateRevealed.classList.toggle("is-shown", allOpen);
    dateHint.textContent = allOpen
      ? "✦ Save the dates with us in Kota ✦"
      : "✦ Tap the gates to reveal the date ✦";
  });
});

/* ==========================================================================
   Calendar Download (.ics)
   ========================================================================== */
function buildCalendarIcs() {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Srishti and Yashovardhan//Save the Date//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:srishti-yashovardhan-2027-03-08@save-the-date",
    "DTSTAMP:20261119T131500Z",
    "DTSTART;VALUE=DATE:20270308",
    "DTEND;VALUE=DATE:20270310",
    "SUMMARY:Srishti & Yashovardhan - Save the Date",
    "LOCATION:The Fern Kota\\, Deoli Arab to Naya Nohra Road\\, Kota\\, Rajasthan",
    "DESCRIPTION:Save the date for Srishti and Yashovardhan on 8 and 9 March 2027 at The Fern Kota. https://www.fernhotels.com/city-stays/the-fern-kota",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

calendarButton.addEventListener("click", () => {
  const blob = new Blob([buildCalendarIcs()], {
    type: "text/calendar;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "srishti-yashovardhan-save-the-date.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && body.classList.contains("is-lit") && window.scrollY < 40) {
    resetCelebration();
  }
});

/* ==========================================================================
   Scroll Reveal
   ========================================================================== */
const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealElements.forEach((el) => observer.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add("is-visible"));
}

updateCountdown();
window.setInterval(updateCountdown, 1000);
