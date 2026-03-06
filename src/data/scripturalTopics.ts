export interface StudyQuestion {
  id: string
  question: string
  answer: string
  conventionalView: { conventional: string; scripture: string }[]
  mindBlown: { text: string; reference: string }
  dropTheMic?: { left: string; right: string; leftLabel?: string; rightLabel?: string }
}

export interface StudyTopic {
  id: string
  number: number
  title: string
  icon: string
  questions: StudyQuestion[]
}

export const scripturalTopics: StudyTopic[] = [
  {
    id: 'time-is-near',
    number: 1,
    title: 'THE TIME IS NEAR',
    icon: '⚡',
    questions: [
      {
        id: 'this-generation',
        question: 'Why did Yahusha say "this generation" if he meant us?',
        answer: 'Placeholder: Detailed study content will be added here. This section will explore every use of "this generation" in the gospels and demonstrate that Yahusha was speaking directly to his contemporaries — the people standing before him — not a future generation thousands of years later.',
        conventionalView: [
          { conventional: '"This generation means a future generation that sees the signs"', scripture: 'Every other use of "this generation" in the gospels refers to Yahusha\'s contemporaries (Matthew 11:16; 12:41-42; 23:36)' },
          { conventional: '"There must be a gap of thousands of years"', scripture: 'The text has no gap — "all these things" connects directly (Matthew 24:33-34)' },
        ],
        mindBlown: { text: 'The Greek word "genea" (generation) is used 37 times in the New Testament. Not once does it refer to a future race or nation — it ALWAYS means the people alive at the time of speaking.', reference: 'Matthew 24:34' },
        dropTheMic: { left: '"This generation will not pass away until all these things take place." — Yahusha', right: 'They didn\'t pass away. It all happened. 70 AD.', leftLabel: 'THE PROMISE', rightLabel: 'THE FULFILLMENT' },
      },
      {
        id: 'time-at-hand',
        question: 'What does "the time is at hand" actually mean? (spoiler: it meant then!)',
        answer: 'Placeholder: This study will examine the phrase "the time is at hand" in its original Greek context, showing that "engus" (near/at hand) always meant imminent — not thousands of years away.',
        conventionalView: [
          { conventional: '"At hand" means sometime in the far future', scripture: '"At hand" (engus) means near, imminent — the same word used for "summer is near" (Matthew 24:32)' },
        ],
        mindBlown: { text: 'Revelation 1:3 says "the time is near" while Daniel 8:26 was told to "seal up the vision, for it refers to many days in the future." If Revelation was thousands of years away, why wasn\'t IT sealed too?', reference: 'Revelation 1:3, Daniel 8:26' },
      },
      {
        id: 'daniel-vs-revelation',
        question: 'Daniel vs. Revelation — why one was sealed and one wasn\'t',
        answer: 'Placeholder: A comparative study showing that Daniel was told to seal his prophecy because fulfillment was far off, while John was told NOT to seal Revelation because fulfillment was near.',
        conventionalView: [
          { conventional: 'Both books describe the same distant future events', scripture: 'Daniel was sealed because it was far off (Daniel 12:4). Revelation was NOT sealed because fulfillment was near (Revelation 22:10)' },
        ],
        mindBlown: { text: 'Daniel\'s prophecy was ~500 years from fulfillment and was told to SEAL it. John\'s prophecy was mere years away and was told NOT to seal it. If Revelation was 2000+ years away, the command makes no sense.', reference: 'Daniel 12:4, Revelation 22:10' },
      },
      {
        id: 'last-hour',
        question: 'The last hour — a mathematical prophecy explained',
        answer: 'Placeholder: This study will break down the "last hour" declaration and its mathematical precision in first-century context.',
        conventionalView: [
          { conventional: 'The "last hour" is still ongoing 2000 years later', scripture: 'John said "it IS the last hour" — present tense, to his audience (1 John 2:18)' },
        ],
        mindBlown: { text: 'John didn\'t say "the last hour is coming." He said "IT IS the last hour." Present tense. To people alive in the first century.', reference: '1 John 2:18' },
      },
    ],
  },
  {
    id: 'generation-saw-it-all',
    number: 2,
    title: 'THE GENERATION THAT SAW IT ALL',
    icon: '⚡',
    questions: [
      {
        id: 'who-was-this-generation',
        question: 'Who was "this generation" really?',
        answer: 'Placeholder: Detailed study identifying the specific generation Yahusha addressed.',
        conventionalView: [
          { conventional: 'A future generation yet to come', scripture: 'The generation that heard Yahusha speak — those alive in the first century (Matthew 23:36)' },
        ],
        mindBlown: { text: 'Yahusha told the Pharisees "all these things will come upon THIS generation" — and 40 years later, Jerusalem was destroyed exactly as prophesied.', reference: 'Matthew 23:36' },
      },
      {
        id: 'specific-instructions',
        question: 'The specific instructions — were they for us or them?',
        answer: 'Placeholder: Study examining the practical instructions Yahusha gave about fleeing and how they applied to first-century believers.',
        conventionalView: [
          { conventional: 'The instructions to flee are for end-times believers', scripture: '"Let those who are in Judea flee to the mountains" — specific geographic instructions for specific people (Matthew 24:16)' },
        ],
        mindBlown: { text: 'Why would Yahusha tell people 2000 years in the future to "pray that your flight not be on the Sabbath"? Because he wasn\'t talking to us — he was talking to THEM.', reference: 'Matthew 24:20' },
      },
      {
        id: 'one-taken-one-left',
        question: '"One taken, one left" — the real meaning (hint: it\'s NOT the rapture)',
        answer: 'Placeholder: Study revealing the true meaning of this oft-misinterpreted passage.',
        conventionalView: [
          { conventional: 'The one "taken" is raptured to heaven', scripture: 'In context, being "taken" is judgment (like the flood took them away). The one LEFT is the blessed one (Matthew 24:39-41)' },
        ],
        mindBlown: { text: 'Read the context! "As in the days of Noah... the flood came and TOOK them all away, so will the coming of the Son of Man be." Being TAKEN is judgment, not rescue!', reference: 'Matthew 24:39' },
      },
      {
        id: 'believers-who-fled',
        question: 'What happened to the believers who fled?',
        answer: 'Placeholder: Historical account of the early believers who heeded Yahusha\'s warning and fled to Pella.',
        conventionalView: [
          { conventional: 'This hasn\'t happened yet', scripture: 'Historical records confirm early believers fled to Pella before Jerusalem\'s destruction in 70 AD, exactly as instructed' },
        ],
        mindBlown: { text: 'Eusebius records that the believers in Jerusalem received a divine warning and fled to Pella before the siege. They OBEYED the instruction. It was for THEM.', reference: 'Eusebius, Church History 3.5.3' },
      },
    ],
  },
  {
    id: 'daniels-70-weeks',
    number: 3,
    title: "DANIEL'S 70 WEEKS — THE TIMELINE UNLOCKED",
    icon: '⚡',
    questions: [
      {
        id: '70-weeks-end',
        question: 'When did the 70 weeks really end?',
        answer: 'Placeholder: Detailed timeline study of Daniel\'s 70 weeks prophecy.',
        conventionalView: [
          { conventional: 'The 70th week is still future (the "gap theory")', scripture: 'There is no gap in the text — the 70 weeks are consecutive, ending in the first century' },
        ],
        mindBlown: { text: 'There is ZERO textual basis for inserting a 2000+ year gap between the 69th and 70th week. The text reads as one continuous timeline.', reference: 'Daniel 9:24-27' },
      },
      {
        id: 'jubilee-connection',
        question: 'The jubilee connection no one talks about',
        answer: 'Placeholder: Study connecting the jubilee cycles to Daniel\'s prophecy.',
        conventionalView: [
          { conventional: 'Jubilee cycles are unrelated to Daniel\'s prophecy', scripture: 'The jubilee cycle is the KEY to understanding the timeline — 70 weeks = 10 jubilee cycles' },
        ],
        mindBlown: { text: '70 x 7 = 490 years = exactly 10 jubilee cycles. This is not coincidence — it\'s divine precision.', reference: 'Daniel 9:24, Leviticus 25:8-10' },
      },
      {
        id: 'final-week',
        question: '4024 AA to 4031 AA — what really happened in that final week',
        answer: 'Placeholder: Year-by-year breakdown of the final "week" of Daniel\'s prophecy.',
        conventionalView: [
          { conventional: 'The final week is the future "tribulation period"', scripture: 'The final week corresponds to real, historical events in the first century' },
        ],
        mindBlown: { text: 'The "middle of the week" when sacrifice ceased isn\'t a future event — it happened when Yahusha\'s sacrifice made the temple sacrifices obsolete.', reference: 'Daniel 9:27' },
      },
      {
        id: 'priesthood-changed',
        question: 'Why the priesthood CHANGED (and what it means for us)',
        answer: 'Placeholder: Study on the change from Levitical to Melchizedek priesthood.',
        conventionalView: [
          { conventional: 'The Levitical priesthood will be restored', scripture: 'The priesthood changed permanently — from Levi to Melchizedek (Hebrews 7:11-12)' },
        ],
        mindBlown: { text: 'If the priesthood changed, the law ALSO had to change (Hebrews 7:12). This isn\'t future — it already happened.', reference: 'Hebrews 7:12' },
      },
    ],
  },
  {
    id: 'blood-of-covenant',
    number: 4,
    title: 'THE BLOOD OF THE COVENANT',
    icon: '⚡',
    questions: [
      {
        id: 'was-yahusha-sacrifice',
        question: 'Was Yahusha a sacrifice? (the answer may surprise you)',
        answer: 'Placeholder: Deep study on the nature of Yahusha\'s death and its covenantal significance.',
        conventionalView: [
          { conventional: 'Yahusha was a substitutionary blood sacrifice for sin', scripture: 'The passover lamb was never a sin offering — it was a covenant meal. Yahusha\'s blood ratified the new covenant (Luke 22:20)' },
        ],
        mindBlown: { text: 'The Passover lamb was NEVER classified as a sin offering in Torah. It was a covenant meal. This changes everything about how we understand the cross.', reference: 'Exodus 12, Luke 22:20' },
      },
      {
        id: 'passover-lamb',
        question: 'The passover lamb — sin offering or something else?',
        answer: 'Placeholder: Torah-based study on the true purpose of the Passover lamb.',
        conventionalView: [
          { conventional: 'The passover lamb atoned for sin', scripture: 'The passover lamb was for protection and covenant, not sin atonement (Exodus 12:13)' },
        ],
        mindBlown: { text: 'Search all of Exodus 12. The word "sin" does not appear ONCE. The lamb\'s blood was a sign of covenant protection, not sin atonement.', reference: 'Exodus 12' },
      },
      {
        id: 'blood-equals-life',
        question: 'Blood = life = torah lived out — the connection everyone misses',
        answer: 'Placeholder: Study connecting blood, life, and Torah observance.',
        conventionalView: [
          { conventional: 'Blood atonement means death pays for sin', scripture: '"The life of the flesh is in the blood" — blood represents LIFE, not death (Leviticus 17:11)' },
        ],
        mindBlown: { text: 'Leviticus 17:11 says "the LIFE of the flesh is in the blood." Blood = life. Yahusha\'s blood = his LIFE lived out in perfect Torah observance.', reference: 'Leviticus 17:11' },
      },
      {
        id: 'celebrating-murder',
        question: 'Why celebrating murder is NOT the gospel',
        answer: 'Placeholder: Challenging study on reframing the crucifixion narrative.',
        conventionalView: [
          { conventional: 'The crucifixion was "God\'s plan" to kill his son', scripture: 'Scripture calls the crucifixion murder by lawless men, which YHWH used for good (Acts 2:23, Genesis 50:20)' },
        ],
        mindBlown: { text: 'Peter told the crowd: "You, with the help of lawless men, put him to death by nailing him to the cross" (Acts 2:23). It was murder. YHWH turned it for good — but it was still murder.', reference: 'Acts 2:23' },
      },
    ],
  },
  {
    id: 'strong-man',
    number: 5,
    title: 'THE STRONG MAN — BOUND AND DEFEATED',
    icon: '⚡',
    questions: [
      {
        id: 'who-was-strong-man',
        question: 'Who was the strong man really?',
        answer: 'Placeholder: Study identifying the strong man and what his binding means.',
        conventionalView: [
          { conventional: 'Satan is still unbound and ruling the earth', scripture: 'Yahusha said "I saw Satan fall like lightning" and bound him to plunder his house (Luke 10:18, Matthew 12:29)' },
        ],
        mindBlown: { text: 'Yahusha said in the PAST TENSE: "I SAW Satan fall like lightning from heaven." It was done. The strong man was bound.', reference: 'Luke 10:18' },
      },
      {
        id: 'house-plundered',
        question: 'How his house was plundered (with proof!)',
        answer: 'Placeholder: Study with scriptural proof of the strong man\'s defeat.',
        conventionalView: [
          { conventional: 'The plundering is still future', scripture: 'Yahusha plundered the strong man\'s house during his ministry — healing, delivering, and setting captives free (Matthew 12:29)' },
        ],
        mindBlown: { text: 'Every healing, every deliverance, every demon cast out was Yahusha plundering the strong man\'s house. It wasn\'t future — it was happening in real time.', reference: 'Matthew 12:29' },
      },
      {
        id: 'captives-released',
        question: 'The captives released — Matthew 27:52-53 EXPLAINED',
        answer: 'Placeholder: Study on the resurrection of the saints at the crucifixion.',
        conventionalView: [
          { conventional: 'Matthew 27:52-53 is symbolic or unexplained', scripture: 'The tombs broke open and "many bodies of the set-apart ones who had fallen asleep were raised" — literal fulfillment of captive release' },
        ],
        mindBlown: { text: 'The graves OPENED. The dead saints ROSE. They went into the city and appeared to MANY. This is the most ignored miracle in the entire Bible.', reference: 'Matthew 27:52-53' },
      },
      {
        id: 'righteous-dead',
        question: 'What happened to the righteous dead before Messiah?',
        answer: 'Placeholder: Study on the state of the righteous dead before and after Yahusha.',
        conventionalView: [
          { conventional: 'The righteous dead are still in the grave waiting', scripture: 'The captives were set free — those held in Abraham\'s bosom were released at the resurrection (Ephesians 4:8)' },
        ],
        mindBlown: { text: '"When he ascended on high, he led captives in his train." The righteous dead weren\'t left behind — they were LED OUT.', reference: 'Ephesians 4:8' },
      },
    ],
  },
  {
    id: 'first-and-last',
    number: 6,
    title: 'THE FIRST AND THE LAST',
    icon: '⚡',
    questions: [
      {
        id: 'who-waits-in-grave',
        question: "If he's the last, who waits in the grave?",
        answer: 'Placeholder: Study on the implications of Yahusha being "the first and the last."',
        conventionalView: [
          { conventional: 'Believers wait unconscious in graves until a future resurrection', scripture: 'If Yahusha is "the last" and he rose, no one remains in the grave after him' },
        ],
        mindBlown: { text: 'Think about it: if Yahusha is THE LAST, then by definition, no one comes after him in death\'s grip. Everyone after him goes directly to the Father.', reference: 'Revelation 1:17-18' },
      },
      {
        id: 'stephens-vision',
        question: "Stephen's vision — the pattern of the resurrection",
        answer: 'Placeholder: Study on Stephen\'s death and what it reveals about the afterlife.',
        conventionalView: [
          { conventional: 'Stephen\'s vision was unique and not normative', scripture: 'Stephen saw heaven OPEN and Yahusha standing — this is the pattern for all believers (Acts 7:55-56)' },
        ],
        mindBlown: { text: 'Stephen didn\'t go to sleep. He didn\'t go to a waiting place. He saw heaven OPEN, saw Yahusha STANDING to receive him, and went directly there.', reference: 'Acts 7:55-59' },
      },
      {
        id: 'absent-from-body',
        question: '"Absent from the body, present with the master" — what this REALLY means',
        answer: 'Placeholder: Study on Paul\'s teaching about death and presence with the Master.',
        conventionalView: [
          { conventional: 'This is poetic language, not literal', scripture: 'Paul stated it plainly: to be absent from the body IS to be present with the Master (2 Corinthians 5:8)' },
        ],
        mindBlown: { text: 'Paul said he DESIRED to depart and be WITH Messiah, which is "far better" (Philippians 1:23). He didn\'t desire unconscious soul sleep — he desired immediate presence.', reference: '2 Corinthians 5:8, Philippians 1:23' },
      },
      {
        id: 'first-resurrection-now',
        question: 'The first resurrection — is it happening NOW?',
        answer: 'Placeholder: Study on the nature and timing of the first resurrection.',
        conventionalView: [
          { conventional: 'The first resurrection is a future bodily event', scripture: 'The first resurrection is spiritual — passing from death to life when you believe (John 5:24-25)' },
        ],
        mindBlown: { text: '"The hour is coming AND NOW IS when the dead will hear the voice of the Son of Elohim, and those who hear will LIVE." Present tense. NOW IS.', reference: 'John 5:25' },
      },
    ],
  },
  {
    id: 'revelation-unveiled',
    number: 7,
    title: 'REVELATION UNVEILED',
    icon: '⚡',
    questions: [
      {
        id: 'seven-seals',
        question: 'The seven seals — what they actually meant',
        answer: 'Placeholder: Study on the seven seals and their first-century fulfillment.',
        conventionalView: [
          { conventional: 'The seals are future global catastrophes', scripture: 'The seals correspond to events in the Jewish-Roman war of 66-70 AD' },
        ],
        mindBlown: { text: 'The seals describe conquest, war, famine, death, martyrdom, cosmic upheaval, and silence — ALL documented events of the Jewish-Roman war by Josephus.', reference: 'Revelation 6, Josephus Wars' },
      },
      {
        id: 'two-witnesses',
        question: 'The two witnesses — who were they REALLY?',
        answer: 'Placeholder: Study identifying the two witnesses of Revelation.',
        conventionalView: [
          { conventional: 'Two future prophets who haven\'t appeared yet', scripture: 'The two witnesses represent Moses and Elijah — the Law and the Prophets — bearing witness in the last days of the old covenant' },
        ],
        mindBlown: { text: 'The two witnesses have power to turn water to blood (Moses) and shut the sky (Elijah). The text literally describes Moses and Elijah — the Law and the Prophets.', reference: 'Revelation 11:3-6' },
      },
      {
        id: '666-mark',
        question: "666 — the mark explained (it's NOT what you think)",
        answer: 'Placeholder: Study on the number of the beast and its first-century identification.',
        conventionalView: [
          { conventional: '666 is a future technology (microchip, barcode, etc.)', scripture: 'John told his READERS to calculate the number — it was identifiable THEN. In Hebrew gematria, Nero Caesar = 666' },
        ],
        mindBlown: { text: 'John said "let him who has understanding CALCULATE the number." He expected his first-century readers to figure it out. Neron Kesar (Nero Caesar) in Hebrew gematria = 666.', reference: 'Revelation 13:18' },
      },
      {
        id: 'babylon-the-great',
        question: 'Babylon the great — which city is it? (the answer is in 11:8)',
        answer: 'Placeholder: Study identifying Babylon the Great from scripture.',
        conventionalView: [
          { conventional: 'Babylon is Rome, or a future world system', scripture: 'Revelation 11:8 identifies the "great city" as where the Master was crucified — JERUSALEM' },
        ],
        mindBlown: { text: 'Revelation 11:8 literally says the great city is "where also their Master was crucified." Yahusha was crucified in JERUSALEM, not Rome, not a future city.', reference: 'Revelation 11:8' },
      },
    ],
  },
  {
    id: 'kingdom-already-here',
    number: 8,
    title: 'THE KINGDOM — ALREADY HERE',
    icon: '⚡',
    questions: [
      {
        id: 'new-jerusalem-now',
        question: 'Where is the New Jerusalem RIGHT NOW?',
        answer: 'Placeholder: Study on the present reality of the New Jerusalem.',
        conventionalView: [
          { conventional: 'New Jerusalem is a future physical city descending from sky', scripture: 'The New Jerusalem is the bride — the assembly of believers (Revelation 21:2, 9-10). It\'s HERE.' },
        ],
        mindBlown: { text: 'The angel said "I will show you the bride, the wife of the Lamb" and then showed John the New Jerusalem. The city IS the bride. The bride IS US.', reference: 'Revelation 21:9-10' },
      },
      {
        id: 'flesh-blood-inherit',
        question: 'Flesh and blood cannot inherit it — so what does?',
        answer: 'Placeholder: Study on what inherits the kingdom.',
        conventionalView: [
          { conventional: 'We need future glorified bodies to enter the kingdom', scripture: 'The kingdom is spiritual — entered by spiritual rebirth, not physical transformation (John 3:5-6)' },
        ],
        mindBlown: { text: 'Yahusha said "the kingdom of Elohim is WITHIN you" (Luke 17:21). Not above you. Not ahead of you. WITHIN you. Right now.', reference: 'Luke 17:21' },
      },
      {
        id: 'garden-exile-return',
        question: 'The garden, the exile, and the return',
        answer: 'Placeholder: Study tracing the narrative arc from Eden to restoration.',
        conventionalView: [
          { conventional: 'We\'re still in exile, waiting for restoration', scripture: 'The exile ended — access to the tree of life is restored through Messiah (Revelation 22:14)' },
        ],
        mindBlown: { text: 'Genesis ends with exile from the garden and a cherubim blocking access to the tree of life. Revelation ends with FREE ACCESS to the tree of life. The story is COMPLETE.', reference: 'Genesis 3:24, Revelation 22:14' },
      },
      {
        id: 'inside-vs-outside',
        question: 'Inside vs. outside — where are YOU?',
        answer: 'Placeholder: Study on the "inside" and "outside" of the kingdom.',
        conventionalView: [
          { conventional: 'Everyone is "outside" until a future event', scripture: 'The gates are open NOW — "blessed are those who wash their robes, that they may have the right to the tree of life and may enter through the gates" (Revelation 22:14)' },
        ],
        mindBlown: { text: 'The gates of the New Jerusalem are NEVER SHUT (Revelation 21:25). The invitation is perpetual. You can enter RIGHT NOW through covenant faithfulness.', reference: 'Revelation 21:25, 22:14' },
      },
    ],
  },
  {
    id: '68am-year',
    number: 9,
    title: '68AM — THE YEAR THAT CHANGED EVERYTHING',
    icon: '⚡',
    questions: [
      {
        id: 'aa-am-dating',
        question: 'Why we use AA and AM (After Adam, After Messiah)',
        answer: 'Placeholder: Study explaining the biblical dating system.',
        conventionalView: [
          { conventional: 'BC/AD or BCE/CE are the standard dating systems', scripture: 'The biblical calendar counts from creation (After Adam) and from Messiah (After Messiah) — centering time on YHWH\'s timeline' },
        ],
        mindBlown: { text: 'Why do we use a pagan emperor\'s dating system (AD = Anno Domini) when scripture provides its own timeline from creation? AA and AM restore the biblical framework.', reference: 'Genesis 5, Luke 3:23-38' },
      },
      {
        id: 'jubilee-year',
        question: 'The jubilee year — liberty AND judgment',
        answer: 'Placeholder: Study on the jubilee year and its dual nature.',
        conventionalView: [
          { conventional: 'Jubilee is only about celebration and freedom', scripture: 'Jubilee brought liberty to the oppressed AND judgment on oppressors — it was both (Leviticus 25:10, Isaiah 61:1-2)' },
        ],
        mindBlown: { text: 'Yahusha read Isaiah 61 in the synagogue and declared "TODAY this scripture is fulfilled." He announced the jubilee — liberty for captives and judgment on the oppressive system.', reference: 'Luke 4:18-21' },
      },
      {
        id: 'what-happened-68am',
        question: 'What actually happened in 68 AM (4068 AA)',
        answer: 'Placeholder: Historical study of the pivotal events of 68 AM.',
        conventionalView: [
          { conventional: 'Nothing significant happened in this year', scripture: 'The convergence of jubilee cycles, the Jewish revolt, and the fall of the old covenant system all point to this pivotal year' },
        ],
        mindBlown: { text: 'The year 68 AM sits at the exact convergence of Daniel\'s timeline, the jubilee cycle, and the destruction of the old covenant system. Coincidence? Not a chance.', reference: 'Daniel 9:24-27' },
      },
      {
        id: 'conventional-dating',
        question: 'Why conventional dating misses the point',
        answer: 'Placeholder: Study on the problems with conventional chronology.',
        conventionalView: [
          { conventional: 'The standard chronology is accurate enough', scripture: 'Conventional dating has been adjusted and manipulated — returning to the biblical genealogies reveals the true timeline' },
        ],
        mindBlown: { text: 'When you trace the biblical genealogies without gaps, the timeline tells a completely different story than what conventional scholarship teaches.', reference: 'Genesis 5, 11; Luke 3' },
      },
    ],
  },
  {
    id: 'living-in-victory',
    number: 10,
    title: 'LIVING IN THE VICTORY',
    icon: '⚡',
    questions: [
      {
        id: 'whats-still-future',
        question: "If the victory is won, what's still future?",
        answer: 'Placeholder: Study on what remains for believers if the major prophecies are fulfilled.',
        conventionalView: [
          { conventional: 'Most biblical prophecy is still unfulfilled', scripture: 'The victory IS won. What remains is individual entrance into the covenant — walking through the open gates (Revelation 22:14)' },
        ],
        mindBlown: { text: 'The question isn\'t "when will the kingdom come?" — it\'s "will you enter the kingdom that\'s ALREADY HERE?"', reference: 'Luke 17:20-21' },
      },
      {
        id: 'outside-explained',
        question: 'The "outside" explained',
        answer: 'Placeholder: Study on what it means to be "outside" the kingdom.',
        conventionalView: [
          { conventional: '"Outside" is a future state of damnation', scripture: '"Outside are the dogs, sorcerers, sexually immoral..." — this describes a present spiritual reality, not just a future one (Revelation 22:15)' },
        ],
        mindBlown: { text: 'If the gates are never shut and the tree of life is accessible, then "outside" is a CHOICE. People stand outside an open door. The tragedy is choosing to stay there.', reference: 'Revelation 21:25, 22:15' },
      },
      {
        id: 'enter-through-gates',
        question: 'How do we enter through the gates?',
        answer: 'Placeholder: Practical study on entering the kingdom.',
        conventionalView: [
          { conventional: 'Just believe and wait for heaven', scripture: '"Blessed are those who DO his commandments, that they may have the right to the tree of life and enter through the gates" (Revelation 22:14)' },
        ],
        mindBlown: { text: 'Revelation 22:14 doesn\'t say "blessed are those who believe" — it says "blessed are those who DO his commandments." Faith without obedience leaves you outside.', reference: 'Revelation 22:14' },
      },
      {
        id: 'beautiful-truth',
        question: 'The beautiful truth summarized',
        answer: 'Placeholder: The grand summary of the entire study.',
        conventionalView: [
          { conventional: 'We live in fear, waiting for tribulation and judgment', scripture: 'The victory is WON. The gates are OPEN. The tree of life is ACCESSIBLE. We live in triumph, not terror.' },
        ],
        mindBlown: { text: 'You are not waiting for victory. You are living IN it. The kingdom is here. The gates are open. The Messiah reigns. Enter in.', reference: 'Colossians 1:13' },
      },
    ],
  },
]
