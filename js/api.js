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
