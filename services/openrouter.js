const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export async function generateContent() {
  const text = await askAI(buildLessonsPrompt());
  return parseLessonsContent(text);
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

function buildLessonsPrompt() {
  return `You are a viral content creator who speaks hard truths. Cover universal topics — money, career, mindset, habits, freedom, success, hidden opportunities, life stages. Use sharp, emotional, surprising language that stops the scroll.

Generate content for a "numbered lessons" social media video. Each lesson reveals something people don't realize about a universal problem or opportunity, then hits them with a truth they can't ignore.

Return a JSON object with:
- "hook": a numbered opening line that grabs attention by pointing at a specific, detailed problem or opportunity — NOT a generic one. Be precise and concrete: name a real trend, statistic, behavior, or market shift. Avoid vague phrases like "things you should know" or "ways to succeed". Instead, be ultra-specific: "6 AI tools replacing mid-level marketers in 2026", "4 tax loopholes freelancers ignore every year", "5 rare skills that pay $200k+ remotely". 5 to 12 words. Make it forward-looking or eye-opening. Examples: "5 booming businesses you must try in 2026", "6 assets that pay you forever", "4 signs you're financially smarter than you think", "3 life levels you need to understand", "6 money lessons most people learn too late", "5 hidden habits that accelerate success"
- "hook_desc": a one-sentence description that expands on the hook and sets up what the lessons will cover. Think of it as the "big picture" context. 8-15 words. Example for "6 assets that pay you forever": "Most people trade time for money, but the wealthy own assets that never sleep." Example for "5 booming businesses in 2026": "Old industries are crumbling while new ones print millionaires overnight." Keep it sharp, not generic.
- "hook_icon": a Material Symbols Outlined icon name in snake_case that PERFECTLY matches the hook theme. DO NOT use generic icons — pick one that directly visualizes the hook subject. Examples: hook about money → "payments" or "attach_money", hook about growth → "trending_up", hook about mindset → "psychology" or "lightbulb", hook about business → "business" or "rocket_launch", hook about real estate → "house" or "apartment". Always think: what single icon best represents this exact hook?
- "lesson": an array of 3 to 6 objects (vary the count to match hook number), each with:
  - "icon": a Material Symbols Outlined icon name in snake_case that PERFECTLY represents the FULL meaning of the lesson's title, description, and example combined. Read the entire lesson content first, understand its core message, then pick the single most fitting icon. There are 1000+ available icons in the library — be precise and creative. NEVER reuse an icon across different lessons (every icon must be unique). NEVER use generic fallback icons like "lightbulb" or "star" unless no other icon fits perfectly. Examples: passive income → "account_balance", time → "schedule", networks → "hub", automation → "smart_toy", content → "article", royalties → "receipt", growth → "trending_up", protection → "shield", learning → "school", location → "location_on", health → "monitor_heart", data → "bar_chart".
  - "color": a vibrant hex accent color string (e.g. "#FFD700", "#FF6B6B", "#4FC3F7", "#81C784", "#CE93D8") that energizes the lesson's visual identity
  - "title": one insight or realization in 2-5 words. Punchy, memorable.
  - "description": the big idea — explain WHY this matters (8-15 words). Make it emotional or surprising.
  - "example": one concrete truth or real-life application (10-20 words). Make it hit home.
- "cta": one sentence combining a question and a follow/save call-to-action. Example: "Are you also building assets right now? Follow and save for more wealth revelations." or "Which one are you missing? Follow for daily wealth insights." Under 15 words.
- "caption": one short paragraph (2-3 sentences) for social media. End with #1section.

Cover topics like: financial freedom, career pivots, hidden assets, wealth habits, life stages, mindset shifts, digital opportunities, passive income, personal growth. Vary the number (3 to 6). Every video must feel like a revelation, not a lecture. English only. Return ONLY valid JSON.`;
}

function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function parseLessonsContent(text) {
  const json = text.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(json);
  const lesson = (parsed.lesson || []).map(t => ({
    icon: t.icon || "",
    color: t.color || null,
    title: titleCase(t.title),
    description: t.description,
    example: t.example || "",
  }));
  return {
    type: "lessons",
    hook: titleCase(parsed.hook),
    hook_desc: parsed.hook_desc || "",
    hook_icon: parsed.hook_icon || "auto_awesome",
    lesson,
    cta: parsed.cta || "Follow for more revelations",
    caption: parsed.caption || parsed.hook + " #1section",
    footer: "1section.com",
  };
}
