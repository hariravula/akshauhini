(() => {
  const data = window.AKSHAUHINI_STORY;
  if (!data) return;

  const { story, acts, scenes } = data;
  const actsByNum = Object.fromEntries(acts.map((a) => [a.number, a]));

  // Populate intro & epilogue
  const taglineEl = document.getElementById("story-tagline");
  const prologueEl = document.getElementById("prologue-text");
  const epilogueEl = document.getElementById("epilogue-text");
  const runtimeEl = document.getElementById("runtime-label");

  if (taglineEl) taglineEl.textContent = story.tagline;
  if (prologueEl) prologueEl.textContent = story.prologue;
  if (epilogueEl) epilogueEl.textContent = story.epilogue;

  const totalSec = scenes.reduce((acc, s) => acc + (s.durationSec || 30), 0);
  if (runtimeEl) {
    const mins = Math.round(totalSec / 60);
    runtimeEl.textContent = `~${mins} Min Narrated Story`;
  }

  // Build Act Nav pills
  const actNav = document.getElementById("act-nav");
  acts.forEach((act) => {
    const link = document.createElement("a");
    link.className = "act-pill";
    link.href = `#act-${act.slug}`;
    link.dataset.act = act.slug;
    link.textContent = `Act ${act.number}`;
    link.title = `Act ${act.number}: ${act.title}`;
    actNav.appendChild(link);
  });

  // Build Quick Banner Index strip
  const indexStrip = document.getElementById("banner-index");
  scenes.forEach((scene) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb-btn";
    btn.innerHTML = `
      <img src="images/${scene.imageSlug}-960.webp" alt="${escapeHtml(scene.warrior)} — ${escapeHtml(scene.emblem)}" loading="lazy" width="960" height="540" />
      <span class="thumb-meta">
        <span class="thumb-num">${scene.number} · Act ${scene.act}</span>
        <span class="thumb-name">${escapeHtml(scene.warrior)}</span>
      </span>
    `;
    btn.addEventListener("click", () => {
      const target = document.getElementById(`scene-${scene.number}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    indexStrip.appendChild(btn);
  });

  // Build Chronicle Acts & Scenes
  const root = document.getElementById("chronicle-root");
  acts.forEach((act) => {
    const actScenes = scenes.filter((s) => s.act === act.number);
    const section = document.createElement("section");
    section.className = "act-section";
    section.id = `act-${act.slug}`;
    section.dataset.actSlug = act.slug;

    const container = document.createElement("div");
    container.className = "container";

    container.innerHTML = `
      <header class="act-header">
        <p class="act-roman">Act ${act.number}</p>
        <h2 class="act-title">${escapeHtml(act.title)}</h2>
        <p class="act-subtitle">${escapeHtml(act.subtitle)}</p>
        <p class="act-intro">${escapeHtml(act.intro)}</p>
      </header>
      <div class="scene-list"></div>
    `;

    const list = container.querySelector(".scene-list");
    actScenes.forEach((scene) => {
      const idx = scenes.findIndex((s) => s.id === scene.id);
      const card = document.createElement("article");
      card.className = "scene-card";
      card.id = `scene-${scene.number}`;

      const chips = [];
      if (scene.skill) {
        chips.push(
          `<span class="meta-chip"><strong>Skill:</strong> ${escapeHtml(scene.skill)}</span>`
        );
      }
      if (scene.parvaReference) {
        chips.push(
          `<span class="meta-chip"><strong>Source:</strong> ${escapeHtml(scene.parvaReference)}</span>`
        );
      }
      chips.push(
        `<span class="meta-chip"><strong>Narration:</strong> ~${scene.durationSec}s</span>`
      );

      card.innerHTML = `
        <div class="scene-media">
          <picture>
            <source media="(max-width: 48rem)" type="image/webp" srcset="images/${scene.imageSlug}-960.webp" />
            <source type="image/webp" srcset="images/${scene.imageSlug}-1920.webp" />
            <img
              src="images/${scene.imageSlug}-1920.jpg"
              alt="${escapeHtml(scene.warrior)} bearing the ${escapeHtml(scene.emblem)} banner"
              width="1920"
              height="1080"
              loading="${idx < 2 ? "eager" : "lazy"}"
              decoding="async"
            />
          </picture>
          <div class="scene-media-overlay">
            <span class="scene-badge">Banner ${scene.number} / ${scenes.length}</span>
            <div class="scene-media-tools">
              <button type="button" class="icon-pill js-speak-scene" data-index="${idx}" title="Listen to narration script">
                <span aria-hidden="true">&#128266;</span>
                <span>Listen</span>
              </button>
              <button type="button" class="icon-pill js-open-cinema-at" data-index="${idx}" title="Open in Cinema Mode">
                <span aria-hidden="true">&#9654;</span>
                <span>Cinema</span>
              </button>
              <button type="button" class="icon-pill js-open-lightbox" data-index="${idx}" title="Inspect full artwork">
                <span aria-hidden="true">&#10530;</span>
                <span>Zoom</span>
              </button>
            </div>
          </div>
        </div>

        <div class="scene-body">
          <div class="scene-top">
            <div>
              <h3 class="scene-warrior">${escapeHtml(scene.warrior)}</h3>
              <p class="scene-role">${escapeHtml(scene.role)}</p>
            </div>
            <div class="scene-emblem-block">
              <span class="scene-emblem-label">War Standard</span>
              <p class="scene-emblem-name">${escapeHtml(scene.emblem)}</p>
              <span class="scene-emblem-sanskrit">${escapeHtml(scene.emblemSanskrit)}</span>
            </div>
          </div>

          <div class="scene-tags">${chips.join("")}</div>

          <div class="scene-script-wrap">
            <p class="script-label">Narration Script</p>
            <p class="scene-script">${escapeHtml(scene.script)}</p>
          </div>

          <div class="scene-notes-grid">
            <div class="note-box">
              <h4>Symbolism &amp; Lore</h4>
              <p>${escapeHtml(scene.sourceMeaning)}</p>
            </div>
            <div class="note-box note-box--reflection">
              <h4>For the Inner Battlefield</h4>
              <p>&ldquo;${escapeHtml(scene.reflection)}&rdquo;</p>
            </div>
          </div>
        </div>
      `;

      list.appendChild(card);
    });

    section.appendChild(container);
    root.appendChild(section);
  });

  // Scroll Progress + Active Act Highlight
  const progressBar = document.getElementById("progress-bar");
  const actSections = Array.from(document.querySelectorAll(".act-section"));
  const actPills = Array.from(document.querySelectorAll(".act-pill"));

  const updateScrollUI = () => {
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100)) : 0;
    progressBar.style.width = `${pct.toFixed(2)}%`;

    let activeSlug = null;
    const marker = window.scrollY + window.innerHeight * 0.28;
    for (const sec of actSections) {
      if (sec.offsetTop <= marker) {
        activeSlug = sec.dataset.actSlug;
      }
    }
    actPills.forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.act === activeSlug);
    });
  };

  window.addEventListener("scroll", updateScrollUI, { passive: true });
  updateScrollUI();

  // Speech Synthesis Helper
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  let speakingIndex = null;
  let speakingSource = null; // "card" | "cinema"

  const pickVoice = () => {
    if (!speechSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    return (
      voices.find((v) => /en-IN/i.test(v.lang)) ||
      voices.find((v) => /en-GB/i.test(v.lang) && /natural|google|libby|ryan|daniel/i.test(v.name)) ||
      voices.find((v) => /en-US/i.test(v.lang) && /natural|google|aria|guy/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0]
    );
  };

  const stopSpeech = () => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    speakingIndex = null;
    speakingSource = null;
    refreshSpeechButtons();
  };

  const speakScene = (index, source) => {
    if (!speechSupported) {
      alert("Voice narration is not supported in this browser.");
      return;
    }
    if (speakingIndex === index && speakingSource === source) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();
    const scene = scenes[index];
    const utterance = new SpeechSynthesisUtterance(
      `${scene.warrior}. ${scene.emblem}. ${scene.script}`
    );
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.96;
    utterance.pitch = 1.0;

    speakingIndex = index;
    speakingSource = source;
    refreshSpeechButtons();

    utterance.onend = () => {
      const wasCinema = speakingSource === "cinema";
      const cur = speakingIndex;
      speakingIndex = null;
      speakingSource = null;
      refreshSpeechButtons();
      if (
        wasCinema &&
        cinemaModal.classList.contains("is-open") &&
        cinemaAutoAdvance.checked &&
        cur !== null &&
        cur < scenes.length - 1
      ) {
        renderCinemaSlide(cur + 1, true);
      }
    };

    utterance.onerror = () => {
      speakingIndex = null;
      speakingSource = null;
      refreshSpeechButtons();
    };

    window.speechSynthesis.speak(utterance);
  };

  const refreshSpeechButtons = () => {
    document.querySelectorAll(".js-speak-scene").forEach((btn) => {
      const idx = Number(btn.dataset.index);
      const active = speakingSource === "card" && speakingIndex === idx;
      btn.classList.toggle("is-speaking", active);
      btn.querySelector("span:last-child").textContent = active ? "Stop" : "Listen";
    });

    if (cinemaSpeakBtn) {
      const activeCinema = speakingSource === "cinema" && speakingIndex === currentCinemaIndex;
      cinemaSpeakBtn.innerHTML = activeCinema
        ? `<span aria-hidden="true">&#9632;</span><span>Stop Narration</span>`
        : `<span aria-hidden="true">&#9654;</span><span>Read Aloud</span>`;
    }
  };

  if (speechSupported) {
    window.speechSynthesis.onvoiceschanged = () => {
      pickVoice();
    };
  }

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");

  const openLightbox = (index) => {
    const scene = scenes[index];
    lightboxImg.src = `images/${scene.imageSlug}-1920.webp`;
    lightboxImg.alt = `${scene.warrior} — ${scene.emblem}`;
    lightboxCaption.textContent = `${scene.number} · ${scene.warrior} — ${scene.emblem} (${scene.emblemSanskrit})`;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    if (!cinemaModal.classList.contains("is-open")) {
      document.body.classList.remove("no-scroll");
    }
  };

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Cinema Mode
  const cinemaModal = document.getElementById("cinema-modal");
  const cinemaStage = document.getElementById("cinema-stage");
  const cinemaCounter = document.getElementById("cinema-counter");
  const cinemaImage = document.getElementById("cinema-image");
  const cinemaActKicker = document.getElementById("cinema-act-kicker");
  const cinemaWarrior = document.getElementById("cinema-warrior");
  const cinemaEmblem = document.getElementById("cinema-emblem");
  const cinemaMetaLine = document.getElementById("cinema-meta-line");
  const cinemaScript = document.getElementById("cinema-script");
  const cinemaMeaning = document.getElementById("cinema-meaning");
  const cinemaReflection = document.getElementById("cinema-reflection");
  const cinemaPrev = document.getElementById("cinema-prev");
  const cinemaNext = document.getElementById("cinema-next");
  const cinemaClose = document.getElementById("cinema-close");
  const cinemaDots = document.getElementById("cinema-dots");
  const cinemaSpeakBtn = document.getElementById("cinema-speak");
  const cinemaAutoAdvance = document.getElementById("cinema-autoadvance");
  const cinemaTogglePanel = document.getElementById("cinema-toggle-panel");
  const cinemaVisual = document.getElementById("cinema-visual");

  let currentCinemaIndex = 0;

  scenes.forEach((scene, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "cinema-dot";
    dot.title = `${scene.number} · ${scene.warrior}`;
    dot.setAttribute("aria-label", `Go to banner ${scene.number}: ${scene.warrior}`);
    dot.addEventListener("click", () => {
      const wasSpeaking = speakingSource === "cinema";
      stopSpeech();
      renderCinemaSlide(i, wasSpeaking);
    });
    cinemaDots.appendChild(dot);
  });

  const dotButtons = Array.from(cinemaDots.querySelectorAll(".cinema-dot"));

  const preloadSlideImage = (idx) => {
    if (idx < 0 || idx >= scenes.length) return;
    const pre = new Image();
    pre.src = `images/${scenes[idx].imageSlug}-1920.webp`;
  };

  const renderCinemaSlide = (index, autoSpeak = false) => {
    currentCinemaIndex = Math.max(0, Math.min(scenes.length - 1, index));
    const scene = scenes[currentCinemaIndex];
    const act = actsByNum[scene.act];

    cinemaCounter.textContent = `${scene.number} / ${scenes.length}`;
    cinemaImage.src = `images/${scene.imageSlug}-1920.webp`;
    cinemaImage.alt = `${scene.warrior} bearing the ${scene.emblem} standard`;
    cinemaActKicker.textContent = `Act ${act.number} · ${act.title}`;
    cinemaWarrior.textContent = scene.warrior;
    cinemaEmblem.textContent = `${scene.emblem} (${scene.emblemSanskrit})`;

    const pills = [`<span class="meta-chip">${escapeHtml(scene.role)}</span>`];
    if (scene.skill) {
      pills.push(
        `<span class="meta-chip"><strong>Skill:</strong> ${escapeHtml(scene.skill)}</span>`
      );
    }
    if (scene.parvaReference) {
      pills.push(
        `<span class="meta-chip"><strong>Source:</strong> ${escapeHtml(scene.parvaReference)}</span>`
      );
    }
    cinemaMetaLine.innerHTML = pills.join("");
    cinemaScript.textContent = scene.script;
    cinemaMeaning.textContent = scene.sourceMeaning;
    cinemaReflection.textContent = `"${scene.reflection}"`;

    cinemaPrev.disabled = currentCinemaIndex === 0;
    cinemaNext.disabled = currentCinemaIndex === scenes.length - 1;

    dotButtons.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === currentCinemaIndex);
    });
    dotButtons[currentCinemaIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

    preloadSlideImage(currentCinemaIndex + 1);
    preloadSlideImage(currentCinemaIndex - 1);
    refreshSpeechButtons();

    if (autoSpeak && speechSupported) {
      speakScene(currentCinemaIndex, "cinema");
    }
  };

  const openCinema = (startIndex = 0) => {
    stopSpeech();
    renderCinemaSlide(startIndex, false);
    cinemaModal.classList.add("is-open");
    cinemaModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  };

  const closeCinema = () => {
    stopSpeech();
    cinemaModal.classList.remove("is-open");
    cinemaModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  };

  document.getElementById("open-cinema-nav").addEventListener("click", () => openCinema(0));
  document.getElementById("open-cinema-hero").addEventListener("click", () => openCinema(0));
  document.getElementById("replay-cinema").addEventListener("click", () => openCinema(0));
  cinemaClose.addEventListener("click", closeCinema);

  cinemaPrev.addEventListener("click", () => {
    if (currentCinemaIndex > 0) {
      const wasSpeaking = speakingSource === "cinema";
      stopSpeech();
      renderCinemaSlide(currentCinemaIndex - 1, wasSpeaking);
    }
  });

  cinemaNext.addEventListener("click", () => {
    if (currentCinemaIndex < scenes.length - 1) {
      const wasSpeaking = speakingSource === "cinema";
      stopSpeech();
      renderCinemaSlide(currentCinemaIndex + 1, wasSpeaking);
    }
  });

  cinemaSpeakBtn.addEventListener("click", () => {
    speakScene(currentCinemaIndex, "cinema");
  });

  cinemaTogglePanel.addEventListener("click", () => {
    const hidden = cinemaStage.classList.toggle("is-image-only");
    cinemaTogglePanel.textContent = hidden ? "Show Script" : "Hide Script";
    cinemaTogglePanel.setAttribute("aria-pressed", String(hidden));
  });

  // Delegated handlers for scene cards
  root.addEventListener("click", (e) => {
    const speakBtn = e.target.closest(".js-speak-scene");
    if (speakBtn) {
      speakScene(Number(speakBtn.dataset.index), "card");
      return;
    }

    const cinemaBtn = e.target.closest(".js-open-cinema-at");
    if (cinemaBtn) {
      openCinema(Number(cinemaBtn.dataset.index));
      return;
    }

    const lightboxBtn = e.target.closest(".js-open-lightbox");
    if (lightboxBtn) {
      openLightbox(Number(lightboxBtn.dataset.index));
    }
  });

  // Touch swipe inside Cinema visual
  let touchStartX = null;
  cinemaVisual.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  cinemaVisual.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 48) return;
      const wasSpeaking = speakingSource === "cinema";
      stopSpeech();
      if (dx < 0 && currentCinemaIndex < scenes.length - 1) {
        renderCinemaSlide(currentCinemaIndex + 1, wasSpeaking);
      } else if (dx > 0 && currentCinemaIndex > 0) {
        renderCinemaSlide(currentCinemaIndex - 1, wasSpeaking);
      }
    },
    { passive: true }
  );

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("is-open")) {
      if (e.key === "Escape") closeLightbox();
      return;
    }
    if (!cinemaModal.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      closeCinema();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (currentCinemaIndex < scenes.length - 1) {
        const wasSpeaking = speakingSource === "cinema";
        stopSpeech();
        renderCinemaSlide(currentCinemaIndex + 1, wasSpeaking);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentCinemaIndex > 0) {
        const wasSpeaking = speakingSource === "cinema";
        stopSpeech();
        renderCinemaSlide(currentCinemaIndex - 1, wasSpeaking);
      }
    } else if (e.key === " " && e.target === document.body) {
      e.preventDefault();
      speakScene(currentCinemaIndex, "cinema");
    }
  });

  if (!speechSupported && cinemaSpeakBtn) {
    cinemaSpeakBtn.style.display = "none";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
