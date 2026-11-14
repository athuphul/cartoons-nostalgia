/**
 * Nostalgia TV - 90s Cartoon & Commercial Simulator
 * YouTube IFrame Player & Retro TV Broadcast Engine
 */

(function () {
  'use strict';

  // =========================================================================
  // State
  // =========================================================================
  const state = {
    isPowerOn: false,
    volume: 80,
    isMuted: false,
    currentChannel: 1,
    currentMode: 'broadcast', // 'broadcast' | 'intros' | 'ads' | 'episodes'
    broadcastStep: 'intro',   // 'intro' -> 'episode' -> 'ad'
    currentVideo: null,
    scanlines: true,
    audioCtx: null,

    // Video Collections
    intros: [],
    ads: [],
    episodes: [],

    // Index tracking for continuous play
    indices: {
      intro: 0,
      ad: 0,
      episode: 0
    },

    // Channel metadata
    channels: [
      { num: 1, name: 'CARTOON NETWORK', badge: 'Sunday Flow', mode: 'broadcast', desc: 'Authentic 90s Broadcast: Intro ➔ Episode ➔ Commercial ➔ Next Show' },
      { num: 2, name: 'DOORDARSHAN SUNDAY', badge: 'DD Classics', mode: 'dd_classic', desc: 'Jungle Book (Mowgli), TaleSpin, DuckTales Hindi & vintage DD ads' },
      { num: 3, name: 'POGO & TOONAMI', badge: 'Action/Anime', mode: 'pogo', desc: 'Pokémon, Captain Planet, Powerpuff Girls & Swat Kats' },
      { num: 4, name: 'INTROS MARATHON', badge: 'Themes Only', mode: 'intros', desc: 'Non-stop cartoon title tracks & opening theme songs' },
      { num: 5, name: '90s COMMERCIALS', badge: 'Vintage Ads', mode: 'ads', desc: 'Dhara Jalebi, Nirma, Cadbury, Bajaj Chetak & classic 90s ads' },
      { num: 6, name: 'FULL EPISODES', badge: 'Shows Only', mode: 'episodes', desc: 'Tom & Jerry, Popeye, Jungle Book, Mr. Bean animated episodes' },
      { num: 7, name: 'DISNEY AFTERNOON', badge: 'Disney Kids', mode: 'disney', desc: 'DuckTales, TaleSpin, Aladdin & retro Disney cartoons' },
      { num: 8, name: 'ACTION STRIKE', badge: 'Heroes', mode: 'action', desc: 'Swat Kats, Spider-Man 1994, Superman & animated heroes' },
      { num: 9, name: 'RANDOM RETRO TV', badge: 'Shuffle', mode: 'shuffle', desc: 'Random nostalgic blend across all cartoons and commercial breaks' }
    ]
  };

  // YouTube Player instance
  let ytPlayer = null;
  let isYtReady = false;
  let pendingVideoId = null;
  let osdTimer = null;
  let staticAnimId = null;

  // DOM Elements
  const el = {
    screenGlass: document.getElementById('screenGlass'),
    youtubePlayer: document.getElementById('youtubePlayer'),
    staticCanvas: document.getElementById('staticCanvas'),
    turnOnFlash: document.getElementById('turnOnFlash'),
    scanlinesOverlay: document.getElementById('scanlinesOverlay'),
    crtOsd: document.getElementById('crtOsd'),
    osdChannel: document.getElementById('osdChannel'),
    osdNetwork: document.getElementById('osdNetwork'),
    osdTitle: document.getElementById('osdTitle'),
    osdBadge: document.getElementById('osdBadge'),
    osdVolumeBar: document.getElementById('osdVolumeBar'),
    osdVolumeTicks: document.getElementById('osdVolumeTicks'),
    standbyTurnOnBtn: document.getElementById('standbyTurnOnBtn'),
    nowPlayingTitle: document.getElementById('nowPlayingTitle'),
    currentModePill: document.getElementById('currentModePill'),
    statusDot: document.querySelector('.status-dot'),

    // Remote
    remotePanel: document.getElementById('remoteControlPanel'),
    rugRemoteHotspot: document.getElementById('rugRemoteHotspot'),
    toggleRemoteBtn: document.getElementById('toggleRemoteBtn'),
    closeRemoteBtn: document.getElementById('closeRemoteBtn'),
    remotePowerBtn: document.getElementById('remotePowerBtn'),
    remoteMuteBtn: document.getElementById('remoteMuteBtn'),
    remoteChUp: document.getElementById('remoteChUp'),
    remoteChDown: document.getElementById('remoteChDown'),
    remoteVolUp: document.getElementById('remoteVolUp'),
    remoteVolDown: document.getElementById('remoteVolDown'),
    remoteChDisplay: document.getElementById('remoteChDisplay'),
    remoteLed: document.getElementById('remoteLed'),
    remotePrevVideo: document.getElementById('remotePrevVideo'),
    remoteNextVideo: document.getElementById('remoteNextVideo'),
    remoteShuffleBtn: document.getElementById('remoteShuffleBtn'),
    remoteGuideBtn: document.getElementById('remoteGuideBtn'),
    remoteStaticBtn: document.getElementById('remoteStaticBtn'),

    // TV Bezel Buttons
    bezelPowerBtn: document.getElementById('bezelPowerBtn'),
    bezelChUp: document.getElementById('bezelChUp'),
    bezelChDown: document.getElementById('bezelChDown'),
    bezelVolUp: document.getElementById('bezelVolUp'),
    bezelVolDown: document.getElementById('bezelVolDown'),

    // Guide Modal
    guideModal: document.getElementById('guideModal'),
    openGuideBtn: document.getElementById('openGuideBtn'),
    closeGuideBtn: document.getElementById('closeGuideBtn'),
    toggleScanlinesBtn: document.getElementById('toggleScanlinesBtn'),
    channelsGrid: document.getElementById('channelsGrid'),
    introsList: document.getElementById('introsList'),
    adsList: document.getElementById('adsList'),
    episodesList: document.getElementById('episodesList'),
    introsCount: document.getElementById('introsCount'),
    adsCount: document.getElementById('adsCount'),
    episodesCount: document.getElementById('episodesCount'),
    addVideoForm: document.getElementById('addVideoForm'),
    videoUrlInput: document.getElementById('videoUrlInput'),
    videoTitleInput: document.getElementById('videoTitleInput'),
    videoCategorySelect: document.getElementById('videoCategorySelect'),
    btnPlayNow: document.getElementById('btnPlayNow')
  };

  // =========================================================================
  // Web Audio Synthesizer (Zero External Audio File Dependency)
  // =========================================================================
  function getAudioContext() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        state.audioCtx = new AudioCtx();
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  // Tactile remote button click sound
  function playClickSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Audio autoplay policy
    }
  }

  // Realistic TV Analog Static White Noise Burst
  function playStaticNoise(durationMs = 280) {
    try {
      const ctx = getAudioContext();
      if (!ctx || state.isMuted) return;
      const bufferSize = ctx.sampleRate * (durationMs / 1000);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (durationMs / 1000));

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();
    } catch (e) {
      // Audio error fallback
    }
  }

  // CRT High-pitched power coil whistle & thump
  function playCrtPowerSound(isTurnOn) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (isTurnOn) {
        // Low thump
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);

        // High cathode whistle sweep
        const whistle = ctx.createOscillator();
        const wGain = ctx.createGain();
        whistle.type = 'sine';
        whistle.frequency.setValueAtTime(8000, ctx.currentTime);
        whistle.frequency.exponentialRampToValueAtTime(14500, ctx.currentTime + 0.3);
        wGain.gain.setValueAtTime(0.04, ctx.currentTime);
        wGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        whistle.connect(wGain);
        wGain.connect(ctx.destination);
        whistle.start();
        whistle.stop(ctx.currentTime + 0.36);
      }
    } catch (e) {}
  }

  // =========================================================================
  // Static Snow Generator (Canvas)
  // =========================================================================
  function initStaticCanvas() {
    const canvas = el.staticCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 240;

    function renderStatic() {
      if (canvas.classList.contains('active')) {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        const data = imgData.data;
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
          const val = (Math.random() * 255) | 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      staticAnimId = requestAnimationFrame(renderStatic);
    }
    renderStatic();
  }

  function triggerStaticBurst(durationMs = 350) {
    if (!el.staticCanvas) return;
    el.staticCanvas.classList.add('active');
    playStaticNoise(durationMs);
    setTimeout(() => {
      el.staticCanvas.classList.remove('active');
    }, durationMs);
  }

  // =========================================================================
  // YouTube URL & ID Parser
  // =========================================================================
  function extractYouTubeId(urlOrId) {
    if (!urlOrId) return null;
    const str = String(urlOrId).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
      return str;
    }
    // Match youtube.com/watch?v=, youtu.be/, youtube.com/embed/, etc.
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  // Parse plain text file format: lines of URLs with optional comments
  function parseTextLines(text, defaultCategory = 'intro') {
    const lines = text.split('\n');
    const items = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split('#');
      const urlPart = parts[0].trim();
      const commentPart = parts[1] ? parts[1].trim() : '';
      const id = extractYouTubeId(urlPart);
      if (id) {
        items.push({
          id: id,
          title: commentPart || `Video ${id}`,
          url: urlPart.startsWith('http') ? urlPart : `https://www.youtube.com/watch?v=${id}`,
          category: defaultCategory
        });
      }
    }
    return items;
  }

  // =========================================================================
  // Load Video Lists from JSON / Text
  // =========================================================================
  async function loadDataFiles() {
    try {
      // 1. Intros
      try {
        const res = await fetch('data/intros.json');
        if (res.ok) {
          state.intros = await res.json();
        } else {
          throw new Error('Fallback to txt');
        }
      } catch (e) {
        const resTxt = await fetch('data/intros.txt');
        if (resTxt.ok) {
          state.intros = parseTextLines(await resTxt.text(), 'intro');
        }
      }

      // 2. Ads
      try {
        const res = await fetch('data/ads.json');
        if (res.ok) {
          state.ads = await res.json();
        } else {
          throw new Error('Fallback to txt');
        }
      } catch (e) {
        const resTxt = await fetch('data/ads.txt');
        if (resTxt.ok) {
          state.ads = parseTextLines(await resTxt.text(), 'ad');
        }
      }

      // 3. Episodes
      try {
        const res = await fetch('data/episodes.json');
        if (res.ok) {
          state.episodes = await res.json();
        } else {
          throw new Error('Fallback to txt');
        }
      } catch (e) {
        const resTxt = await fetch('data/episodes.txt');
        if (resTxt.ok) {
          state.episodes = parseTextLines(await resTxt.text(), 'episode');
        }
      }

      // Check localStorage for any user added custom videos
      const savedCustom = localStorage.getItem('nostalgia_custom_videos');
      if (savedCustom) {
        try {
          const custom = JSON.parse(savedCustom);
          if (custom.intros) state.intros.push(...custom.intros);
          if (custom.ads) state.ads.push(...custom.ads);
          if (custom.episodes) state.episodes.push(...custom.episodes);
        } catch (e) {}
      }

      updateGuideCounts();
      renderGuideTabs();
    } catch (err) {
      console.warn('Error loading playlist data files:', err);
    }
  }

  // =========================================================================
  // YouTube IFrame Player Setup
  // =========================================================================
  window.onYouTubeIframeAPIReady = function () {
    isYtReady = true;
    ytPlayer = new YT.Player('youtubePlayer', {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        enablejsapi: 1,
        playsinline: 1,
        origin: window.location.origin
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  };

  function onPlayerReady(event) {
    ytPlayer.setVolume(state.volume);
    if (state.isMuted) {
      ytPlayer.mute();
    }
    if (pendingVideoId && state.isPowerOn) {
      loadVideoById(pendingVideoId);
      pendingVideoId = null;
    }
  }

  function onPlayerStateChange(event) {
    // YT.PlayerState.ENDED = 0
    if (event.data === YT.PlayerState.ENDED) {
      // The hallmark of the TV broadcast simulator: auto-advance to next item!
      playNextVideo(true);
    } else if (event.data === YT.PlayerState.PLAYING) {
      if (el.statusDot) el.statusDot.classList.add('playing');
      if (el.staticCanvas) el.staticCanvas.classList.remove('active');
    } else if (event.data === YT.PlayerState.PAUSED) {
      if (el.statusDot) el.statusDot.classList.remove('playing');
    }
  }

  function onPlayerError(event) {
    console.warn('YouTube Player Error:', event.data);
    // If a video fails to embed (e.g. copyright block or deletion), auto skip after brief static
    triggerStaticBurst(600);
    showOSD('SIGNAL LOST', 'TUNING NEXT PROGRAM...', 'ERROR');
    setTimeout(() => {
      playNextVideo(true);
    }, 1200);
  }

  // =========================================================================
  // TV Power & Display Control
  // =========================================================================
  function togglePower() {
    playClickSound();
    flashRemoteLed();
    if (state.isPowerOn) {
      powerOff();
    } else {
      powerOn();
    }
  }

  function powerOn() {
    state.isPowerOn = true;
    playCrtPowerSound(true);
    triggerStaticBurst(400);

    el.screenGlass.classList.remove('off');
    el.turnOnFlash.classList.add('animating');
    setTimeout(() => {
      el.turnOnFlash.classList.remove('animating');
    }, 600);

    // Update status bar
    el.nowPlayingTitle.textContent = 'Tuning In...';

    // Pick channel video or resume
    tuneToChannel(state.currentChannel, false);
  }

  function powerOff() {
    state.isPowerOn = false;
    el.screenGlass.classList.add('off');
    if (el.statusDot) el.statusDot.classList.remove('playing');
    el.nowPlayingTitle.textContent = 'TV Off';
    if (ytPlayer && ytPlayer.stopVideo) {
      try {
        ytPlayer.stopVideo();
      } catch (e) {}
    }
    hideOSD();
  }

  // =========================================================================
  // Playback & Broadcast Simulation Engine
  // =========================================================================
  function loadVideoById(videoId, videoMeta = null) {
    if (!videoId) return;
    if (!state.isPowerOn) {
      powerOn();
    }

    if (!isYtReady || !ytPlayer || !ytPlayer.loadVideoById) {
      pendingVideoId = videoId;
      return;
    }

    triggerStaticBurst(250);

    try {
      ytPlayer.loadVideoById({
        videoId: videoId,
        startSeconds: 0
      });
      ytPlayer.setVolume(state.volume);
      if (state.isMuted) ytPlayer.mute();
      else ytPlayer.unMute();
    } catch (e) {
      console.warn('Error calling loadVideoById:', e);
    }

    state.currentVideo = videoMeta || { id: videoId, title: `Video ${videoId}` };
    const title = state.currentVideo.title || state.currentVideo.show || `Video ${videoId}`;
    el.nowPlayingTitle.textContent = title;

    // Show OSD
    const ch = state.channels.find(c => c.num === state.currentChannel) || state.channels[0];
    const catLabel = videoMeta ? (videoMeta.category || state.broadcastStep).toUpperCase() : 'TV';
    showOSD(`CH ${String(state.currentChannel).padStart(2, '0')}`, ch.name, title, catLabel);

    // Update active row in guide
    highlightCurrentGuideItem(videoId);
  }

  // Core Sequencer: selects next video according to current Channel & Mode
  function playNextVideo(autoAdvance = false) {
    flashRemoteLed();
    playClickSound();

    const mode = state.currentMode;

    if (mode === 'broadcast') {
      // Sunday Morning Broadcast Flow:
      // Intro ➔ Episode ➔ Commercial Ad Break ➔ Next Intro!
      if (state.broadcastStep === 'intro') {
        state.broadcastStep = 'episode';
        playCategoryNext('episode');
      } else if (state.broadcastStep === 'episode') {
        state.broadcastStep = 'ad';
        playCategoryNext('ad');
      } else {
        state.broadcastStep = 'intro';
        playCategoryNext('intro');
      }
    } else if (mode === 'intros') {
      state.broadcastStep = 'intro';
      playCategoryNext('intro');
    } else if (mode === 'ads') {
      state.broadcastStep = 'ad';
      playCategoryNext('ad');
    } else if (mode === 'episodes') {
      state.broadcastStep = 'episode';
      playCategoryNext('episode');
    } else if (mode === 'dd_classic') {
      // Doordarshan themed: alternate DD intros, episodes and nostalgic ads
      if (state.broadcastStep === 'intro') {
        state.broadcastStep = 'episode';
        playCategoryNext('episode');
      } else if (state.broadcastStep === 'episode') {
        state.broadcastStep = 'ad';
        playCategoryNext('ad');
      } else {
        state.broadcastStep = 'intro';
        playCategoryNext('intro');
      }
    } else if (mode === 'shuffle') {
      // Pick random category and item
      const cats = ['intro', 'episode', 'ad'];
      const chosenCat = cats[Math.floor(Math.random() * cats.length)];
      state.broadcastStep = chosenCat;
      playCategoryRandom(chosenCat);
    } else {
      // Default to broadcast sequence
      state.broadcastStep = state.broadcastStep === 'intro' ? 'episode' : (state.broadcastStep === 'episode' ? 'ad' : 'intro');
      playCategoryNext(state.broadcastStep);
    }
  }

  function playPrevVideo() {
    flashRemoteLed();
    playClickSound();
    const cat = state.broadcastStep || 'intro';
    const list = getListByCategory(cat);
    if (!list || list.length === 0) return;
    state.indices[cat] = (state.indices[cat] - 2 + list.length) % list.length;
    playCategoryNext(cat);
  }

  function playCategoryNext(category) {
    const list = getListByCategory(category);
    if (!list || list.length === 0) {
      // Fallback if empty
      playCategoryNext(category === 'intro' ? 'episode' : 'intro');
      return;
    }
    const idx = state.indices[category] % list.length;
    state.indices[category] = (state.indices[category] + 1) % list.length;
    const item = list[idx];
    const vid = item.id || extractYouTubeId(item.url);
    item.category = category;
    loadVideoById(vid, item);
  }

  function playCategoryRandom(category) {
    const list = getListByCategory(category);
    if (!list || list.length === 0) return;
    const idx = Math.floor(Math.random() * list.length);
    const item = list[idx];
    const vid = item.id || extractYouTubeId(item.url);
    item.category = category;
    loadVideoById(vid, item);
  }

  function getListByCategory(cat) {
    if (cat === 'intro') return state.intros;
    if (cat === 'ad') return state.ads;
    if (cat === 'episode') return state.episodes;
    return state.intros;
  }

  // =========================================================================
  // Channel Tuning & Surfing
  // =========================================================================
  function tuneToChannel(channelNum, playNoise = true) {
    flashRemoteLed();
    if (playNoise) playClickSound();

    state.currentChannel = channelNum;
    el.remoteChDisplay.textContent = `CH ${String(channelNum).padStart(2, '0')}`;

    const ch = state.channels.find(c => c.num === channelNum) || state.channels[0];
    state.currentMode = ch.mode;
    el.currentModePill.textContent = ch.badge.toUpperCase();

    // Update active category buttons on remote
    updateRemoteModeButtons(ch.mode);

    // Highlight active channel card in guide
    document.querySelectorAll('.channel-card').forEach(card => {
      card.classList.toggle('active', parseInt(card.dataset.num, 10) === channelNum);
    });

    if (playNoise) {
      triggerStaticBurst(280);
    }

    // Play starting video for this channel
    if (ch.mode === 'intros') {
      state.broadcastStep = 'intro';
      playCategoryNext('intro');
    } else if (ch.mode === 'ads') {
      state.broadcastStep = 'ad';
      playCategoryNext('ad');
    } else if (ch.mode === 'episodes') {
      state.broadcastStep = 'episode';
      playCategoryNext('episode');
    } else if (ch.mode === 'shuffle') {
      state.broadcastStep = 'intro';
      playCategoryRandom('intro');
    } else {
      // Broadcast modes
      state.broadcastStep = 'intro';
      playCategoryNext('intro');
    }
  }

  function channelUp() {
    let next = state.currentChannel + 1;
    if (next > 9) next = 1;
    tuneToChannel(next);
  }

  function channelDown() {
    let prev = state.currentChannel - 1;
    if (prev < 1) prev = 9;
    tuneToChannel(prev);
  }

  // =========================================================================
  // Volume Controls
  // =========================================================================
  function volumeUp() {
    playClickSound();
    flashRemoteLed();
    state.volume = Math.min(100, state.volume + 10);
    state.isMuted = false;
    applyVolume();
    showVolumeOSD();
  }

  function volumeDown() {
    playClickSound();
    flashRemoteLed();
    state.volume = Math.max(0, state.volume - 10);
    state.isMuted = false;
    applyVolume();
    showVolumeOSD();
  }

  function toggleMute() {
    playClickSound();
    flashRemoteLed();
    state.isMuted = !state.isMuted;
    applyVolume();
    showOSD('AUDIO', state.isMuted ? 'MUTED' : 'UNMUTED');
  }

  function applyVolume() {
    if (ytPlayer && ytPlayer.setVolume) {
      ytPlayer.setVolume(state.volume);
      if (state.isMuted) ytPlayer.mute();
      else ytPlayer.unMute();
    }
  }

  // =========================================================================
  // On-Screen Display (OSD)
  // =========================================================================
  function showOSD(topRowLeft, topRowRight, titleText = '', badgeText = '') {
    if (!state.isPowerOn) return;
    clearTimeout(osdTimer);

    el.osdChannel.textContent = topRowLeft;
    el.osdNetwork.textContent = topRowRight;
    el.osdTitle.textContent = titleText;
    el.osdBadge.textContent = badgeText;
    el.osdBadge.style.display = badgeText ? 'inline-block' : 'none';
    el.osdVolumeBar.classList.remove('visible');

    el.crtOsd.classList.add('visible');
    osdTimer = setTimeout(() => {
      el.crtOsd.classList.remove('visible');
    }, 3800);
  }

  function showVolumeOSD() {
    if (!state.isPowerOn) return;
    clearTimeout(osdTimer);

    const totalTicks = 10;
    const filledTicks = Math.round((state.volume / 100) * totalTicks);
    const tickStr = '■'.repeat(filledTicks) + '□'.repeat(totalTicks - filledTicks);
    el.osdVolumeTicks.textContent = state.isMuted ? 'MUTED' : tickStr;
    el.osdVolumeBar.classList.add('visible');

    el.crtOsd.classList.add('visible');
    osdTimer = setTimeout(() => {
      el.crtOsd.classList.remove('visible');
      el.osdVolumeBar.classList.remove('visible');
    }, 2500);
  }

  function hideOSD() {
    clearTimeout(osdTimer);
    el.crtOsd.classList.remove('visible');
  }

  function flashRemoteLed() {
    if (!el.remoteLed) return;
    el.remoteLed.classList.add('active');
    setTimeout(() => {
      el.remoteLed.classList.remove('active');
    }, 150);
  }

  function updateRemoteModeButtons(mode) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  // =========================================================================
  // Guide & Config Modal UI
  // =========================================================================
  function toggleGuideModal() {
    playClickSound();
    el.guideModal.classList.toggle('hidden');
    if (!el.guideModal.classList.contains('hidden')) {
      renderGuideTabs();
    }
  }

  function updateGuideCounts() {
    el.introsCount.textContent = state.intros.length;
    el.adsCount.textContent = state.ads.length;
    el.episodesCount.textContent = state.episodes.length;
  }

  function renderGuideTabs() {
    renderChannelsTab();
    renderVideoList(el.introsList, state.intros, 'intro');
    renderVideoList(el.adsList, state.ads, 'ad');
    renderVideoList(el.episodesList, state.episodes, 'episode');
  }

  function renderChannelsTab() {
    el.channelsGrid.innerHTML = '';
    state.channels.forEach(ch => {
      const card = document.createElement('div');
      card.className = `channel-card ${state.currentChannel === ch.num ? 'active' : ''}`;
      card.dataset.num = ch.num;
      card.innerHTML = `
        <div class="card-top">
          <span class="card-num">CH ${String(ch.num).padStart(2, '0')}</span>
          <span class="card-badge">${ch.badge}</span>
        </div>
        <div class="card-name">${ch.name}</div>
        <div class="card-desc">${ch.desc}</div>
      `;
      card.addEventListener('click', () => {
        tuneToChannel(ch.num);
        el.guideModal.classList.add('hidden');
      });
      el.channelsGrid.appendChild(card);
    });
  }

  function renderVideoList(container, list, category) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
      container.innerHTML = '<div style="color:#777; font-size:0.85rem; padding: 12px;">No videos configured yet in this category.</div>';
      return;
    }

    list.forEach((item, idx) => {
      const vid = item.id || extractYouTubeId(item.url);
      const isCurrent = state.currentVideo && state.currentVideo.id === vid;
      const row = document.createElement('div');
      row.className = `video-item ${isCurrent ? 'now-playing' : ''}`;
      row.dataset.id = vid;
      row.innerHTML = `
        <div class="item-left">
          <span class="item-idx">${String(idx + 1).padStart(2, '0')}</span>
          <div class="item-info">
            <div class="item-title">${item.title || item.show || item.brand || `Video ${vid}`}</div>
            <div class="item-sub">
              <span>${item.show || item.brand || category.toUpperCase()}</span>
              <span>•</span>
              <code>${vid}</code>
            </div>
          </div>
        </div>
        <div class="item-actions">
          <button class="item-play-btn" title="Play on TV">▶ PLAY</button>
          <button class="item-remove-btn" title="Remove">&times;</button>
        </div>
      `;

      row.querySelector('.item-play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        item.category = category;
        state.broadcastStep = category;
        loadVideoById(vid, item);
        el.guideModal.classList.add('hidden');
      });

      row.querySelector('.item-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeVideo(category, idx);
      });

      container.appendChild(row);
    });
  }

  function highlightCurrentGuideItem(vid) {
    document.querySelectorAll('.video-item').forEach(item => {
      item.classList.toggle('now-playing', item.dataset.id === vid);
    });
  }

  function removeVideo(category, idx) {
    if (!confirm('Remove this video from playlist?')) return;
    const list = getListByCategory(category);
    if (list && list[idx]) {
      list.splice(idx, 1);
      saveCustomVideos();
      updateGuideCounts();
      renderGuideTabs();
    }
  }

  function saveCustomVideos() {
    // Save state to localStorage
    const payload = {
      intros: state.intros,
      ads: state.ads,
      episodes: state.episodes
    };
    try {
      localStorage.setItem('nostalgia_custom_videos', JSON.stringify(payload));
    } catch (e) {}
  }

  window.openAddModalWithCat = function (cat) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const addTab = document.querySelector('[data-tab="add"]');
    const addPane = document.getElementById('tabAdd');
    if (addTab && addPane) {
      addTab.classList.add('active');
      addPane.classList.add('active');
      el.videoCategorySelect.value = cat;
    }
  };

  // =========================================================================
  // Event Listeners & Hotkeys
  // =========================================================================
  function setupEventListeners() {
    // Standby Turn On Button
    if (el.standbyTurnOnBtn) {
      el.standbyTurnOnBtn.addEventListener('click', powerOn);
    }

    // Remote Toggle Button
    if (el.toggleRemoteBtn) {
      el.toggleRemoteBtn.addEventListener('click', () => {
        playClickSound();
        el.remotePanel.classList.toggle('hidden');
      });
    }

    if (el.closeRemoteBtn) {
      el.closeRemoteBtn.addEventListener('click', () => {
        playClickSound();
        el.remotePanel.classList.add('hidden');
      });
    }

    // Rug Remote Hotspot (over remote in living room painting)
    if (el.rugRemoteHotspot) {
      el.rugRemoteHotspot.addEventListener('click', () => {
        playClickSound();
        flashRemoteLed();
        el.remotePanel.classList.remove('hidden');
        if (!state.isPowerOn) {
          powerOn();
        }
      });
    }

    // TV Bezel Micro Buttons
    if (el.bezelPowerBtn) el.bezelPowerBtn.addEventListener('click', togglePower);
    if (el.bezelChUp) el.bezelChUp.addEventListener('click', channelUp);
    if (el.bezelChDown) el.bezelChDown.addEventListener('click', channelDown);
    if (el.bezelVolUp) el.bezelVolUp.addEventListener('click', volumeUp);
    if (el.bezelVolDown) el.bezelVolDown.addEventListener('click', volumeDown);

    // Handheld Remote Buttons
    if (el.remotePowerBtn) el.remotePowerBtn.addEventListener('click', togglePower);
    if (el.remoteMuteBtn) el.remoteMuteBtn.addEventListener('click', toggleMute);
    if (el.remoteChUp) el.remoteChUp.addEventListener('click', channelUp);
    if (el.remoteChDown) el.remoteChDown.addEventListener('click', channelDown);
    if (el.remoteVolUp) el.remoteVolUp.addEventListener('click', volumeUp);
    if (el.remoteVolDown) el.remoteVolDown.addEventListener('click', volumeDown);
    if (el.remoteNextVideo) el.remoteNextVideo.addEventListener('click', () => playNextVideo(false));
    if (el.remotePrevVideo) el.remotePrevVideo.addEventListener('click', playPrevVideo);
    if (el.remoteShuffleBtn) el.remoteShuffleBtn.addEventListener('click', () => {
      tuneToChannel(9);
    });
    if (el.remoteGuideBtn) el.remoteGuideBtn.addEventListener('click', toggleGuideModal);
    if (el.remoteStaticBtn) el.remoteStaticBtn.addEventListener('click', () => {
      playClickSound();
      flashRemoteLed();
      triggerStaticBurst(400);
    });

    // Remote Number Keypad
    document.querySelectorAll('.num-btn[data-channel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = parseInt(btn.dataset.channel, 10);
        if (ch >= 1 && ch <= 9) {
          tuneToChannel(ch);
        } else if (ch === 0) {
          // AV / TV input switch
          playClickSound();
          flashRemoteLed();
          showOSD('VIDEO 1', 'NTSC / PAL 4:3');
        }
      });
    });

    // Remote Mode Buttons (Flow, Intros, Ads, Episodes)
    document.querySelectorAll('.cat-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClickSound();
        flashRemoteLed();
        const mode = btn.dataset.mode;
        state.currentMode = mode;
        updateRemoteModeButtons(mode);
        el.currentModePill.textContent = mode.toUpperCase();
        if (mode === 'broadcast') {
          state.broadcastStep = 'intro';
          playCategoryNext('intro');
        } else if (mode === 'intros') {
          state.broadcastStep = 'intro';
          playCategoryNext('intro');
        } else if (mode === 'ads') {
          state.broadcastStep = 'ad';
          playCategoryNext('ad');
        } else if (mode === 'episodes') {
          state.broadcastStep = 'episode';
          playCategoryNext('episode');
        }
      });
    });

    // Scanlines Toggle
    if (el.toggleScanlinesBtn) {
      el.toggleScanlinesBtn.addEventListener('click', () => {
        playClickSound();
        state.scanlines = !state.scanlines;
        el.scanlinesOverlay.classList.toggle('disabled', !state.scanlines);
        el.toggleScanlinesBtn.style.opacity = state.scanlines ? '1' : '0.6';
      });
    }

    // Guide Modal Tabs
    if (el.openGuideBtn) el.openGuideBtn.addEventListener('click', toggleGuideModal);
    if (el.closeGuideBtn) el.closeGuideBtn.addEventListener('click', toggleGuideModal);

    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        playClickSound();
        const target = tab.dataset.tab;
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.getElementById(`tab${target.charAt(0).toUpperCase() + target.slice(1)}`);
        if (pane) pane.classList.add('active');
      });
    });

    // Add Video Form
    if (el.addVideoForm) {
      el.addVideoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddVideo(false);
      });
    }

    if (el.btnPlayNow) {
      el.btnPlayNow.addEventListener('click', () => {
        handleAddVideo(true);
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (ytPlayer && ytPlayer.getPlayerState) {
          const s = ytPlayer.getPlayerState();
          if (s === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
          else ytPlayer.playVideo();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        togglePower();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        channelUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        channelDown();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        volumeUp();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        volumeDown();
      } else if (e.key >= '1' && e.key <= '9') {
        tuneToChannel(parseInt(e.key, 10));
      } else if (e.key === 'r' || e.key === 'R') {
        el.remotePanel.classList.toggle('hidden');
      } else if (e.key === 'g' || e.key === 'G') {
        toggleGuideModal();
      }
    });
  }

  function handleAddVideo(playImmediately) {
    const rawUrl = el.videoUrlInput.value.trim();
    const vid = extractYouTubeId(rawUrl);
    if (!vid) {
      alert('Please enter a valid YouTube URL or 11-character video ID.');
      return;
    }
    const title = el.videoTitleInput.value.trim() || `YouTube Video (${vid})`;
    const cat = el.videoCategorySelect.value;

    const newItem = {
      id: vid,
      title: title,
      url: `https://www.youtube.com/watch?v=${vid}`,
      category: cat
    };

    const list = getListByCategory(cat);
    list.unshift(newItem);
    saveCustomVideos();
    updateGuideCounts();
    renderGuideTabs();

    el.videoUrlInput.value = '';
    el.videoTitleInput.value = '';

    if (playImmediately) {
      state.broadcastStep = cat;
      loadVideoById(vid, newItem);
      el.guideModal.classList.add('hidden');
    } else {
      alert(`Added "${title}" to ${cat.toUpperCase()} playlist!`);
    }
  }

  // =========================================================================
  // Initialize Application
  // =========================================================================
  async function init() {
    initStaticCanvas();
    setupEventListeners();
    await loadDataFiles();

    // Default standby state
    el.screenGlass.classList.add('off');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
