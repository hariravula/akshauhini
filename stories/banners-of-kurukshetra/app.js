(() => {
  const data = window.AKSHAUHINI_STORY;
  if (!data) return;

  const audioManifest = window.AKSHAUHINI_AUDIO || { provider: "elevenlabs", tracks: {} };
  const audioTracks = audioManifest.tracks || {};

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

  const totalSec = scenes.reduce((acc, s) => {
    const track = audioTracks[s.number];
    return acc + (track && track.durationSec ? track.durationSec : s.durationSec || 30);
  }, 0);
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
      const track = audioTracks[scene.number];
      const durLabel = track && track.durationSec ? Math.round(track.durationSec) : scene.durationSec;

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
        `<span class="meta-chip"><strong>Narration:</strong> ~${durLabel}s</span>`
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
          <div class="scene-audio-bar" data-audio-bar="${scene.number}">
            <div class="scene-audio-bar-fill"></div>
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
    const pct =
      docHeight > 0
        ? Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100))
        : 0;
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

  // Studio Audio (ElevenLabs MP3) + Web Speech Fallback Engine
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const audioEl = new Audio();
  audioEl.preload = "auto";
  const preloadAudioEl = new Audio();
  preloadAudioEl.preload = "auto";

  const SPEEDS = [0.9, 1.0, 1.15, 1.25];
  let speedIdx = 1;

  // activePlayback: { key: "01"|"prologue"|"epilogue", source: "card"|"cinema"|"bookend", mode: "audio"|"speech", sceneIndex: number|null }
  let activePlayback = null;
  let isAudioPaused = false;

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
  const cinemaScrubber = document.getElementById("cinema-scrubber");
  const cinemaSeek = document.getElementById("cinema-seek");
  const cinemaTimeCurrent = document.getElementById("cinema-time-current");
  const cinemaTimeTotal = document.getElementById("cinema-time-total");
  const cinemaSpeedBtn = document.getElementById("cinema-speed");

  let currentCinemaIndex = 0;

  const formatTime = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getTrackForKey = (key) => {
    const entry = audioTracks[key];
    return entry && entry.file ? entry : null;
  };

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

  const resetCardAudioBars = () => {
    document.querySelectorAll(".scene-audio-bar").forEach((bar) => {
      bar.classList.remove("is-active");
      const fill = bar.querySelector(".scene-audio-bar-fill");
      if (fill) fill.style.width = "0%";
    });
  };

  const stopNarration = () => {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    activePlayback = null;
    isAudioPaused = false;
    resetCardAudioBars();
    if (cinemaSeek) cinemaSeek.value = "0";
    if (cinemaTimeCurrent) cinemaTimeCurrent.textContent = "0:00";
    refreshNarrationUI();
  };

  const handleNarrationEnded = () => {
    const prev = activePlayback;
    activePlayback = null;
    isAudioPaused = false;
    resetCardAudioBars();
    refreshNarrationUI();

    if (
      prev &&
      prev.source === "cinema" &&
      cinemaModal.classList.contains("is-open") &&
      cinemaAutoAdvance.checked &&
      prev.sceneIndex !== null &&
      prev.sceneIndex < scenes.length - 1
    ) {
      renderCinemaSlide(prev.sceneIndex + 1, true);
    }
  };

  audioEl.addEventListener("timeupdate", () => {
    if (!activePlayback || activePlayback.mode !== "audio") return;
    const dur = audioEl.duration || 0;
    const cur = audioEl.currentTime || 0;
    const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

    if (activePlayback.source === "cinema" && cinemaSeek) {
      cinemaSeek.value = pct.toFixed(1);
      cinemaTimeCurrent.textContent = formatTime(cur);
      cinemaTimeTotal.textContent = formatTime(dur);
    } else if (activePlayback.source === "card") {
      const bar = document.querySelector(`[data-audio-bar="${activePlayback.key}"]`);
      if (bar) {
        bar.classList.add("is-active");
        const fill = bar.querySelector(".scene-audio-bar-fill");
        if (fill) fill.style.width = `${pct.toFixed(2)}%`;
      }
    }
  });

  audioEl.addEventListener("loadedmetadata", () => {
    if (activePlayback && activePlayback.source === "cinema" && cinemaTimeTotal) {
      cinemaTimeTotal.textContent = formatTime(audioEl.duration);
    }
  });

  audioEl.addEventListener("ended", handleNarrationEnded);
  audioEl.addEventListener("error", () => {
    // Graceful fallback to Web Speech API if an MP3 fails to load
    const failed = activePlayback;
    if (!failed) return;
    audioEl.pause();
    if (speechSupported) {
      startSpeechFallback(failed.key, failed.source, failed.sceneIndex);
    } else {
      stopNarration();
    }
  });

  const startSpeechFallback = (key, source, sceneIndex) => {
    if (!speechSupported) {
      alert("Audio narration is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();

    let text = "";
    if (key === "prologue") {
      text = `${story.title}. ${story.prologue}`;
    } else if (key === "epilogue") {
      text = `Epilogue. ${story.epilogue}`;
    } else if (sceneIndex !== null) {
      const s = scenes[sceneIndex];
      text = `${s.warrior}. ${s.emblem}. ${s.script}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = SPEEDS[speedIdx] * 0.96;
    utterance.pitch = 1.0;

    activePlayback = { key, source, mode: "speech", sceneIndex };
    isAudioPaused = false;
    refreshNarrationUI();

    utterance.onend = handleNarrationEnded;
    utterance.onerror = () => {
      activePlayback = null;
      isAudioPaused = false;
      refreshNarrationUI();
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleNarration = (key, source, sceneIndex = null) => {
    // Toggle pause/resume or stop if same track is active
    if (activePlayback && activePlayback.key === key && activePlayback.source === source) {
      if (activePlayback.mode === "audio") {
        if (isAudioPaused) {
          audioEl.play().catch(() => {});
          isAudioPaused = false;
        } else {
          audioEl.pause();
          isAudioPaused = true;
        }
        refreshNarrationUI();
      } else {
        stopNarration();
      }
      return;
    }

    stopNarration();
    const track = getTrackForKey(key);
    if (track) {
      activePlayback = { key, source, mode: "audio", sceneIndex };
      isAudioPaused = false;
      audioEl.src = track.file;
      audioEl.playbackRate = SPEEDS[speedIdx];
      audioEl.play().catch(() => {
        startSpeechFallback(key, source, sceneIndex);
      });
      if (sceneIndex !== null && sceneIndex < scenes.length - 1) {
        const nextTrack = getTrackForKey(scenes[sceneIndex + 1].number);
        if (nextTrack) preloadAudioEl.src = nextTrack.file;
      }
      refreshNarrationUI();
    } else {
      startSpeechFallback(key, source, sceneIndex);
    }
  };

  const refreshNarrationUI = () => {
    // Scene cards
    document.querySelectorAll(".js-speak-scene").forEach((btn) => {
      const idx = Number(btn.dataset.index);
      const key = scenes[idx].number;
      const isThis =
        activePlayback && activePlayback.source === "card" && activePlayback.key === key;
      btn.classList.toggle("is-speaking", Boolean(isThis && !isAudioPaused));
      const label = btn.querySelector("span:last-child");
      if (label) {
        if (isThis && activePlayback.mode === "audio") {
          label.textContent = isAudioPaused ? "Resume" : "Pause";
        } else if (isThis) {
          label.textContent = "Stop";
        } else {
          label.textContent = "Listen";
        }
      }
    });

    // Prologue & Epilogue buttons
    document.querySelectorAll(".js-speak-bookend").forEach((btn) => {
      const key = btn.dataset.bookend;
      const isThis =
        activePlayback && activePlayback.source === "bookend" && activePlayback.key === key;
      btn.classList.toggle("is-speaking", Boolean(isThis && !isAudioPaused));
      const label = btn.querySelector("span:last-child");
      if (label) {
        const defaultLabel = key === "epilogue" ? "Listen to Epilogue" : "Listen";
        if (isThis && activePlayback.mode === "audio") {
          label.textContent = isAudioPaused ? "Resume" : "Pause";
        } else if (isThis) {
          label.textContent = "Stop";
        } else {
          label.textContent = defaultLabel;
        }
      }
    });

    // Cinema controls
    const currentScene = scenes[currentCinemaIndex];
    const currentTrack = getTrackForKey(currentScene.number);
    const isCinemaActive =
      activePlayback &&
      activePlayback.source === "cinema" &&
      activePlayback.key === currentScene.number;

    if (cinemaScrubber) {
      cinemaScrubber.hidden = !currentTrack;
      if (currentTrack && !isCinemaActive) {
        cinemaSeek.value = "0";
        cinemaTimeCurrent.textContent = "0:00";
        cinemaTimeTotal.textContent = formatTime(currentTrack.durationSec || currentScene.durationSec);
      }
    }

    if (cinemaSpeedBtn) {
      cinemaSpeedBtn.hidden = !currentTrack;
      cinemaSpeedBtn.textContent = `${SPEEDS[speedIdx]}x`;
    }

    if (cinemaSpeakBtn) {
      if (isCinemaActive && activePlayback.mode === "audio") {
        cinemaSpeakBtn.innerHTML = isAudioPaused
          ? `<span aria-hidden="true">&#9654;</span><span>Resume</span>`
          : `<span aria-hidden="true">&#10074;&#10074;</span><span>Pause</span>`;
      } else if (isCinemaActive) {
        cinemaSpeakBtn.innerHTML = `<span aria-hidden="true">&#9632;</span><span>Stop</span>`;
      } else {
        cinemaSpeakBtn.innerHTML = `<span aria-hidden="true">&#9654;</span><span>${
          currentTrack ? "Play Narration" : "Read Aloud"
        }</span>`;
      }
    }
  };

  if (cinemaSeek) {
    cinemaSeek.addEventListener("input", () => {
      if (activePlayback && activePlayback.mode === "audio" && audioEl.duration) {
        audioEl.currentTime = (Number(cinemaSeek.value) / 100) * audioEl.duration;
      }
    });
  }

  if (cinemaSpeedBtn) {
    cinemaSpeedBtn.addEventListener("click", () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      audioEl.playbackRate = SPEEDS[speedIdx];
      refreshNarrationUI();
    });
  }

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
  scenes.forEach((scene, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "cinema-dot";
    dot.title = `${scene.number} · ${scene.warrior}`;
    dot.setAttribute("aria-label", `Go to banner ${scene.number}: ${scene.warrior}`);
    dot.addEventListener("click", () => {
      const wasPlaying =
        activePlayback && activePlayback.source === "cinema" && !isAudioPaused;
      stopNarration();
      renderCinemaSlide(i, wasPlaying);
    });
    cinemaDots.appendChild(dot);
  });

  const dotButtons = Array.from(cinemaDots.querySelectorAll(".cinema-dot"));

  const preloadSlideImage = (idx) => {
    if (idx < 0 || idx >= scenes.length) return;
    const pre = new Image();
    pre.src = `images/${scenes[idx].imageSlug}-1920.webp`;
  };

  const renderCinemaSlide = (index, autoPlay = false) => {
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
    refreshNarrationUI();

    if (autoPlay) {
      toggleNarration(scene.number, "cinema", currentCinemaIndex);
    }
  };

  const openCinema = (startIndex = 0) => {
    stopNarration();
    renderCinemaSlide(startIndex, false);
    cinemaModal.classList.add("is-open");
    cinemaModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  };

  const closeCinema = () => {
    stopNarration();
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
      const wasPlaying =
        activePlayback && activePlayback.source === "cinema" && !isAudioPaused;
      stopNarration();
      renderCinemaSlide(currentCinemaIndex - 1, wasPlaying);
    }
  });

  cinemaNext.addEventListener("click", () => {
    if (currentCinemaIndex < scenes.length - 1) {
      const wasPlaying =
        activePlayback && activePlayback.source === "cinema" && !isAudioPaused;
      stopNarration();
      renderCinemaSlide(currentCinemaIndex + 1, wasPlaying);
    }
  });

  cinemaSpeakBtn.addEventListener("click", () => {
    const scene = scenes[currentCinemaIndex];
    toggleNarration(scene.number, "cinema", currentCinemaIndex);
  });

  cinemaTogglePanel.addEventListener("click", () => {
    const hidden = cinemaStage.classList.toggle("is-image-only");
    cinemaTogglePanel.textContent = hidden ? "Show Script" : "Hide Script";
    cinemaTogglePanel.setAttribute("aria-pressed", String(hidden));
  });

  // Delegated handlers for scene cards & bookends
  root.addEventListener("click", (e) => {
    const speakBtn = e.target.closest(".js-speak-scene");
    if (speakBtn) {
      const idx = Number(speakBtn.dataset.index);
      toggleNarration(scenes[idx].number, "card", idx);
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

  document.querySelectorAll(".js-speak-bookend").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleNarration(btn.dataset.bookend, "bookend", null);
    });
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
      const wasPlaying =
        activePlayback && activePlayback.source === "cinema" && !isAudioPaused;
      stopNarration();
      if (dx < 0 && currentCinemaIndex < scenes.length - 1) {
        renderCinemaSlide(currentCinemaIndex + 1, wasPlaying);
      } else if (dx > 0 && currentCinemaIndex > 0) {
        renderCinemaSlide(currentCinemaIndex - 1, wasPlaying);
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
        const wasPlaying =
          activePlayback && activePlayback.source === "cinema" && !isAudioPaused;
        stopNarration();
        renderCinemaSlide(currentCinemaIndex + 1, wasPlaying);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentCinemaIndex > 0) {
        const wasPlaying =
          activePlayback && activePlayback.source === "cinema" && !isAudioPaused;
        stopNarration();
        renderCinemaSlide(currentCinemaIndex - 1, wasPlaying);
      }
    } else if (e.key === " " && e.target === document.body) {
      e.preventDefault();
      const scene = scenes[currentCinemaIndex];
      toggleNarration(scene.number, "cinema", currentCinemaIndex);
    }
  });

  if (!speechSupported && Object.keys(audioTracks).length === 0 && cinemaSpeakBtn) {
    cinemaSpeakBtn.style.display = "none";
  }

  refreshNarrationUI();

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
