/**
 * Hardcoded warm voice lines for Gentoo + Debian inside Tribal Hearts.
 * No AI cost — used by AgentNudgeBubble and empty states.
 */
export const heartsAgentLines = {
  gentoo: {
    welcome: "🐧 Welcome to the Tribal Hearts garden — a safe place to meet someone who shares your values.",
    matchesFound: (n: number) =>
      `🌸 We found ${n} wonderful match${n === 1 ? '' : 'es'} who share your values. Would you like to start chatting safely in the ChatApp?`,
    noMatches: "Take a breath, water your seeds — fresh matches bloom every day. 🌱",
    pacingReminder: "Remember, you're in control — text first, voice or video only when you feel ready 😊",
  },
  debian: {
    safetyBanner: "All chats, voice & video stay safely inside Sow2Grow — no personal numbers or emails needed 💚",
    mutualMatch: "It's mutual! 🌸 Say hi when you're ready — there's no rush.",
    photoTip: "A friendly, recent photo helps people see your warmth. (Optional but encouraged.)",
  },
};

export const onboardingQuestions: Array<{ key: string; text: string; placeholder?: string }> = [
  { key: 'first_name', text: "What's your first name?", placeholder: 'Just your first name is fine' },
  { key: 'gender', text: 'Are you a man or a woman?', placeholder: '"man" or "woman"' },
  { key: 'birthdate', text: "What's your date of birth? (YYYY-MM-DD)", placeholder: '1990-04-12' },
  { key: 'country', text: "Which country do you live in?", placeholder: 'e.g. South Africa' },
  { key: 'region', text: 'And which city or region?', placeholder: 'e.g. Cape Town' },
  { key: 'faith', text: 'How does faith show up in your daily life?' },
  { key: 'values', text: 'What three values matter most to you?' },
  { key: 'family_goals', text: 'What kind of family life are you hoping for?' },
  { key: 'lifestyle', text: 'How would you describe your daily rhythm — quiet, active, creative?' },
  { key: 'interests', text: 'What do you love doing for fun?' },
  { key: 'looking_for', text: 'What kind of partner are you hoping to meet?' },
  { key: 'deal_makers', text: "What's something they'd do that would make you feel truly seen?" },
  { key: 'complexion_pref', text: 'When you picture a partner, do you have a complexion preference?' },
  { key: 'physical_prefs', text: 'Are there any physical qualities that draw you in?' },
  { key: 'distance', text: 'Are you open to meeting someone far away, or do you prefer nearby? (km)' },
];
