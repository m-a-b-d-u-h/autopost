const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export async function generateContent(existingHooks = []) {
  const text = await askAI(buildLessonsPrompt(existingHooks));
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

function buildLessonsPrompt(existingHooks = []) {
  const avoidMsg = existingHooks.length
    ? `\n\nIMPORTANT: These hooks are already used and MUST NOT be repeated. Generate something completely different:\n${existingHooks.map(h => `- "${h}"`).join("\n")}`
    : "";

  return `You are a viral content creator who reveals hard truths backed by reality. Use emotionally charged, surprising language that triggers curiosity and self-reflection. Every hook must feel like an eye-opening revelation the audience never saw coming. You MUST generate a hook that has NEVER been used before — check the list of existing hooks below and avoid every one of them.${avoidMsg}

Generate content for a "numbered lessons" social media video. Each lesson uncovers a hidden pattern, uncomfortable reality, or overlooked opportunity — then delivers a truth backed by data or real-world evidence.

Return a JSON object with:
- "hook": a numbered opening line that grabs attention with a surprising fact, hidden pattern, or uncomfortable reality. 5 to 12 words. Be emotionally powerful but never insulting — reveal truths that make people think, not feel attacked. NEVER mention AI tools, tech tools, or software tools. Use a wide variety of topics across these example categories:

Psychology & Human Nature: "4 psychological patterns that control your decisions", "5 things your childhood secretly shaped about you", "3 reasons humans naturally resist change (and how it holds them back)", "6 silent signs of jealousy you ignore every day", "4 phrases that accidentally push people away", "3 truths about ego that most people never admit"

Business & Entrepreneurship: "4 reasons 90% of startups fail within 3 years", "5 businesses that grew during every recession in history", "3 things successful founders figured out early", "6 warning signs your business is quietly dying"

Wealth & Financial Freedom: "3 numbers that determine your financial future", "5 money habits that separate the wealthy from everyone else", "4 things the top 1% understand about debt", "6 hidden costs eating 40% of your lifetime income"

AI & The Future: "4 industries facing massive change by 2030", "5 jobs that are transforming faster than you think", "3 skills that become more valuable as AI grows", "6 truths about the future of work nobody prepares you for"

Successful Figures: "5 daily habits shared by 100 self-made billionaires", "4 patterns in how the world's most successful people think", "3 sacrifices behind every overnight success story", "6 lessons from historic failures that built empires"

Parenting: "4 things children absorb from parents without realizing it", "5 research-backed habits that build confident kids", "3 parenting approaches that predict future success", "6 conversations every parent should have before age 12"

Personal Branding: "5 factors that determine how people perceive you", "4 ways to build credibility without a title or degree", "3 mistakes that weaken your reputation over time", "6 habits of people who naturally command respect"

Stupidity & Intelligence: "5 cognitive biases that trick even the smartest minds", "4 reasons intelligent people sometimes make terrible decisions", "3 patterns of thinking that limit potential", "6 ways to recognize when confidence becomes dangerous"

Sales & Marketing: "4 psychological triggers proven to increase conversion by 300%", "5 sales principles that work after 100 years", "3 reasons customers say no (and what to do about it)", "6 concepts that separate average marketers from great ones"

History: "5 patterns that repeat across every collapsed civilization", "3 economic lessons from the 1929 crash that apply today", "4 wars that reshaped the modern economy", "6 forgotten strategies from ancient leaders that still work"

Philosophy & Filsafat: "4 stoic principles that reduce anxiety overnight", "5 questions that change how you see your entire life", "3 lessons from existentialism about finding meaning", "6 ancient ideas that modern psychology just proved right"

Politics & Economy: "4 economic shifts that affect your daily spending power", "5 financial patterns that repeat every 10-15 years", "3 things about inflation that schools never explain", "6 trends in global wealth distribution you should understand"

Nutrition & Health: "5 foods that research shows affect mental performance", "4 nutrition myths that cost you energy every day", "3 lifestyle choices that add 10 healthy years", "6 signs your daily habits are silently draining you"

Time Management: "4 reasons 80% of people feel time-poor every day", "5 productivity principles backed by neuroscience", "3 common time traps that steal 20 hours a week", "6 ways to protect your focus in a distracted world"

Happiness & Filosofi: "5 research findings about what actually makes people happy", "4 things happy people quietly stop doing", "3 misconceptions about money and fulfillment", "6 stoic lessons for finding peace in chaos"

Health: "4 warning signs your body sends before serious problems", "5 sleep science facts that change how you rest", "3 daily movements that prevent 80% of back pain", "6 health metrics you should track after 30"

Relationship: "5 patterns that predict relationship success or failure", "4 things couples with 20+ years together do differently", "3 communication mistakes that create distance", "6 boundaries that healthy relationships all share"

House & Rumah: "4 financial realities about renting vs buying", "5 home improvements that actually increase property value", "3 things about mortgages that most people learn too late", "6 hidden costs of homeownership nobody talks about"

Vehicles & Kendaraan: "4 financial facts about car depreciation that change buying decisions", "5 strategies to save 30% on your next vehicle", "3 truths about auto financing dealers don't highlight", "6 lifetime costs of car ownership most people underestimate"

Education: "5 skills that predict career success more than degrees", "4 things the traditional education system doesn't teach", "3 ways self-learning creates more opportunities than formal school", "6 subjects you should master before age 25"

Retirement & Dana Pensiun: "4 numbers that determine if your retirement is on track", "5 retirement myths that cost people decades of savings", "3 investment principles that work over 30-year periods", "6 strategies to retire 10 years earlier than planned"

Daily Costs & Biaya: "5 small monthly expenses that add up to millions over a lifetime", "4 financial habits that save 30% of your income without sacrifice", "3 invisible costs silently draining your bank account", "6 micro-changes that save thousands per year"

Work & Pekerjaan: "4 signs your current role is limiting your long-term growth", "5 factors that actually determine your earning potential", "3 workplace dynamics that quietly hold careers back", "6 skills that make you indispensable in any industry"

News & Trends: "4 global trends reshaping everyday life right now", "5 patterns in the news that repeat every decade", "3 shifts happening in 2026 that most people haven't noticed", "6 ways to spot real trends versus noise"

Principles: "5 timeless principles that predict long-term success", "4 decision-making rules used by the world's top performers", "3 core principles that separate progress from stagnation", "6 life frameworks that simplify every complex choice"
- "hook_desc": a one-sentence description that expands on the hook and sets up what the lessons will cover. Think of it as the "big picture" context. 8-15 words. Keep it sharp and reality-driven, not generic.
- "hook_icon": a Material Symbols Outlined icon name in snake_case that PERFECTLY matches the hook theme. DO NOT use generic icons — pick one that directly visualizes the hook subject. Examples: hook about money → "payments" or "attach_money", hook about psychology → "psychology" or "neurology", hook about business → "business" or "rocket_launch", hook about health → "monitor_heart" or "exercise", hook about relationships → "diversity_3" or "group", hook about parenting → "family_star" or "child_care", hook about education → "school" or "auto_stories", hook about time → "schedule" or "timer", hook about success → "trending_up" or "military_tech". Always think: what single icon best represents this exact hook?
- "lesson": an array of 3 to 7 objects (vary the count to match hook number), each with:
  - "icon": a Material Symbols Outlined icon name in snake_case that PERFECTLY represents the FULL meaning of the lesson's title, description, and example combined. Read the entire lesson content first, understand its core message, then pick the single most fitting icon. There are 1000+ available icons in the library — be precise and creative. NEVER reuse an icon across different lessons (every icon must be unique). NEVER use generic fallback icons like "lightbulb" or "star" unless no other icon fits perfectly. Examples: passive income → "account_balance", time → "schedule", networks → "hub", health → "monitor_heart", growth → "trending_up", protection → "shield", learning → "school".
  - "color": a vibrant hex accent color string (e.g. "#FFD700", "#FF6B6B", "#4FC3F7", "#81C784", "#CE93D8") that energizes the lesson's visual identity
  - "title": one insight or realization in 2-5 words. Punchy, memorable.
  - "description": the big idea — explain WHY this matters (8-15 words). Make it emotional or surprising.
  - "example": one concrete truth or real-life application (10-20 words). Make it hit home.
- "cta": one sentence combining a question and a follow/save call-to-action. Under 15 words.
- "mood": classify the content energy as "high" (hard-hitting, urgent, dangerous, aggressive, high-stakes truths), "medium" (balanced, educational, informative, practical), or "low" (calm, reflective, light, philosophical, gentle truths). Match the hook's emotional intensity.
- "caption": one short paragraph (2-3 sentences) for social media. End with 3 trending, high-engagement hashtags that match the topic. Do NOT use #1section.

Cover topics including: psychology, human nature, business, wealth, AI, successful figures, parenting, personal branding, stupidity vs intelligence, sales, marketing, history, philosophy, politics, economy, nutrition, time management, happiness, health, relationships, home, vehicles, education, retirement, daily costs, work, news, current trends, principles. Vary the number (3 to 7). Every video must feel like a revelation, not a lecture. English only. Return ONLY valid JSON.`;
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
    caption: parsed.caption || parsed.hook,
    mood: parsed.mood || "medium",
  };
}
