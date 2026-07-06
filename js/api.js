export async function fetchFreeLLMResponse(speaker, previousSpeaker, previousText, intendedResponse) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const systemPrompt = `Anda sedang bermain peran sebagai ${speaker} dalam simulasi sidang pengadilan pidana Indonesia. 
Giliran sebelumnya adalah dari ${previousSpeaker}.
Tujuan utama Anda di giliran ini adalah menyampaikan pesan inti berikut: "${intendedResponse}".
Bahasakan ulang pesan tersebut dengan gaya bahasa hukum formal Indonesia yang natural dan singkat (maksimal 3 kalimat). Jangan keluar dari karakter.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `${previousSpeaker} berkata: "${previousText}"\n\nApa respons Anda sebagai ${speaker}?` }
  ];

  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: messages,
        model: "openai",
        seed: Math.floor(Math.random() * 1000)
      })
    });
    if (!res.ok) throw new Error("LLM API Error");
    const text = await res.text();
    return text || intendedResponse;
  } catch (e) {
    console.error("Free LLM Failed, falling back to script:", e);
    return intendedResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

const BACKEND_BASE_URL = window.HAKIMPINTAR_API_BASE_URL || "http://127.0.0.1:4000";
const BACKEND_TIMEOUT_MS = 3000;
const DEV_USER_STORAGE_KEY = "hakimpintar.devUserId";
const API_TOKEN_STORAGE_KEY = "hakimpintar.apiToken";

function getDevUserId() {
  try {
    const stored = localStorage.getItem(DEV_USER_STORAGE_KEY);
    if (stored) return stored;
    localStorage.setItem(DEV_USER_STORAGE_KEY, "dev-judge");
  } catch (error) {
    console.warn("Dev user id storage unavailable:", error);
  }
  return "dev-judge";
}

function getApiToken() {
  if (window.HAKIMPINTAR_API_TOKEN) return window.HAKIMPINTAR_API_TOKEN;
  try {
    return localStorage.getItem(API_TOKEN_STORAGE_KEY) || "";
  } catch (error) {
    console.warn("API token storage unavailable:", error);
    return "";
  }
}

async function fetchBackend(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  const apiToken = getApiToken();

  try {
    const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Dev-User-Id": getDevUserId(),
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        ...(options.headers || {})
      }
    });
    if (!res.ok) throw new Error(`Backend API ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchBackendSimulation() {
  try {
    const payload = await fetchBackend("/api/simulations/current");
    return payload.simulation || null;
  } catch (error) {
    console.warn("Backend simulation load failed, using local state:", error);
    return null;
  }
}

export async function saveBackendSimulation(snapshot) {
  try {
    await fetchBackend("/api/simulations/current", {
      method: "PUT",
      body: JSON.stringify({ snapshot })
    });
    return true;
  } catch (error) {
    console.warn("Backend simulation save failed, keeping local state:", error);
    return false;
  }
}

export async function resetBackendSimulation() {
  try {
    await fetchBackend("/api/simulations/current", { method: "DELETE" });
    return true;
  } catch (error) {
    console.warn("Backend simulation reset failed:", error);
    return false;
  }
}
