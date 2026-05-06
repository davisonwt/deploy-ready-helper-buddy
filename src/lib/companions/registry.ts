export type CompanionSlug =
  | "linden"
  | "maple"
  | "cypress"
  | "willow"
  | "birch"
  | "elm"
  | "hickory"
  | "beech"
  | "alder"
  | "hawthorn";

export type Tier = "sower" | "keeper" | "ambassador" | "council";

export interface CompanionMeta {
  slug: CompanionSlug;
  name: string;
  title: string;
  emoji: string;
  summary: string;
  category: string;
  intro: string;
  examplePrompt: string;
}

export const COMPANIONS: CompanionMeta[] = [
  {
    slug: "linden",
    name: "Linden",
    title: "The Grove Overseer",
    emoji: "🌳",
    summary:
      "Coordinates the whole orchard — daily briefings, task routing, and warm login greetings.",
    category: "coordination",
    intro: "Shalom, tribe member. What part of your orchard needs attention today?",
    examplePrompt: "Give me my daily briefing for today.",
  },
  {
    slug: "maple",
    name: "Maple",
    title: "The Story Sower",
    emoji: "🍁",
    summary:
      "Drafts SeedFlow posts, captions, content calendars, and gentle marketing copy.",
    category: "content",
    intro: "Tell me what you'd like to plant in the feed today and I'll shape the words.",
    examplePrompt: "Draft a SeedFlow post inviting the tribe to bestow on my new music seed.",
  },
  {
    slug: "cypress",
    name: "Cypress",
    title: "The Voice Guardian",
    emoji: "🌲",
    summary:
      "Reviews drafts for tone, values, and brand alignment before anything is planted in the feed.",
    category: "review",
    intro: "Paste any draft and I'll check tone, values and brand fit.",
    examplePrompt: "Review this draft for tone and rewrite it warmer: ...",
  },
  {
    slug: "willow",
    name: "Willow",
    title: "The Vision Weaver",
    emoji: "🌿",
    summary:
      "Generates and refines images — seed covers, product photos, and banners.",
    category: "image",
    intro: "Describe the image you want — I'll weave it.",
    examplePrompt: "A glowing olive tree on a deep teal background, soft sunset light, no text.",
  },
  {
    slug: "birch",
    name: "Birch",
    title: "The Reel Keeper",
    emoji: "🎬",
    summary:
      "Plans video reels, testimonial clips, and orchard introductions.",
    category: "video",
    intro: "Tell me what story this reel should tell. I'll plan the shots.",
    examplePrompt: "Plan a 30-second reel introducing my orchard to first-time visitors.",
  },
  {
    slug: "elm",
    name: "Elm",
    title: "The Hearth Messenger",
    emoji: "💬",
    summary:
      "Drafts outreach, thank-yous, and warm collaboration proposals.",
    category: "messaging",
    intro: "Who do you want to reach, and why? I'll draft the message.",
    examplePrompt: "Write a thank-you to a bestower who sent 25 USDC for my seed.",
  },
  {
    slug: "hickory",
    name: "Hickory",
    title: "The Bridge Caller",
    emoji: "📞",
    summary:
      "Opens HearthCall sessions and routes voice or video connections for the tribe.",
    category: "calling",
    intro: "Who do you want to call, and what's the intent of the call?",
    examplePrompt: "I want a 15-min HearthCall with my tribe leader about pricing — propose an agenda.",
  },
  {
    slug: "beech",
    name: "Beech",
    title: "The Pocket Keeper",
    emoji: "📒",
    summary:
      "Tracks bestowals, sends weekly reports, and tends the 1% tribe leader finance.",
    category: "finance",
    intro: "Ask me for a weekly summary or any finance question about your orchard.",
    examplePrompt: "Give me a weekly bestowal report for the past 7 sacred days.",
  },
  {
    slug: "alder",
    name: "Alder",
    title: "The Storehouse Steward",
    emoji: "🥖",
    summary:
      "Watches over Field & Forge stock, deliveries, and order tracking.",
    category: "logistics",
    intro: "I'll watch your stock and orders. What do you want to know?",
    examplePrompt: "Which of my Field products are below 5 in stock?",
  },
  {
    slug: "hawthorn",
    name: "Hawthorn",
    title: "The Harvest Oracle",
    emoji: "🔮",
    summary:
      "Suggests fair pricing, surfaces performance insights, and whispers the best time to post.",
    category: "insight",
    intro: "Bring me a question about pricing, timing or performance.",
    examplePrompt: "Suggest a fair USDC range for a 12-track album seed.",
  },
];

export const TIER_ORDER: Tier[] = ["sower", "keeper", "ambassador", "council"];
export const TIER_LABEL: Record<Tier, string> = {
  sower: "Sower",
  keeper: "Keeper",
  ambassador: "Ambassador",
  council: "Council",
};

export function tierAtLeast(current: Tier, min: Tier): boolean {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(min);
}
