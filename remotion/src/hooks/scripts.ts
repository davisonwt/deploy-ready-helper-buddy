export type HookScript = {
  id: string;
  title: string;
  /** Full voiceover read, in order. Each line becomes one caption beat. */
  lines: string[];
  /** Short punch words shown huge at the very top of the clip (frame 0). */
  hookCard: string;
  motif:
    | "commission"
    | "anonymous"
    | "bestow"
    | "fivedollar"
    | "hands"
    | "moneypath";
};

export const HOOK_SCRIPTS: HookScript[] = [
  {
    id: "h1-thirty-percent",
    title: "The 30% Question",
    hookCard: "WHO TOOK 30%\nOF YOUR SALE?",
    motif: "commission",
    lines: [
      "You made it. You shipped it. You answered the messages at midnight.",
      "So why does someone else keep thirty percent?",
      "On Sow2Grow that number is five dollars. A month. Not a cut.",
      "Plant a seed. Watch your tribe water it.",
    ],
  },
  {
    id: "h2-anonymous",
    title: "Anonymous",
    hookCard: "SELLER_8842",
    motif: "anonymous",
    lines: [
      "Most marketplaces sell your product and hide your face.",
      "Nobody bestows toward a seller number.",
      "Here, people don't buy from a store. They bestow toward a person.",
      "Sow2Grow. Plant a seed. Watch your tribe water it.",
    ],
  },
  {
    id: "h3-bestow",
    title: "What is a Bestowal?",
    hookCard: "WE DON'T\nSAY BUY.",
    motif: "bestow",
    lines: [
      "We say bestow.",
      "Because money moving between two people who know each other isn't a transaction. It's water.",
      "You bestow. They grow. The tribe eats.",
      "Sow2Grow. Plant a seed. Watch your tribe water it.",
    ],
  },
  {
    id: "h4-five-dollars",
    title: "Five Dollars",
    hookCard: "$5",
    motif: "fivedollar",
    lines: [
      "Five dollars a month. That's the whole platform.",
      "Products. Music. Books. Produce. Services. Live rooms. Your own storefront.",
      "No commission. No ransom on your own customers.",
      "Sow2Grow. Plant a seed. Watch your tribe water it.",
    ],
  },
  {
    id: "h5-nine-hands",
    title: "Nine Hands",
    hookCard: "WHICH HAND\nARE YOU?",
    motif: "hands",
    lines: [
      "Farmer. Maker. Musician. Author. Healer. Cook. Builder. Teacher. Trader.",
      "Nine kinds of hands. One tribe.",
      "Pick yours, and open your orchard tonight.",
      "Sow2Grow. Plant a seed. Watch your tribe water it.",
    ],
  },
  {
    id: "h6-money-path",
    title: "Where Your Money Goes",
    hookCard: "WHERE DOES\nYOUR MONEY GO?",
    motif: "moneypath",
    lines: [
      "On most apps? Warehouses. Ad budgets. Shareholders.",
      "Here it goes one place.",
      "The hands that made it.",
      "Sow2Grow. Plant a seed. Watch your tribe water it.",
    ],
  },
];
