const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export async function generateContent(type = "quote") {
  const prompt = type === "tips" ? buildTipsPrompt() : buildPrompt();
  const text = await askAI(prompt);
  return type === "tips" ? parseTipsContent(text) : parseContent(text);
}

async function askAI(prompt, retries = 3) {
  const key = process.env.OPENROUTER_KEY;
  if (!key) throw new Error("OPENROUTER_KEY not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`OpenRouter returned empty response: ${JSON.stringify(data)}`);
    return content;
  } catch (e) {
    if (retries > 0 && (e.cause?.code === "EAI_AGAIN" || e.code === "EAI_AGAIN" || e.type === "system" || e.message?.includes("fetch failed"))) {
      console.log(`OpenRouter DNS/network error, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 2000));
      return askAI(prompt, retries - 1);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt() {
  return `You are a viral content expert. Cover ANY topic that matters today — technology, finance, psychology, work, business, self-development, health, science, culture, or any real-world trend people care about. Don't be stiff or generic. Use simple, sharp language that hits hard. Strong hook is mandatory. Follow and reference current news and events happening around the world right now — don't create content in a vacuum, tie it to what's actually happening today. Use reality-based insights and accurate data from real research or proven facts.

Generate content for an inspirational quote social media video. Return a JSON object with:
- "quote": a deeply practical and relatable truth that people can immediately use in their daily lives. Talk about real human struggles — money, relationships, career, self-doubt, health, modern life pressure. It should make people think "this is exactly what I needed to hear". Simple conversational language, no poetry or fluff. Make it easy to understand, hard to forget, and genuinely helpful. Keep up with current trends. 10 to 30 words.
- "source": the person who said the quote (first and last name)
- "description": a 1-2 sentence explanation of why this quote matters or how to apply it
- "cta": a genuinely funny call-to-action that makes people laugh or at least smirk. Still classy, but actually funny — surprise the viewer. Ask viewers to follow, like, tag, save, share, or comment with a humorous twist. Examples: "Follow before the algorithm forgets you exist", "Save this — your attention span will thank you later", "Tag someone who desperately needs this", "Like if you're smarter than you look", "Share this and look like a genius". Vary the action every time. Keep it under 12 words. Make it actually funny, not just polite.
- "caption": one short paragraph (2-3 sentences) for a social media caption. Make it feel current and connected to real life — reference the vibe of what's happening in the world right now if it fits. Do not include hashtags. Do not repeat the quote verbatim. Describe the overall theme or message in fresh, sharp language. End with #1section.

Make the quote original-sounding, not overly clich\u00e9. Use quotes from modern thinkers across any field — tech, finance, science, philosophy, business, psychology — relevant to today's challenges. The quote should feel like a cold hard truth, not generic inspiration. English only. Return ONLY valid JSON.`;
}

function parseContent(text) {
  const json = text.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(json);
  return {
    type: "quote",
    quote: parsed.quote,
    source: parsed.source,
    description: parsed.description,
    cta: parsed.cta || "Follow for more daily wisdom like this",
    caption: parsed.caption || parsed.description + " #1section",
    footer: "1section.com",
  };
}

function buildTipsPrompt() {
  return `You are a viral content expert. Cover ANY topic that matters today — technology, finance, psychology, work, business, self-development, health, science, culture, or any real-world trend people care about. Use simple, sharp language.

Generate content for a "tips list" social media video. Return a JSON object with:
 - "hook": a strong opening line that grabs attention by pointing out a common problem people face, then promises the best, most surprising solution. Make it emotional and punchy — something that makes people think "wait, really?". 5 to 12 words. Vary the opening number to match the tip count. Examples: "3 mindset shifts that will wreck your anxiety", "4 things you do that signal low confidence", "5 habits secretly making you unhappier", "6 lessons nobody taught you about money"
- "tips": an array of 3 to 6 objects (vary the count each time), each with:
  - "title": short, punchy tip title (2-5 words)
  - "description": one short sentence explaining the tip (8-15 words)
  - "example": one specific, actionable example that shows exactly how to apply the tip (10-20 words). Make it concrete and practical.
- "cta": a funny or witty call-to-action under 12 words. Ask viewers to follow, like, save, share, or comment with a humorous twist.
- "caption": one short paragraph (2-3 sentences) for social media. Do not repeat the hook or tips verbatim. End with #1section.

Make the tips practical, specific, and useful. Vary the topic and tip count (3 to 6) from video to video. English only. Return ONLY valid JSON.`;
}

function parseTipsContent(text) {
  const json = text.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(json);
  const tips = (parsed.tips || []).map(t => ({
    title: t.title,
    description: t.description,
    example: t.example || "",
  }));
  return {
    type: "tips",
    hook: parsed.hook,
    tips,
    cta: parsed.cta || "Follow for more tips like this",
    caption: parsed.caption || parsed.hook + " #1section",
    footer: "1section.com",
  };
}
