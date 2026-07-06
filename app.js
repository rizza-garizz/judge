// Application Control Logic for HakimPintar AI Courtroom Simulator

import { appState } from './js/state.js';
import {
  fetchBackendSimulation,
  fetchFreeLLMResponse,
  resetBackendSimulation,
  saveBackendSimulation
} from './js/api.js';

const STORAGE_KEY = "hakimpintar.simulation.v1";
const DEFAULT_USER_CHOICES = {
  putusanSela: null,
  cctvVerified: false,
  gpsVerified: false,
  selectedVerdict: "",
  selectedArticle: "",
  sentenceType: "",
  sentenceValue: 0,
  legalReasoning: ""
};
const DEFAULT_EVALUATION_DETAILS = {
  evidenceScore: 0,
  procedureScore: 0,
  articleScore: 0,
  sentenceScore: 0,
  feedback: ""
};

// Initializer
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  loadPersistedState();
  
  // Initial UI updates
  updateProgressBars();
  
  // Navigation Tabs Setup
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Mobile menu sidebar toggle
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const sidebar = document.querySelector(".sidebar");
  const setSidebarOpen = (isOpen) => {
    if (!sidebar) return;
    sidebar.classList.toggle("active", isOpen);
    document.body.classList.toggle("is-sidebar-open", isOpen);
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", String(isOpen));
      sidebarToggle.setAttribute("aria-label", isOpen ? "Tutup navigasi" : "Buka navigasi");
    }
  };

  window.setMobileSidebarOpen = setSidebarOpen;

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      setSidebarOpen(!sidebar.classList.contains("active"));
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setSidebarOpen(false);
  });

  const resetBtn = document.getElementById("btn-reset-simulation");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetSimulation);
  }

  // Dialogue Controls
  document.getElementById("btn-next-dialogue").addEventListener("click", advanceDialogue);
  document.getElementById("btn-prev-dialogue").addEventListener("click", regressDialogue);
  
  // Human Judge Input Control
  const btnSendJudge = document.getElementById("btn-send-judge");
  if (btnSendJudge) {
    btnSendJudge.addEventListener("click", submitJudgeInput);
  }
  const inputJudge = document.getElementById("human-judge-input");
  if (inputJudge) {
    inputJudge.addEventListener("keypress", (e) => {
      if (e.key === "Enter") submitJudgeInput();
    });
  }

  // Renders
  initSidebarStepper();
  renderAgentProfiles();
  renderComparativeLaws();
  renderSession();
  syncSummaryFromState();
  syncStateFromBackend();
  
  // Deep-linking based on URL hashes
  handleHashRouting();
});

// Navigation Controller
window.switchTab = switchTab;
function switchTab(tabId) {
  // Hide all tabs
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => tab.classList.remove("active"));
  
  // Show target tab
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add("active");
  }
  
  // Update sidebar active menu items
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  menuItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update header title based on active tab
  const tabTitles = {
    "tab-overview": "Ringkasan Praktikum",
    "tab-courtroom": "Ruang Persidangan (Simulator)",
    "tab-agents": "Profil Peran AI",
    "tab-comparative": "Komparasi Hukum Positif",
    "tab-grades": "Penilaian Praktikum"
  };
  
  document.getElementById("current-tab-title").innerText = tabTitles[tabId] || "HakimPintar AI";
  appState.currentTab = tabId;

  if (tabId === "tab-grades" && appState.finalScore > 0) {
    renderGradesTab(false);
  }

  // Close mobile sidebar if open
  if (typeof window.setMobileSidebarOpen === "function") {
    window.setMobileSidebarOpen(false);
  } else {
    document.querySelector(".sidebar")?.classList.remove("active");
  }

  // Invalidate Map size if tab is active (ensures Leaflet renders fully sized tiles)
  if (tabId === "tab-courtroom" && appState.currentSession === 5 && appState.map) {
    setTimeout(() => {
      appState.map.invalidateSize();
    }, 100);
  }

  // Smooth scroll to top of main content
  document.querySelector(".main-content").scrollTop = 0;
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    applyPersistedSnapshot(JSON.parse(raw));
  } catch (error) {
    console.warn("Saved simulation state ignored:", error);
    clearPersistedState();
  }
}

function buildStateSnapshot() {
  return {
    currentSession: appState.currentSession,
    cctvEnhanced: appState.cctvEnhanced,
    cctvActiveFilter: appState.cctvActiveFilter,
    userChoices: appState.userChoices,
    finalScore: appState.finalScore,
    evaluationDetails: {
      evidenceScore: appState.evaluationDetails.evidenceScore,
      procedureScore: appState.evaluationDetails.procedureScore,
      articleScore: appState.evaluationDetails.articleScore,
      sentenceScore: appState.evaluationDetails.sentenceScore
    }
  };
}

function applyPersistedSnapshot(saved) {
  if (!saved || typeof saved !== "object") return;

  const savedSession = Number(saved.currentSession);
  if (Number.isInteger(savedSession) && savedSession >= 1 && savedSession <= TRIAL_SESSIONS.length) {
    appState.currentSession = savedSession;
  }

  appState.cctvEnhanced = Boolean(saved.cctvEnhanced);
  appState.cctvActiveFilter = saved.cctvActiveFilter === "resolution" ? "resolution" : "deblur";
  appState.userChoices = {
    ...DEFAULT_USER_CHOICES,
    ...(saved.userChoices || {})
  };
  appState.finalScore = Number(saved.finalScore) || 0;
  appState.evaluationDetails = {
    ...DEFAULT_EVALUATION_DETAILS,
    evidenceScore: Number(saved.evaluationDetails?.evidenceScore) || 0,
    procedureScore: Number(saved.evaluationDetails?.procedureScore) || 0,
    articleScore: Number(saved.evaluationDetails?.articleScore) || 0,
    sentenceScore: Number(saved.evaluationDetails?.sentenceScore) || 0,
    feedback: ""
  };
}

function persistState() {
  const snapshot = buildStateSnapshot();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Simulation state could not be saved:", error);
  }
  saveBackendSimulation(snapshot);
}

async function syncStateFromBackend() {
  const simulation = await fetchBackendSimulation();
  if (!simulation?.snapshot) return;

  applyPersistedSnapshot(simulation.snapshot);
  initSidebarStepper();
  renderSession();
  syncSummaryFromState();
  if (appState.currentTab === "tab-grades" && appState.finalScore > 0) {
    renderGradesTab(false);
  }
}

function resetSimulation() {
  clearPersistedState();
  resetBackendSimulation();

  appState.currentTab = "tab-overview";
  appState.currentSession = 1;
  appState.dialogueIndex = 0;
  appState.dialogueHistory = [];
  appState.cctvEnhanced = false;
  appState.cctvActiveFilter = "deblur";
  appState.judgeInputSubmitted = false;
  appState.lastJudgeInput = "";
  appState.isGeneratingResponse = false;
  appState.userChoices = { ...DEFAULT_USER_CHOICES };
  appState.finalScore = 0;
  appState.evaluationDetails = { ...DEFAULT_EVALUATION_DETAILS };

  if (appState.map) {
    appState.map.remove();
    appState.map = null;
  }
  appState.mapMarkers = [];
  appState.mapPolyline = null;
  appState.mapInitialized = false;

  const feedbackCard = document.getElementById("grades-feedback-card");
  if (feedbackCard) feedbackCard.style.display = "none";
  document.getElementById("stats-sela-verdict").innerText = "Belum Diputus";
  document.getElementById("stats-final-score").innerText = "- / 100";
  document.getElementById("grades-final-score-lbl").innerText = "-";
  document.getElementById("grades-judgment-status").innerText = "Belum Menyelesaikan Sidang";

  ["1", "2", "3", "4"].forEach((idx) => {
    const bar = document.getElementById(`rubric-bar-${idx}`);
    if (bar) bar.style.width = "0%";
    const score = document.getElementById(`rubric-score-${idx}`);
    if (score) score.innerText = idx === "1" ? "- / 30" : idx === "2" ? "- / 20" : "- / 25";
  });

  initSidebarStepper();
  renderSession();
  switchTab("tab-overview");
  showToast("Simulasi Direset", "Progres lokal sudah dikosongkan dan sidang kembali ke sesi pertama.", "info");
}

function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Simulation state could not be cleared:", error);
  }
}

function syncSummaryFromState() {
  const selaLabel = document.getElementById("stats-sela-verdict");
  if (selaLabel && appState.userChoices.putusanSela) {
    selaLabel.innerText = appState.userChoices.putusanSela === "tolak-eksepsi" ? "Eksepsi Ditolak" : "Eksepsi Diterima";
  }

  const finalLabel = document.getElementById("stats-final-score");
  if (finalLabel && appState.finalScore > 0) {
    finalLabel.innerText = `${appState.finalScore} / 100`;
  }
}

function handleHashRouting() {
  const hash = window.location.hash;
  if (hash) {
    const tabMap = {
      "#overview": "tab-overview",
      "#courtroom": "tab-courtroom",
      "#agents": "tab-agents",
      "#comparative": "tab-comparative",
      "#grades": "tab-grades"
    };
    if (tabMap[hash]) {
      switchTab(tabMap[hash]);
    }
  }
}

// Render Stepper on Sidebar
function initSidebarStepper() {
  const container = document.getElementById("sidebar-stepper");
  if (!container) return;
  container.innerHTML = "";

  TRIAL_SESSIONS.forEach(session => {
    const stepDiv = document.createElement("div");
    stepDiv.className = `step-item`;
    
    if (session.number === appState.currentSession) {
      stepDiv.classList.add("active");
    } else if (session.number < appState.currentSession) {
      stepDiv.classList.add("completed");
    }

    stepDiv.innerHTML = `
      <div class="step-circle">${session.number < appState.currentSession ? '✓' : session.number}</div>
      <div class="step-title">${session.title}</div>
    `;
    
    // Allow going back to previous sessions
    stepDiv.addEventListener("click", () => {
      if (session.number <= appState.currentSession) {
        jumpToSession(session.number);
      }
    });
    
    container.appendChild(stepDiv);
  });
}

function jumpToSession(sessionNumber) {
  appState.currentSession = sessionNumber;
  appState.dialogueIndex = 0;
  appState.dialogueHistory = [];
  persistState();
  initSidebarStepper();
  renderSession();
}

// Render Session Details & Widget
function renderSession() {
  const session = TRIAL_SESSIONS[appState.currentSession - 1];
  if (!session) return;

  // Update Header text details
  document.getElementById("court-session-badge").innerText = `Sesi ${session.number}: ${session.title}`;
  document.getElementById("court-session-title").innerText = session.title;
  document.getElementById("court-session-desc").innerText = session.description;
  document.getElementById("court-guideline-text").innerText = session.guideline;

  // Reset dialog view
  const historyContainer = document.getElementById("court-dialogue-history");
  historyContainer.innerHTML = "";
  
  // Set dialog progress indicators
  const totalDialogues = session.dialogues.length;
  document.getElementById("court-session-progress").innerText = `Langkah 1/${totalDialogues}`;
  document.getElementById("dialogue-index-lbl").innerText = `Dialog 1 / ${totalDialogues}`;
  
  // Reset buttons
  document.getElementById("btn-prev-dialogue").disabled = true;
  document.getElementById("btn-next-dialogue").innerText = "Lanjut Percakapan";

  // Update Courtroom seat assignments (Middle seat: Terdakwa or Witness depending on session)
  const seatNameTengah = document.getElementById("seat-name-tengah");
  const seatRoleTengah = document.getElementById("seat-role-tengah");
  
  if (appState.currentSession === 3) {
    seatNameTengah.innerText = "Sandi (Saksi Korban)";
    seatRoleTengah.innerText = "SAKSI KORBAN";
  } else if (appState.currentSession === 4) {
    seatNameTengah.innerText = "Briptu Dian Saputra (Ahli)";
    seatRoleTengah.innerText = "SAKSI AHLI FORENSIK";
  } else {
    seatNameTengah.innerText = "Adi Saputra";
    seatRoleTengah.innerText = "TERDAKWA";
  }

  // Draw first dialogue bubble
  advanceDialogue(true);

  // Load right panel action widget
  loadActionWidget();
  
  // Update stats counters
  document.getElementById("stats-current-session").innerText = `Sesi ${appState.currentSession} / 8`;
  
  // Update progress bar
  updateProgressBars();
  
  // Show toast notification for new session
  if (appState.currentSession > 1) {
    showToast("Sidang Berlanjut", `Memasuki Sesi ${appState.currentSession}: ${session.title}`, "info");
  }
}

// Manage Dialog Flow
async function advanceDialogue(isInitial = false) {
  if (appState.isGeneratingResponse) return;
  // If triggered by DOM click event, isInitial will be an Event object
  if (typeof isInitial !== 'boolean') {
    isInitial = false;
  }

  const session = TRIAL_SESSIONS[appState.currentSession - 1];
  if (!session) return;

  const total = session.dialogues.length;

  if (!isInitial && appState.dialogueIndex < total - 1) {
    appState.dialogueIndex++;
  } else if (!isInitial && appState.dialogueIndex === total - 1) {
    // End of session dialogues -> Proceed to next session
    completeSession();
    return;
  }

  const dialogue = session.dialogues[appState.dialogueIndex];
  const isHakim = dialogue.speaker.includes("Hakim") && !dialogue.speaker.includes("ARIA");
  
  // Highlight speaking role in visual seat map
  highlightSpeakerSeat(dialogue.speaker);

  if (isHakim && !appState.judgeInputSubmitted) {
    // Show Judge Input Area and wait
    document.getElementById("dialogue-controls-footer").style.display = "none";
    document.getElementById("human-judge-input-area").style.display = "flex";
    
    // Setup suggestion
    const suggSpan = document.getElementById("judge-suggestion-text");
    if (suggSpan) {
      suggSpan.onclick = () => {
        document.getElementById("human-judge-input").value = dialogue.text;
        document.getElementById("human-judge-input").focus();
      };
    }
    
    document.getElementById("human-judge-input").value = "";
    document.getElementById("human-judge-input").focus();
    
    document.getElementById("court-session-progress").innerText = `Langkah ${appState.dialogueIndex + 1}/${total}`;
    return; // Halt here until user submits
  }

  const historyContainer = document.getElementById("court-dialogue-history");

  // Determine if we should call LLM
  const isAI = !isHakim && !dialogue.speaker.includes("ARIA");
  let bubbleText = appState.judgeInputSubmitted ? appState.lastJudgeInput : dialogue.text;

  // Only call LLM if it's an AI, not the initial render, and not ARIA
  if (isAI && !isInitial) {
    appState.isGeneratingResponse = true;
    
    const btnNext = document.getElementById("btn-next-dialogue");
    btnNext.disabled = true;
    btnNext.innerHTML = `<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Memproses AI...`;
    lucide.createIcons();
    
    // Typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "dialogue-bubble-container received";
    const typingSpeaker = document.createElement("div");
    typingSpeaker.className = "dialogue-speaker-lbl";
    typingSpeaker.textContent = dialogue.speaker;
    const typingBubble = document.createElement("div");
    typingBubble.className = "dialogue-bubble";
    typingBubble.style.background = "transparent";
    typingBubble.style.border = "none";
    typingBubble.style.padding = "0";
    typingBubble.innerHTML = `
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    typingIndicator.appendChild(typingSpeaker);
    typingIndicator.appendChild(typingBubble);
    historyContainer.appendChild(typingIndicator);
    historyContainer.scrollTop = historyContainer.scrollHeight;

    // Get context
    let previousSpeaker = "Narator";
    let previousText = "Sidang dimulai.";
    if (appState.dialogueIndex > 0) {
       const prev = session.dialogues[appState.dialogueIndex - 1];
       previousSpeaker = prev.speaker;
       previousText = (prev.speaker.includes("Hakim") && appState.lastJudgeInput) ? appState.lastJudgeInput : prev.text;
    }

    bubbleText = await fetchFreeLLMResponse(dialogue.speaker, previousSpeaker, previousText, dialogue.text);
    
    historyContainer.removeChild(typingIndicator);
    appState.isGeneratingResponse = false;
    
    // Crucial fix: re-enable button and reset its text
    btnNext.disabled = false;
    btnNext.innerHTML = `Lanjut Percakapan <i data-lucide="chevron-right"></i>`;
    lucide.createIcons();
  }

  // Create real bubble
  let senderType = "received"; // received (left) or sent (right - for judge)
  if (isHakim) {
    senderType = "sent";
  }

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = `dialogue-bubble-container ${senderType}`;

  const speakerLabel = document.createElement("div");
  speakerLabel.className = "dialogue-speaker-lbl";
  speakerLabel.textContent = dialogue.speaker;

  const bubbleBody = document.createElement("div");
  bubbleBody.className = "dialogue-bubble";
  bubbleBody.textContent = bubbleText;

  bubbleDiv.appendChild(speakerLabel);
  bubbleDiv.appendChild(bubbleBody);
  
  historyContainer.appendChild(bubbleDiv);
  historyContainer.scrollTop = historyContainer.scrollHeight;

  // Reset judge input state for next dialogues
  appState.judgeInputSubmitted = false;
  const inputArea = document.getElementById("human-judge-input-area");
  if (inputArea) inputArea.style.display = "none";
  const footer = document.getElementById("dialogue-controls-footer");
  if (footer) footer.style.display = "flex";

  // Update index labels
  document.getElementById("court-session-progress").innerText = `Langkah ${appState.dialogueIndex + 1}/${total}`;
  document.getElementById("dialogue-index-lbl").innerText = `Dialog ${appState.dialogueIndex + 1} / ${total}`;

  // Toggle prev button
  document.getElementById("btn-prev-dialogue").disabled = appState.dialogueIndex === 0;

  // If last dialogue, change button to "Next Session"
  const btnNext = document.getElementById("btn-next-dialogue");
  if (appState.dialogueIndex === total - 1) {
    if (appState.currentSession === 8) {
      btnNext.innerHTML = `Lihat Skor Evaluasi <i data-lucide="chevron-right"></i>`;
    } else {
      btnNext.innerHTML = `Selesaikan Sesi & Lanjut <i data-lucide="chevron-right"></i>`;
    }
  } else {
    btnNext.innerHTML = `Lanjut Percakapan <i data-lucide="chevron-right"></i>`;
  }
  lucide.createIcons();
}

function submitJudgeInput() {
  const inputEl = document.getElementById("human-judge-input");
  const text = inputEl.value.trim();
  if (!text) return; // Prevent empty submission

  appState.lastJudgeInput = text;
  appState.judgeInputSubmitted = true;
  
  // Render the current dialogue index with the user's input
  advanceDialogue(true);
}

function regressDialogue() {
  if (appState.dialogueIndex > 0) {
    appState.dialogueIndex--;
    
    // Remove last bubble from history DOM
    const historyContainer = document.getElementById("court-dialogue-history");
    if (historyContainer.lastChild) {
      historyContainer.removeChild(historyContainer.lastChild);
    }

    const session = TRIAL_SESSIONS[appState.currentSession - 1];
    const dialogue = session.dialogues[appState.dialogueIndex];
    highlightSpeakerSeat(dialogue.speaker);

    // Update labels
    const total = session.dialogues.length;
    document.getElementById("court-session-progress").innerText = `Langkah ${appState.dialogueIndex + 1}/${total}`;
    document.getElementById("dialogue-index-lbl").innerText = `Dialog ${appState.dialogueIndex + 1} / ${total}`;

    document.getElementById("btn-prev-dialogue").disabled = appState.dialogueIndex === 0;
    
    const btnNext = document.getElementById("btn-next-dialogue");
    btnNext.innerHTML = `Lanjut Percakapan <i data-lucide="chevron-right"></i>`;
    btnNext.disabled = false;
    lucide.createIcons();
  }
}

function highlightSpeakerSeat(speaker) {
  // Clear previous speaker glows
  const seats = document.querySelectorAll(".court-seat");
  seats.forEach(seat => seat.classList.remove("active-speaker"));

  if (speaker.includes("Hakim")) {
    document.getElementById("seat-hakim").classList.add("active-speaker");
  } else if (speaker.includes("Jaksa") || speaker.includes("JPU")) {
    document.getElementById("seat-jaksa").classList.add("active-speaker");
  } else if (speaker.includes("Advokat") || speaker.includes("PH")) {
    document.getElementById("seat-advokat").classList.add("active-speaker");
  } else {
    // Defendant / Witnesses in the middle
    document.getElementById("seat-tengah").classList.add("active-speaker");
  }
}

function completeSession() {
  // Check if session requires interactive action to be completed
  const session = TRIAL_SESSIONS[appState.currentSession - 1];
  
  if (session.interactive) {
    if (appState.currentSession === 2 && !appState.userChoices.putusanSela) {
      showToast("Tindakan Diperlukan", "Anda harus membuat Putusan Sela terlebih dahulu pada widget sebelah kanan.", "warning");
      return;
    }
    if (appState.currentSession === 3 && !appState.userChoices.cctvVerified) {
      showToast("Tindakan Diperlukan", "Anda harus memeriksa dan meningkatkan kualitas CCTV menggunakan AI terlebih dahulu.", "warning");
      return;
    }
    if (appState.currentSession === 4 && !appState.userChoices.gpsVerified) {
      showToast("Tindakan Diperlukan", "Anda harus mensimulasikan jejak koordinat GPS / BTS terlebih dahulu pada timeline peta.", "warning");
      return;
    }
    if (appState.currentSession === 8) {
      // Final Verdict submitted, go to Grades tab
      switchTab("tab-grades");
      return;
    }
  }

  // Go to next session
  appState.currentSession++;
  appState.dialogueIndex = 0;
  appState.dialogueHistory = [];
  persistState();
  
  initSidebarStepper();
  renderSession();
}

// Right panel action widget loader
function loadActionWidget() {
  const title = document.getElementById("action-widget-title");
  const body = document.getElementById("action-widget-body");
  
  if (!body) return;
  body.innerHTML = "";

  const session = TRIAL_SESSIONS[appState.currentSession - 1];

  if (appState.currentSession === 1) {
    title.innerHTML = `<i data-lucide="file-text" style="color: var(--color-primary);"></i> Resume Dakwaan`;
    body.innerHTML = `
      <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
        <p style="margin-bottom: 12px;"><strong>Analisis Unsur Pasal 477 KUHP Baru:</strong></p>
        <ul style="padding-left: 20px; margin-bottom: 16px;">
          <li>Mengambil barang milik orang lain secara ilegal.</li>
          <li>Dilakukan pada malam hari (pukul 23:15).</li>
          <li>Masuk dengan merusak/memanjat (merusak laci dengan obeng).</li>
        </ul>
        <div style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
          <em>Catatan: Sebagai Hakim Ketua, Anda harus mendengarkan apakah Penasihat Hukum akan menyatakan keberatan formal (Eksepsi) atas legalitas dakwaan ini.</em>
        </div>
      </div>
    `;
  }
  else if (appState.currentSession === 2) {
    title.innerHTML = `<i data-lucide="gavel" style="color: var(--color-primary);"></i> Eksepsi & Putusan Sela`;
    
    // Info Dalil
    const infoDiv = document.createElement("div");
    infoDiv.style.fontSize = "0.875rem";
    infoDiv.style.color = "var(--text-secondary)";
    infoDiv.style.marginBottom = "16px";
    infoDiv.innerHTML = `
      <div style="padding: 12px; background: rgba(239, 68, 68, 0.05); border-left: 4px solid var(--color-danger); border-radius: 4px;">
        <strong>Eksepsi:</strong> Penyitaan CCTV/HP melanggar batas 2x24 jam (Pasal 91 KUHAP 2025) & AI Super Resolution dianggap manipulatif.
      </div>
    `;
    body.appendChild(infoDiv);

    // Choice cards for Putusan Sela
    const choicesDiv = document.createElement("div");
    choicesDiv.className = "choice-cards-container";
    
    session.options.forEach(opt => {
      const isSelected = appState.userChoices.putusanSela === opt.id;
      const btn = document.createElement("button");
      btn.className = `choice-card-btn ${isSelected ? 'selected' : ''}`;
      btn.innerHTML = `
        <div class="choice-title">${opt.label}</div>
        <div class="choice-desc">${opt.verdict}</div>
      `;
      btn.addEventListener("click", () => selectPutusanSela(opt.id));
      choicesDiv.appendChild(btn);
    });

    body.appendChild(choicesDiv);

    if (appState.userChoices.putusanSela) {
      const feedbackDiv = document.createElement("div");
      feedbackDiv.style.marginTop = "16px";
      feedbackDiv.style.fontSize = "0.8rem";
      feedbackDiv.style.color = "var(--color-success)";
      const opt = session.options.find(o => o.id === appState.userChoices.putusanSela);
      feedbackDiv.innerHTML = `<strong>Feedback:</strong> ${opt.feedback}`;
      body.appendChild(feedbackDiv);
    }
  }
  else if (appState.currentSession === 3) {
    title.innerHTML = `<i data-lucide="video" style="color: var(--color-primary);"></i> Pemeriksaan Rekaman CCTV`;
    
    // CCTV Enhancer inside the action zone
    const cctvDiv = document.createElement("div");
    cctvDiv.className = "cctv-workspace";
    cctvDiv.innerHTML = `
      <div class="cctv-screen" style="aspect-ratio: 16/9; max-height: 180px;">
        <canvas id="court-action-cctv-raw" style="width: 100%; height:100%;"></canvas>
      </div>

      <div style="display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 8px;">
        <button class="btn btn-primary btn-outline" style="padding: 6px 12px; font-size: 0.75rem;" id="btn-court-deblur">Deblur</button>
        <button class="btn btn-primary btn-outline" style="padding: 6px 12px; font-size: 0.75rem;" id="btn-court-superres">Super Res</button>
        <button class="btn btn-primary" style="padding: 6px 16px; font-size: 0.8rem;" id="btn-court-process-cctv">
          <i data-lucide="wand-2" style="width: 12px; height:12px;"></i> PROSES REKAMAN
        </button>
      </div>

      <div style="margin-top: 10px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
        <p><strong>Hash SHA256 Original:</strong> <span style="font-family: monospace;">8f7a932d...c32a</span></p>
        <p><strong>Hash SHA256 Restored:</strong> <span style="font-family: monospace; color: var(--color-success);" id="cctv-action-hash-res">-</span></p>
      </div>
    `;

    body.appendChild(cctvDiv);
    lucide.createIcons();

    setTimeout(() => {
      initActionCCTVCanvas();
      if (appState.cctvEnhanced) {
        document.getElementById("cctv-action-hash-res").innerText = "d41e21b0...a9f2";
      }

      document.getElementById("btn-court-process-cctv").addEventListener("click", () => {
        const btn = document.getElementById("btn-court-process-cctv");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Memproses...`;
        lucide.createIcons();
        
        setTimeout(() => {
          appState.cctvEnhanced = true;
          appState.userChoices.cctvVerified = true;
          persistState();
          btn.innerHTML = `<i data-lucide="check-circle"></i> Selesai`;
          lucide.createIcons();
          document.getElementById("cctv-action-hash-res").innerText = "d41e21b0...a9f2";
          drawActionCCTV(true);
          showToast("Bukti Diverifikasi", "Integritas hash CCTV tervalidasi setelah pemrosesan rekaman.", "success");
        }, 1500);
      });

      document.getElementById("btn-court-deblur").addEventListener("click", () => {
        appState.cctvActiveFilter = "deblur";
        drawActionCCTV(appState.cctvEnhanced);
      });
      document.getElementById("btn-court-superres").addEventListener("click", () => {
        appState.cctvActiveFilter = "resolution";
        drawActionCCTV(appState.cctvEnhanced);
      });
    }, 100);
  }
  else if (appState.currentSession === 4) {
    title.innerHTML = `<i data-lucide="map" style="color: var(--color-secondary);"></i> Pemetaan Lokasi GPS / BTS`;
    
    // GPS Map Container
    const mapDiv = document.createElement("div");
    mapDiv.className = "map-workspace";
    mapDiv.innerHTML = `
      <div class="map-container" id="court-action-map" style="height: 200px;"></div>
      
      <div style="font-size: 0.8rem; margin-top: 8px;">
        <div style="display:flex; justify-content:space-between; font-family: monospace; color: var(--color-secondary);">
          <span id="court-map-indicator">Log 1 - Kos</span>
          <span id="court-map-time">22:45 WIB</span>
        </div>
        <input type="range" id="court-map-slider" min="0" max="4" value="0" style="width: 100%; accent-color: var(--color-secondary); margin-top: 6px;">
        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;" id="court-map-desc">
          Tarik slider timeline untuk memvalidasi alibi terdakwa.
        </p>
      </div>
    `;

    body.appendChild(mapDiv);

    setTimeout(() => {
      initActionMap();
      document.getElementById("court-map-slider").addEventListener("input", (e) => {
        updateActionMapTimeline(parseInt(e.target.value));
      });
    }, 100);
  }
  else if (appState.currentSession === 5) {
    title.innerHTML = `<i data-lucide="brain" style="color: var(--color-warning);"></i> Kontradiksi Pengakuan`;
    body.innerHTML = `
      <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
        <p style="margin-bottom: 12px;"><strong>Analisis Inkonsistensi Terdakwa:</strong></p>
        <div style="padding: 12px; background: rgba(245, 158, 11, 0.05); border-left: 4px solid var(--color-warning); border-radius: 4px; margin-bottom: 12px;">
          Terdakwa mengaku hanya pergi membeli rokok di Menteng (Kos). Namun, log BTS operator seluler membuktikan ponselnya aktif dan melakukan koneksi transmisi data di wilayah Sudirman (TKP) pada waktu kejahatan (23:15).
        </div>
        <p>Alibi terdakwa terpatahkan secara teknis melalui persesuaian data digital forensik.</p>
      </div>
    `;
  }
  else if (appState.currentSession === 6) {
    title.innerHTML = `<i data-lucide="alert-triangle" style="color: var(--color-danger);"></i> Tuntutan Pidana JPU`;
    body.innerHTML = `
      <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
        <div style="padding: 16px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; text-align: center;">
          <h4 style="color: var(--color-danger); margin-bottom: 8px;">Tuntutan Maksimal</h4>
          <div style="font-size: 1.5rem; font-weight: bold; color: white; margin-bottom: 4px;">5 Tahun Penjara</div>
          <div style="font-size: 1.1rem; color: var(--text-muted);">+ Denda Rp 10.000.000</div>
        </div>
        <p style="margin-top: 12px; text-align: center;">JPU menilai kejahatan terdakwa meresahkan masyarakat dan bukti elektronik telah sah secara materiil.</p>
      </div>
    `;
  }
  else if (appState.currentSession === 7) {
    title.innerHTML = `<i data-lucide="scale" style="color: var(--color-primary);"></i> Pedoman Pemidanaan Baru`;
    body.innerHTML = `
      <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
        <p style="margin-bottom: 12px;"><strong>Reformasi KUHP 2023 Pasal 65:</strong></p>
        <p style="margin-bottom: 12px;">Hakim didorong mengedepankan pidana alternatif apabila ancaman hukuman atau penjara yang dijatuhkan kurang dari 5 tahun.</p>
        <div style="padding: 10px; background: rgba(16, 185, 129, 0.05); border-radius: var(--border-radius-sm); border: 1px solid rgba(16, 185, 129, 0.1);">
          <em>Catatan: Di Sesi berikutnya, Anda dapat memilih menjatuhkan pidana kerja sosial atau pidana pengawasan, alih-alih penjara kurungan langsung, demi pemulihan keadilan.</em>
        </div>
      </div>
    `;
  }
  else if (appState.currentSession === 8) {
    title.innerHTML = `<i data-lucide="gavel" style="color: var(--color-success);"></i> Formulir Putusan Hukum`;
    
    // Verdict Submission Form
    const formDiv = document.createElement("div");
    formDiv.innerHTML = `
      <div class="verdict-form-group">
        <label>Amar Putusan</label>
        <select id="v-verdict">
          <option value="">-- Pilih --</option>
          <option value="guilty">TERBUKTI BERSALAH (Mencuri)</option>
          <option value="acquitted">BEBAS (Tidak Bersalah)</option>
        </select>
      </div>

      <div class="verdict-form-group">
        <label>Penerapan Pasal KUHP 2023</label>
        <select id="v-article">
          <option value="">-- Pilih --</option>
          <option value="pasal-476">Pasal 476 (Pencurian Biasa)</option>
          <option value="pasal-477">Pasal 477 (Pencurian Pemberatan)</option>
          <option value="pasal-lain">Pasal Lain</option>
        </select>
      </div>

      <div class="verdict-form-group">
        <label>Jenis Sanksi Hukuman</label>
        <select id="v-type">
          <option value="">-- Pilih --</option>
          <option value="penjara">Pidana Penjara Kurungan</option>
          <option value="kerja-sosial">Pidana Kerja Sosial (Restorative)</option>
          <option value="pengawasan">Pidana Pengawasan</option>
        </select>
      </div>

      <div class="verdict-form-group">
        <label>Durasi Hukuman</label>
        <input type="text" id="v-value" placeholder="misal: 2 Tahun / 240 Jam">
      </div>

      <div class="verdict-form-group">
        <label>Pertimbangan Hukum Ringkas</label>
        <textarea id="v-reasoning" rows="2" placeholder="Tulis alasan hukum diterimanya bukti elektronik..."></textarea>
      </div>

      <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" id="btn-submit-verdict">
        <i data-lucide="gavel"></i> KETUK PALU PUTUSAN
      </button>
    `;

    body.appendChild(formDiv);
    lucide.createIcons();

    // Attach submit listener
    setTimeout(() => {
      document.getElementById("btn-submit-verdict").addEventListener("click", submitFinalVerdict);
    }, 100);
  }
}

// --- Dynamic CCTV Canvas Logic for Action Zone ---
let courtCCTVActionCtx;

function initActionCCTVCanvas() {
  const canvas = document.getElementById("court-action-cctv-raw");
  if (!canvas) return;
  
  courtCCTVActionCtx = canvas.getContext("2d");
  canvas.width = 320;
  canvas.height = 180;

  drawActionCCTV(appState.cctvEnhanced);
}

function drawActionCCTV(isEnhanced) {
  if (!courtCCTVActionCtx) return;
  const ctx = courtCCTVActionCtx;

  // Clear
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, 320, 180);

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 140, 320, 40);

  // COUNTER RACK
  ctx.fillStyle = "#334155";
  ctx.fillRect(20, 40, 80, 100);

  // SUSPECT
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.arc(200, 80, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(185, 92, 30, 50);

  // Sleeve Logo
  if (isEnhanced) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(208, 104, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#292524";
    ctx.beginPath();
    ctx.arc(208, 104, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Motorbike & License
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(250, 90, 50, 60);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(265, 125, 24, 10);

  if (isEnhanced) {
    ctx.font = "bold 6px monospace";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("B4381KPS", 277, 130);
  }

  // Viewfinder overlay
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 300, 160);

  if (!isEnhanced) {
    // Apply mosaic
    applyMosaicBounds(ctx, 260, 120, 30, 16, 4); // Plate blur
    applyMosaicBounds(ctx, 180, 68, 38, 50, 5); // Suspect blur
  }
}

// Help simulate pixelation specifically
function applyMosaicBounds(ctx, x, y, w, h, size) {
  try {
    const img = ctx.getImageData(x, y, w, h);
    const data = img.data;
    for (let r = 0; r < h; r += size) {
      for (let c = 0; c < w; c += size) {
        const i = (r * w + c) * 4;
        ctx.fillStyle = `rgba(${data[i]}, ${data[i+1]}, ${data[i+2]}, ${data[i+3]/255})`;
        ctx.fillRect(x + c, y + r, size, size);
      }
    }
  } catch(e) {}
}

// Putusan Sela Choice Selection
function selectPutusanSela(choiceId) {
  appState.userChoices.putusanSela = choiceId;
  document.getElementById("stats-sela-verdict").innerText = choiceId === "tolak-eksepsi" ? "Eksepsi Ditolak" : "Eksepsi Diterima";
  persistState();
  
  // Reload widget to show feedback text
  loadActionWidget();
}

// --- Action Map Simulation inside Action Zone ---
function initActionMap() {
  const caseData = appState.activeCase;
  const mapElement = document.getElementById("court-action-map");
  if (!mapElement) return;

  // Clear if map already exists
  if (appState.map) {
    appState.map.remove();
    appState.map = null;
    appState.mapInitialized = false;
  }

  // Centering
  const centerLat = caseData.digitalFootprint.gpsLogs[2].lat;
  const centerLng = caseData.digitalFootprint.gpsLogs[2].lng;
  
  appState.map = L.map('court-action-map', {
    zoomControl: false,
    scrollWheelZoom: false
  }).setView([centerLat, centerLng], 13);

  // Tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(appState.map);

  // Draw Path line
  const coords = caseData.digitalFootprint.gpsLogs.map(log => [log.lat, log.lng]);
  appState.mapPolyline = L.polyline(coords, {
    color: 'var(--color-secondary)',
    weight: 3,
    opacity: 0.7,
    dashArray: '4, 8'
  }).addTo(appState.map);

  // Markers
  appState.mapMarkers = [];
  caseData.digitalFootprint.gpsLogs.forEach((log, idx) => {
    let col = '#6366f1';
    if (idx === 0) col = '#10b981';
    if (idx === 2) col = '#ef4444'; // TKP
    
    const mark = L.circleMarker([log.lat, log.lng], {
      radius: 6,
      fillColor: col,
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(appState.map);

    mark.bindPopup(`<b>${log.label}</b><br>${log.time}`);
    appState.mapMarkers.push(mark);
  });

  appState.mapInitialized = true;
  updateActionMapTimeline(0);
}

function updateActionMapTimeline(val) {
  const log = appState.activeCase.digitalFootprint.gpsLogs[val];
  if (!log || !appState.map) return;

  // Set timeline state
  const slider = document.getElementById("court-map-slider");
  if (slider) slider.value = val;

  document.getElementById("court-map-indicator").innerText = log.label;
  document.getElementById("court-map-time").innerText = `${log.time} WIB`;

  let desc = "";
  if (val === 0) desc = "Sinyal HP aktif di Kos (Menteng) pukul 22:45.";
  else if (val === 1) desc = "Ponsel melaju ke kawasan Sudirman.";
  else if (val === 2) {
    desc = "Ponsel berada di TKP (Sudirman) pukul 23:15. Ini membantah alibi!";
    appState.userChoices.gpsVerified = true; // Mark as verified once they check TKP
    persistState();
  }
  else if (val === 3) desc = "Ponsel bergerak melaju meninggalkan TKP.";
  else if (val === 4) desc = "Ponsel kembali terdeteksi di area Kos Menteng.";

  document.getElementById("court-map-desc").innerText = desc;

  // Pan to
  const marker = appState.mapMarkers[val];
  if (marker) {
    appState.map.panTo(marker.getLatLng());
    marker.openPopup();
  }
}

// --- Submit Verdict & Grading Logic ---
function submitFinalVerdict() {
  const verdict = document.getElementById("v-verdict").value;
  const article = document.getElementById("v-article").value;
  const type = document.getElementById("v-type").value;
  const val = document.getElementById("v-value").value;
  const reasoning = document.getElementById("v-reasoning").value;

  if (!verdict || !article || !type || !val || !reasoning) {
    showToast("Formulir Belum Lengkap", "Harap lengkapi semua isian formulir amar putusan!", "error");
    return;
  }

  // Show Gavel Animation
  const overlay = document.getElementById("gavel-overlay");
  const subText = document.getElementById("gavel-sub");
  
  subText.innerText = verdict === "guilty" ? `Pidana: ${val}` : "Terdakwa Dibebaskan";
  overlay.classList.add("active");
  
  // Play subtle sound if browser allows (optional, skipping actual audio element for now, just timing)
  setTimeout(() => {
    overlay.classList.remove("active");
    // Save state
    appState.userChoices.selectedVerdict = verdict;
    appState.userChoices.selectedArticle = article;
    appState.userChoices.sentenceType = type;
    appState.userChoices.sentenceValue = val;
    appState.userChoices.legalReasoning = reasoning;
    persistState();

    // Calculate scores
    calculatePracticeGrades();
  }, 2500);
}

function calculatePracticeGrades() {
  let scoreEvidence = 0;   // Max 30
  let scoreProcedure = 0;  // Max 20
  let scoreArticle = 0;    // Max 25
  let scoreSentence = 0;   // Max 25
  
  // 1. Evidence Verification score (CCTV and GPS slider checks)
  if (appState.userChoices.cctvVerified) scoreEvidence += 15;
  if (appState.userChoices.gpsVerified) scoreEvidence += 15;

  // 2. Procedural compliance (Putusan Sela choice evaluation)
  // Accepts or rejects. Since both show reasoning, let's look at procedural logic.
  // Both decisions are valid if reasoned. Accepting eksepsi shows strict procedural justice (Pasal 91 KUHAP).
  // Tolak eksepsi shows material justice focus.
  if (appState.userChoices.putusanSela === "terima-eksepsi") {
    scoreProcedure = 20; // Perfect score for respecting procedural strictness
  } else if (appState.userChoices.putusanSela === "tolak-eksepsi") {
    scoreProcedure = 15; // Still good, but slight administrative penalty
  }

  // 3. Article Application (Theft with weight night-time + damage vs simple theft)
  // The correct article is Pasal 477 (Pencurian dengan Pemberatan) because it happened at night (23:15) and involved damage (merusak laci dengan obeng).
  if (appState.userChoices.selectedArticle === "pasal-477") {
    scoreArticle = 25;
  } else if (appState.userChoices.selectedArticle === "pasal-476") {
    scoreArticle = 15; // Inaccurate classification (missed weight factors)
  } else {
    scoreArticle = 5;
  }

  // 4. Sentencing Proportionality (KUHP 2023 alternative punishments)
  // Terdakwa has no criminal record (Pledoi) and value stolen is Rp 15 million.
  // Prison remains legal, but under new KUHP 2023, for offenses where sentence is under 5 years,
  // Alternative punishments (Pidana Kerja Sosial or Pidana Pengawasan) are preferred.
  // Choosing Prison (penjara) gives 15 pts. Choosing Kerja Sosial or Pengawasan gives 25 pts (modern Restorative Justice).
  if (appState.userChoices.selectedVerdict === "guilty") {
    if (appState.userChoices.sentenceType === "kerja-sosial" || appState.userChoices.sentenceType === "pengawasan") {
      scoreSentence = 25; // Aligns with KUHP 2023 policy
    } else {
      scoreSentence = 15; // Traditional penal focus (jail)
    }
  } else {
    // Acquitted (bebas). If they chose acquitted despite heavy GPS and CCTV proof, penalize logic.
    scoreSentence = 5;
    scoreArticle = 5;
  }

  // Total
  const totalScore = scoreEvidence + scoreProcedure + scoreArticle + scoreSentence;
  appState.finalScore = totalScore;

  // Update states
  appState.evaluationDetails = {
    evidenceScore: scoreEvidence,
    procedureScore: scoreProcedure,
    articleScore: scoreArticle,
    sentenceScore: scoreSentence,
    feedback: buildFeedbackText(scoreEvidence, scoreProcedure, scoreArticle, scoreSentence)
  };
  persistState();

  // Render Grade Report UI
  renderGradesTab();
}

function renderGradesTab(shouldSwitchTab = true) {
  if (!appState.evaluationDetails.feedback) {
    appState.evaluationDetails.feedback = buildFeedbackText(
      appState.evaluationDetails.evidenceScore,
      appState.evaluationDetails.procedureScore,
      appState.evaluationDetails.articleScore,
      appState.evaluationDetails.sentenceScore
    );
  }

  document.getElementById("stats-final-score").innerText = `${appState.finalScore} / 100`;

  // Draw Scores
  // Animate SVG Ring
  const circle = document.getElementById("score-ring-circle");
  const totalLength = 389.56; // 2 * PI * 62
  const offset = totalLength - (appState.finalScore / 100) * totalLength;
  
  setTimeout(() => {
    circle.style.strokeDashoffset = offset;
    
    // Assign color class based on score
    circle.classList.remove('grade-a', 'grade-b', 'grade-c', 'grade-d');
    if (appState.finalScore >= 80) circle.classList.add('grade-a');
    else if (appState.finalScore >= 60) circle.classList.add('grade-b');
    else if (appState.finalScore >= 40) circle.classList.add('grade-c');
    else circle.classList.add('grade-d');
  }, 100);

  // Counter animation for final score
  let currentScore = 0;
  const scoreLbl = document.getElementById("grades-final-score-lbl");
  const counterInterval = setInterval(() => {
    if (currentScore >= appState.finalScore) {
      scoreLbl.innerText = appState.finalScore;
      clearInterval(counterInterval);
    } else {
      currentScore += Math.ceil((appState.finalScore - currentScore) / 5) || 1;
      scoreLbl.innerText = currentScore;
    }
  }, 40);

  document.getElementById("grades-judgment-status").innerText = appState.finalScore >= 80 ? "SANGAT KOMPETEN (A)" : appState.finalScore >= 60 ? "CUKUP KOMPETEN (B)" : "BELUM KOMPETEN (C)";
  
  // Progress indicators (add animation class)
  document.getElementById("rubric-score-1").innerText = `${appState.evaluationDetails.evidenceScore} / 30`;
  const bar1 = document.getElementById("rubric-bar-1");
  bar1.className = "rubric-bar-animated";
  bar1.style.background = "var(--color-primary)";
  setTimeout(() => { bar1.style.width = `${(appState.evaluationDetails.evidenceScore/30)*100}%`; }, 100);

  document.getElementById("rubric-score-2").innerText = `${appState.evaluationDetails.procedureScore} / 20`;
  const bar2 = document.getElementById("rubric-bar-2");
  bar2.className = "rubric-bar-animated";
  bar2.style.background = "var(--color-secondary)";
  setTimeout(() => { bar2.style.width = `${(appState.evaluationDetails.procedureScore/20)*100}%`; }, 200);

  document.getElementById("rubric-score-3").innerText = `${appState.evaluationDetails.articleScore} / 25`;
  const bar3 = document.getElementById("rubric-bar-3");
  bar3.className = "rubric-bar-animated";
  bar3.style.background = "var(--color-success)";
  setTimeout(() => { bar3.style.width = `${(appState.evaluationDetails.articleScore/25)*100}%`; }, 300);

  document.getElementById("rubric-score-4").innerText = `${appState.evaluationDetails.sentenceScore} / 25`;
  const bar4 = document.getElementById("rubric-bar-4");
  bar4.className = "rubric-bar-animated";
  bar4.style.background = "var(--color-warning)";
  setTimeout(() => { bar4.style.width = `${(appState.evaluationDetails.sentenceScore/25)*100}%`; }, 400);

  // Feedback Text Display
  const card = document.getElementById("grades-feedback-card");
  card.style.display = "block";
  document.getElementById("grades-feedback-text").innerHTML = appState.evaluationDetails.feedback;

  if (shouldSwitchTab) {
    switchTab("tab-grades");
  }
}

function buildFeedbackText(scoreEvidence, scoreProcedure, scoreArticle, scoreSentence) {
  return `<h4>Analisis Putusan Anda:</h4><br>
    <ul>
      <li><strong>Skor Alat Bukti: ${scoreEvidence}/30</strong> - ${scoreEvidence === 30 ? 'Luar biasa! Anda menguji integritas CCTV hasil olahan AI dengan memeriksa nilai hash dan memetakan alibi menggunakan timeline GPS/BTS seluler.' : 'Anda melewatkan langkah pengujian kritis pada CCTV atau GPS.'}</li>
      <li><strong>Hukum Acara (KUHAP 2025): ${scoreProcedure}/20</strong> - Anda memilih keputusan sela: <em>${appState.userChoices.putusanSela === 'terima-eksepsi' ? 'Menerima Eksepsi' : 'Menolak Eksepsi'}</em>. ${appState.userChoices.putusanSela === 'terima-eksepsi' ? 'Ini menunjukkan kepatuhan tinggi terhadap kepastian formil Pasal 91 KUHAP 2025.' : 'Anda memprioritaskan keadilan materiil untuk memeriksa pokok perkara meskipun ada pelanggaran durasi penyitaan.'}</li>
      <li><strong>Penerapan Pasal (KUHP 2023): ${scoreArticle}/25</strong> - ${appState.userChoices.selectedArticle === 'pasal-477' ? 'Tepat! Anda menjerat terdakwa dengan Pasal 477 ayat (1) karena terdapat unsur pencurian malam hari dan perusakan laci.' : 'Kurang tepat. Unsur perusakan kunci laci dan waktu malam hari memenuhi syarat pemberatan (Pasal 477) bukan pencurian biasa.'}</li>
      <li><strong>Pedoman Pemidanaan Baru: ${scoreSentence}/25</strong> - ${scoreSentence === 25 ? 'Sangat bagus. Anda menerapkan pidana alternatif (Kerja Sosial/Pengawasan) sesuai nafas restoratif KUHP Baru 2023 untuk memulihkan keadaan terdakwa non-resividis.' : 'Hukuman penjara kurungan langsung dinilai kurang efisien untuk pencurian non-kekerasan skala kecil di bawah KUHP 2023.'}</li>
    </ul>`;
}

// --- Utilities & UI Polish System ---

function updateProgressBars() {
  const fill = document.getElementById("trial-progress-fill");
  if (fill) {
    const percentage = ((appState.currentSession - 1) / 8) * 100;
    fill.style.width = `${Math.max(percentage, 2)}%`;
  }
}

function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '<i data-lucide="check-circle" style="color: var(--color-success);"></i>',
    warning: '<i data-lucide="alert-triangle" style="color: var(--color-warning);"></i>',
    error: '<i data-lucide="x-circle" style="color: var(--color-danger);"></i>',
    info: '<i data-lucide="info" style="color: var(--color-primary);"></i>'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('div');
  icon.className = "toast-icon";
  icon.innerHTML = icons[type] || icons.info;

  const body = document.createElement('div');
  body.className = "toast-body";

  const titleEl = document.createElement('div');
  titleEl.className = "toast-title";
  titleEl.textContent = title;

  const messageEl = document.createElement('div');
  messageEl.className = "toast-msg";
  messageEl.textContent = message;

  body.appendChild(titleEl);
  body.appendChild(messageEl);
  toast.appendChild(icon);
  toast.appendChild(body);

  container.appendChild(toast);
  lucide.createIcons();

  // Auto remove
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) container.removeChild(toast);
    }, 350); // wait for exit animation
  }, 4000);
}

// --- Render Agent Profile Cards + Roster Table ---
function renderAgentProfiles() {
  const container = document.getElementById("agents-cards-container");
  const rosterBody = document.getElementById("agent-roster-tbody");
  if (!container) return;
  container.innerHTML = "";
  if (rosterBody) rosterBody.innerHTML = "";

  // Model color scheme
  const modelColor = (model) => {
    if (model.includes("Analitis")) return { bg: "rgba(37,99,235,0.12)", color: "#bfdbfe", border: "rgba(37,99,235,0.28)" };
    if (model.includes("GPT-4")) return { bg: "rgba(16,185,129,0.1)", color: "#34d399", border: "rgba(16,185,129,0.2)" };
    return { bg: "rgba(148,163,184,0.1)", color: "#cbd5e1", border: "rgba(148,163,184,0.2)" };
  };

  // Temperature bar color
  const tempColor = (t) => t <= 0.2 ? "#10b981" : t <= 0.4 ? "#6366f1" : "#f59e0b";

  // Exclude 'hakim' (human role) from AI roster table
  const aiAgentKeys = Object.keys(AGENT_PROFILES).filter(k => k !== "hakim");

  Object.keys(AGENT_PROFILES).forEach((key, idx) => {
    const ag = AGENT_PROFILES[key];
    const mc = modelColor(ag.llmEngine ? ag.llmEngine.model : "");
    const tc = tempColor(ag.llmEngine ? ag.llmEngine.temperature : 0);
    const isARIA = key === "hakimAsisten";
    const isHuman = key === "hakim";

    // ── Roster Table Row ──
    if (!isHuman && rosterBody) {
      const tr = document.createElement("tr");
      tr.className = "agent-roster-row";

      tr.innerHTML = `
        <td style="padding: 14px 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="agent-token">${ag.avatar || "AI"}</span>
            <div>
              <div style="color: white; font-weight: 600; font-size: 0.875rem;">${ag.name}</div>
              <div style="color: var(--text-muted); font-size: 0.7rem;">${ag.role}</div>
            </div>
          </div>
        </td>
        <td style="padding: 14px 20px; color: var(--text-secondary); font-size: 0.82rem; max-width: 340px; line-height: 1.4;">
          ${ag.llmEngine && ag.llmEngine.tugas ? ag.llmEngine.tugas : ag.profileModule ? ag.profileModule.peran : "-"}
        </td>
        <td style="padding: 14px 20px;">
          <span style="
            background: ${mc.bg};
            color: ${mc.color};
            border: 1px solid ${mc.border};
            border-radius: 50px; padding: 3px 10px; font-size: 0.72rem; font-weight: 600;
            white-space: nowrap;
          ">${ag.llmEngine ? ag.llmEngine.model : "-"}</span>
        </td>
        <td style="padding: 14px 20px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 54px; height: 5px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
              <div style="width: ${(ag.llmEngine ? ag.llmEngine.temperature : 0) * 100}%; height: 100%; background: ${tc};"></div>
            </div>
            <span style="font-size: 0.75rem; color: ${tc}; font-family: monospace;">${ag.llmEngine ? ag.llmEngine.temperature : 0}</span>
          </div>
        </td>
      `;
      rosterBody.appendChild(tr);
    }

    // ── Detailed Architecture Card ──
    const card = document.createElement("div");
    card.className = "glass-panel agent-card";
    card.style.flexDirection = "column";
    if (isARIA) {
      card.style.borderColor = "rgba(37,99,235,0.28)";
    }

    card.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: flex-start; width: 100%;">
        <div class="agent-avatar-circle">${ag.avatar || "AI"}</div>
        <div class="agent-info" style="flex-grow: 1;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 2px;">
            <h3 style="margin:0;">${ag.name}</h3>
            ${isARIA ? '<span class="badge badge-secondary" style="font-size:0.6rem;">Hakim Asisten</span>' : ""}
            ${isHuman ? '<span class="badge" style="background:rgba(16,185,129,0.1);color:#34d399;border:1px solid rgba(16,185,129,0.2);font-size:0.6rem;">Human Mode</span>' : ""}
          </div>
          <h4>${ag.role}</h4>
          <p>${ag.desc}</p>
          ${ag.llmEngine && ag.llmEngine.tugas ? `<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-color);font-size:0.78rem;color:var(--text-secondary);"><strong style="color:white;">Tugas:</strong> ${ag.llmEngine.tugas}</div>` : ""}
        </div>
      </div>
      
      <div style="width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--color-primary); font-weight: 700; margin-bottom: 10px; letter-spacing: 0.05em;">Konfigurasi Peran</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.78rem;">
          <div style="background: rgba(255,255,255,0.01); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: white; display: block; margin-bottom: 3px; font-size: 0.72rem;">Profil:</strong>
            <span style="color: var(--text-secondary); line-height: 1.3; display: block;">${ag.profileModule ? ag.profileModule.strategi : "Human-controlled."}</span>
          </div>
          <div style="background: rgba(255,255,255,0.01); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: white; display: block; margin-bottom: 3px; font-size: 0.72rem;">Konteks:</strong>
            <span style="color: var(--text-secondary); line-height: 1.3; display: block;">${ag.memoryModule ? ag.memoryModule.longTerm : "Disimpan otomatis."}</span>
          </div>
          <div style="background: rgba(255,255,255,0.01); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: white; display: block; margin-bottom: 3px; font-size: 0.72rem;">Strategi:</strong>
            <span style="color: var(--text-secondary); line-height: 1.3; display: block;">${ag.strategyModule ? ag.strategyModule.taktik : "-"}</span>
          </div>
          <div style="background: rgba(255,255,255,0.01); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: white; display: block; margin-bottom: 3px; font-size: 0.72rem;">Rujukan Hukum:</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px;">
              ${ag.legalRetriever ? ag.legalRetriever.RAGAccess.map(doc => `<span style="background:rgba(99,102,241,0.1);color:#a5b4fc;border:1px solid rgba(99,102,241,0.2);border-radius:50px;padding:1px 7px;font-size:0.6rem;">${doc}</span>`).join("") : "-"}
            </div>
          </div>
        </div>
        <div style="background: ${mc.bg}; padding: 8px 12px; border-radius: 6px; border: 1px solid ${mc.border}; margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: white; font-size: 0.75rem;">Model Respons:</strong>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: ${mc.color}; font-family: monospace; font-size: 0.72rem;">${ag.llmEngine ? ag.llmEngine.model : "-"}</span>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 36px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                <div style="width: ${(ag.llmEngine ? ag.llmEngine.temperature : 0) * 100}%; height: 100%; background: ${tc};"></div>
              </div>
              <span style="font-size: 0.65rem; color: ${tc}; font-family: monospace;">T=${ag.llmEngine ? ag.llmEngine.temperature : 0}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  lucide.createIcons();
}

// --- Render Comparative Laws Tab ---
function renderComparativeLaws() {
  const containerKuhp = document.getElementById("kuhp-comparative-container");
  const containerKuhap = document.getElementById("kuhap-comparative-container");

  if (!containerKuhp || !containerKuhap) return;

  // KUHP
  containerKuhp.innerHTML = "";
  COMPARATIVE_LAW.kuhp.items.forEach((item, idx) => {
    const box = document.createElement("div");
    box.className = "accordion-item active"; // Open by default
    box.innerHTML = `
      <div class="accordion-header">
        <h3>${item.topic}</h3>
      </div>
      <div class="accordion-content" style="display:block;">
        <div class="law-article-box" style="border-left-color: var(--color-primary); margin-bottom: 8px;">
          <h4 class="law-article-name" style="color:var(--text-muted)">KUHP LAMA (WvS)</h4>
          <p class="law-article-text">${item.lama}</p>
        </div>
        <div class="law-article-box" style="border-left-color: var(--color-secondary);">
          <h4 class="law-article-name" style="color:var(--color-secondary)">KUHP BARU 2023</h4>
          <p class="law-article-text">${item.baru}</p>
        </div>
      </div>
    `;
    containerKuhp.appendChild(box);
  });

  // KUHAP
  containerKuhap.innerHTML = "";
  COMPARATIVE_LAW.kuhap.items.forEach((item, idx) => {
    const box = document.createElement("div");
    box.className = "accordion-item active";
    box.innerHTML = `
      <div class="accordion-header">
        <h3>${item.topic}</h3>
      </div>
      <div class="accordion-content" style="display:block;">
        <div class="law-article-box" style="border-left-color: var(--color-primary); margin-bottom: 8px;">
          <h4 class="law-article-name" style="color:var(--text-muted)">KUHAP LAMA (1981)</h4>
          <p class="law-article-text">${item.lama}</p>
        </div>
        <div class="law-article-box" style="border-left-color: var(--color-success);">
          <h4 class="law-article-name" style="color:var(--color-success)">KUHAP BARU 2025</h4>
          <p class="law-article-text">${item.baru}</p>
        </div>
      </div>
    `;
    containerKuhap.appendChild(box);
  });
}
