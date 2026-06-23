import { generateLessonsVideo } from "./video-builders/lessonsVideo.mjs";
const out = await generateLessonsVideo({
  hook: "6 assets that pay you forever without working harder",
  lesson: [
    { icon: "bolt", color: "#FFD700", title: "Your Skills Compound", description: "One skill mastered early pays dividends every single year without extra effort or time investment from you", example: "A developer who learned AI automation in 2023 is now earning 3x while working half the hours they used to" },
    { icon: "inventory_2", color: "#4FC3F7", title: "Digital Products Scale", description: "Create once, sell infinitely — no inventory, no shipping, no hourly trade for money like a regular job", example: "A $47 online course about budgeting has sold 2,000 times while the creator sleeps on vacation in Bali" },
    { icon: "public", color: "#81C784", title: "Content is Land", description: "Every video or post you create is a piece of digital real estate that works for you 24/7 finding new opportunities", example: "One LinkedIn post from 3 months ago still brings freelance offers to your inbox every single week" },
    { icon: "handshake", color: "#CE93D8", title: "Networks Pay Rent", description: "The right relationships open doors that no amount of hard work or talent can unlock on their own", example: "A casual coffee chat led to a joint venture that now generates $8k monthly in passive affiliate commissions" },
    { icon: "settings", color: "#FF6B6B", title: "Systems Replace Hours", description: "Automated workflows run your business while you focus on what only you can do at your highest level", example: "A simple email funnel with 3 sequences replaced 20 hours of weekly manual follow-ups for a small agency" },
    { icon: "description", color: "#FFB74D", title: "Royalties Keep Giving", description: "Licensing your intellectual property creates income streams that don't stop when you stop working entirely", example: "An ebook licensed to 3 publishers brings in $400 monthly — 6 years after it was written in a weekend" },
  ],
  cta: "Which asset are you building right now? Save this and follow for more wealth revelations",
  output: `output/lessons-${Date.now()}.mp4`
});
console.log("Done:", out);
