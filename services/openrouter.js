const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export async function generateContent(type = "quote") {
  const prompt = type === "lessons" ? buildLessonsPrompt() : buildPrompt();
  const text = await askAI(prompt);
  return type === "lessons" ? parseLessonsContent(text) : parseContent(text);
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

function buildLessonsPrompt() {
  return `You are a viral content creator who speaks hard truths. Cover universal topics — money, career, mindset, habits, freedom, success, hidden opportunities, life stages. Use sharp, emotional, surprising language that stops the scroll.

Generate content for a "numbered lessons" social media video. Each lesson reveals something people don't realize about a universal problem or opportunity, then hits them with a truth they can't ignore.

Return a JSON object with:
- "hook": a numbered opening line that grabs attention by pointing at a universal problem, opportunity, or life truth. 5 to 12 words. Make it forward-looking or eye-opening. Examples: "5 booming businesses you must try in 2026", "6 assets that pay you forever", "4 signs you're financially smarter than you think", "3 life levels you need to understand", "6 money lessons most people learn too late", "5 hidden habits that accelerate success"
- "tips": an array of 3 to 6 objects (vary the count to match hook number), each with:
  - "title": one insight or realization in 2-5 words. Punchy, memorable.
  - "description": the big idea — explain WHY this matters (8-15 words). Make it emotional or surprising.
  - "example": one concrete truth or real-life application (10-20 words). Make it hit home.
- "cta": a clever or witty call-to-action under 12 words. Ask to follow, save, share, or comment.
- "caption": one short paragraph (2-3 sentences) for social media. End with #1section.

Cover topics like: financial freedom, career pivots, hidden assets, wealth habits, life stages, mindset shifts, digital opportunities, passive income, personal growth. Vary the number (3 to 6). Every video must feel like a revelation, not a lecture. English only. Return ONLY valid JSON.`;
}

function parseLessonsContent(text) {
  const json = text.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(json);
  const tips = (parsed.tips || []).map(t => ({
    title: t.title,
    description: t.description,
    example: t.example || "",
  }));
  return {
    type: "lessons",
    hook: parsed.hook,
    tips,
    cta: parsed.cta || "Follow for more revelations",
    caption: parsed.caption || parsed.hook + " #1section",
    footer: "1section.com",
  };
}
