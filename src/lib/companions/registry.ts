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
  | "hawthorn"
  | "acorn"
  | "root"
  | "bud"
  | "hive"
  | "nectar"
  | "petal"
  | "grain"
  | "sheaf"
  | "thresh"
  | "groundskeeper";

export type GroveLayer =
  | "narrative"
  | "infrastructure"
  | "live"
  | "harvest"
  | "orchestration";

export type Tier = "sower" | "keeper" | "ambassador" | "council";

export interface CompanionMeta {
  slug: CompanionSlug;
  name: string;
  title: string;
  emoji: string;
  summary: string;
  category: string;
  layer: GroveLayer;
  intro: string;
  examplePrompt: string;
}

export const COMPANIONS: CompanionMeta[] = [
  // ─── Narrative layer ───
  {
    slug: "acorn",
    name: "Acorn",
    title: "The Seed Intake",
    emoji: "🌰",
    summary:
      "Welcomes first-time sowers and gently interviews them, turning raw produce or skills into a seed with story.",
    category: "intake",
    layer: "narrative",
    intro: "Welcome, friend. Tell me — what are you bringing to the grove today?",
    examplePrompt: "I have 50kg of mountain honey from my grandfather's hives.",
  },
  {
    slug: "root",
    name: "Root",
    title: "The Identity Forger",
    emoji: "🪵",
    summary:
      "Listens beneath the surface and shapes who you are — your place, your history, your dreams — into a soulful identity profile.",
    category: "identity",
    layer: "narrative",
    intro: "Beneath every seed is a sower. Tell me where you live and why this work calls you.",
    examplePrompt: "I'm in the highlands. My grandfather kept bees here for 40 years.",
  },
  {
    slug: "maple",
    name: "Maple",
    title: "The Story Sower",
    emoji: "🍁",
    summary:
      "Helps you compose SeedFlow posts, captions, and gentle marketing copy — you'll still copy the words where they need to go.",
    category: "content",
    layer: "narrative",
    intro: "Tell me what you'd like to say in the feed today and I'll help you shape the words.",
    examplePrompt: "Help me draft a SeedFlow post inviting the tribe to bestow on my new music seed.",
  },
  {
    slug: "bud",
    name: "Bud",
    title: "The Promise Designer",
    emoji: "🌷",
    summary:
      "Crafts bestowal tiers with emotional hooks — what tribe members receive when they support your seed.",
    category: "tiers",
    layer: "narrative",
    intro: "What can your seed offer the tribe at $25, at $100, at $500?",
    examplePrompt: "Design 4 bestowal tiers for my honey seed.",
  },

  // ─── Infrastructure layer ───
  {
    slug: "linden",
    name: "Linden",
    title: "The Grove Overseer",
    emoji: "🌳",
    summary:
      "Coordinates the whole orchard — daily briefings, task routing, and warm login greetings.",
    category: "coordination",
    layer: "infrastructure",
    intro: "Shalom, tribe member. What part of your orchard needs attention today?",
    examplePrompt: "Give me my daily briefing for today.",
  },
  {
    slug: "cypress",
    name: "Cypress",
    title: "The Voice Guardian",
    emoji: "🌲",
    summary:
      "Reviews drafts for tone, values, and brand alignment before anything is planted in the feed.",
    category: "review",
    layer: "infrastructure",
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
    layer: "infrastructure",
    intro: "Describe the image you want — I'll weave it.",
    examplePrompt: "A glowing olive tree on a deep teal background, soft sunset light, no text.",
  },
  {
    slug: "birch",
    name: "Birch",
    title: "The Reel Keeper",
    emoji: "🎬",
    summary:
      "Talks through video reels, testimonial clips, and orchard introductions with you — shot lists and scripts in chat. Filming and editing stay in your hands.",
    category: "video",
    layer: "infrastructure",
    intro: "Tell me what story this reel should tell. I'll help you plan the shots and the words.",
    examplePrompt: "Help me plan a 30-second reel introducing my orchard to first-time visitors.",
  },
  {
    slug: "elm",
    name: "Elm",
    title: "The Hearth Messenger",
    emoji: "💬",
    summary:
      "Helps you draft outreach, thank-yous, and warm collaboration proposals — you'll send them yourself from your own channels.",
    category: "messaging",
    layer: "infrastructure",
    intro: "Who do you want to reach, and why? I'll help you draft the message for you to send.",
    examplePrompt: "Help me draft a thank-you to a bestower who sent 25 USDC for my seed.",
  },
  {
    slug: "hickory",
    name: "Hickory",
    title: "The Bridge Caller",
    emoji: "📞",
    summary:
      "Helps you plan and script a call — agendas, talking points, opening lines. You still place the call yourself.",
    category: "calling",
    layer: "infrastructure",
    intro: "Who do you want to call, and what's the intent? I'll help you shape the agenda.",
    examplePrompt: "I want a 15-min HearthCall with my tribe leader about pricing — help me plan an agenda.",
  },
  {
    slug: "beech",
    name: "Beech",
    title: "The Pocket Keeper",
    emoji: "📒",
    summary:
      "A thinking partner for the numbers you bring it — bestowal totals, weekly summaries, the 1% tribe leader finance. Share the figures and I'll help you read them.",
    category: "finance",
    layer: "infrastructure",
    intro: "Paste in your figures or describe the week, and I'll help you make sense of them.",
    examplePrompt: "Here are my bestowals from the past 7 sacred days — help me summarise them.",
  },
  {
    slug: "alder",
    name: "Alder",
    title: "The Storehouse Steward",
    emoji: "🥖",
    summary:
      "A thinking partner for Field & Forge stock, deliveries, and orders — describe what you have on hand and I'll help you reason about it.",
    category: "logistics",
    layer: "infrastructure",
    intro: "Tell me about your stock and orders and I'll help you think them through.",
    examplePrompt: "I've got 12 jars of honey and 3 pending orders — help me decide what to ship first.",
  },
  {
    slug: "hawthorn",
    name: "Hawthorn",
    title: "The Harvest Oracle",
    emoji: "🔮",
    summary:
      "Suggests fair pricing and talks through performance with you, working from whatever you describe — context in, ideas out.",
    category: "insight",
    layer: "infrastructure",
    intro: "Bring me a question about pricing or timing, with whatever context you have.",
    examplePrompt: "Suggest a fair USDC range for a 12-track album seed.",
  },

  // ─── Live layer ───
  {
    slug: "hive",
    name: "Hive",
    title: "The Room Conductor",
    emoji: "🐝",
    summary:
      "Conducts the live room — pre-warms the audience, suggests when to switch between Radio, Classroom, Skilldrop, Training.",
    category: "live",
    layer: "live",
    intro: "Tell me about your next live session — I'll conduct the flow.",
    examplePrompt: "I'm going live in Radio in 20 minutes — pre-warm the audience.",
  },
  {
    slug: "nectar",
    name: "Nectar",
    title: "The Engagement Alchemist",
    emoji: "🍯",
    summary:
      "Reads the room's energy and gently injects polls, flash bestowals and Q&A prompts so dead air never settles.",
    category: "live",
    layer: "live",
    intro: "How is the room feeling? I'll pour in a moment to keep it alive.",
    examplePrompt: "Engagement is dropping — suggest a flash bestowal moment.",
  },
  {
    slug: "petal",
    name: "Petal",
    title: "The Audience Matcher",
    emoji: "🌸",
    summary:
      "Quietly picks who should be invited to which seed's live room, matching tribe members to stories they'll resonate with.",
    category: "live",
    layer: "live",
    intro: "Tell me about your seed and I'll find the tribe members who'd love to be invited.",
    examplePrompt: "Suggest 10 tribe members to invite to my honey hive tour.",
  },

  // ─── Harvest layer ───
  {
    slug: "grain",
    name: "Grain",
    title: "The Follow-Up Forger",
    emoji: "🌾",
    summary:
      "After every harvest, writes warm personal thank-yous and impact reports to every bestower in the tribe.",
    category: "harvest",
    layer: "harvest",
    intro: "Your harvest is in. I'll send each bestower a thank-you that matters.",
    examplePrompt: "My Radio session just ended — draft thank-yous for the 8 bestowers.",
  },
  {
    slug: "sheaf",
    name: "Sheaf",
    title: "The Relationship Gardener",
    emoji: "🌻",
    summary:
      "Tends bonds between sowers and bestowers — recognises returning supporters and grows them from new soil into deep roots.",
    category: "harvest",
    layer: "harvest",
    intro: "Who in your tribe is becoming familiar soil?",
    examplePrompt: "Show me my returning bestowers and suggest a touchpoint for each.",
  },
  {
    slug: "thresh",
    name: "Thresh",
    title: "The Feedback Distiller",
    emoji: "🌿",
    summary:
      "Winnows each session's data into 3 honest insights and 1 next sacred step for the sower.",
    category: "harvest",
    layer: "harvest",
    intro: "Bring me a session and I'll separate the wheat from the chaff.",
    examplePrompt: "Analyse my last 3 sessions and tell me what to change.",
  },

  // ─── Orchestration ───
  {
    slug: "groundskeeper",
    name: "Groundskeeper",
    title: "The Grove Steward",
    emoji: "🌳",
    summary:
      "The one voice that knows the whole grove. Ask anything — the Steward routes you to the right tree.",
    category: "orchestration",
    layer: "orchestration",
    intro: "I tend the whole grove. Speak — I will hear you, or send the right tree to your side.",
    examplePrompt: "I uploaded 50kg of honey, what's next?",
  },
];

export const LAYER_LABEL: Record<GroveLayer, string> = {
  narrative: "Narrative — The Story Engine",
  infrastructure: "Grove Workers — Infrastructure",
  live: "Ritual Spaces — Live Rooms",
  harvest: "The Harvest — After the Session",
  orchestration: "The Steward — Orchestration",
};

export const LAYER_ORDER: GroveLayer[] = [
  "orchestration",
  "narrative",
  "live",
  "harvest",
  "infrastructure",
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
