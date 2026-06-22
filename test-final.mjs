import { generateTipsVideo } from "./video-builders/tipsVideo.mjs";
const out = await generateTipsVideo({
  hook: "4 things you do that secretly kill your focus every day",
  tips: [
    { title: "Task Switching Addiction", description: "Jumping between tabs every 2 minutes trains your brain to be distracted and unable to focus deeply on anything", example: "Set a 25-minute timer and close every tab except one — your brain will literally rewire for deep work in days" },
    { title: "Your Phone is a Slot Machine", description: "Every notification is a dopamine hit designed by engineers to keep you hooked and unable to concentrate on real work", example: "Put your phone in grayscale mode and another room during work hours — kills the dopamine loop instantly" },
    { title: "You Start Mornings Reacting", description: "Grabbing your phone first thing puts you in reactive mode all day instead of being intentional with your time and energy", example: "No phone for the first 30 minutes after waking — use that time to plan your day instead of drowning in everyone else's" },
    { title: "Multitasking is a Lie", description: "Your brain cannot actually do two things at once — it just switches rapidly and drains your mental battery twice as fast", example: "Batch all similar tasks together and do them in one block — your brain will thank you with 2x the output" },
  ],
  cta: "Bet you didn't realize you were doing this? Follow for more reality checks",
  output: `output/tips-styled-${Date.now()}.mp4`
});
console.log("Done:", out);
