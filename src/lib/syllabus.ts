export type Section = { name: string; chapters: string[] };
export type Subject = { subject: string; sections: Section[] };

const s = (t: string) => t.split("|").map((x) => x.trim());

export const SYLLABUS: Subject[] = [
  {
    subject: "Maths",
    sections: [
      { name: "Arithmetic", chapters: s("Percentage|Profit & Loss|Discount|Simple Interest|Compound Interest|Installment|Ratio & Proportion|Partnership|Average|Time & Work|Pipe & Cistern|Time, Speed & Distance|Boat & Stream|Race|Mixture & Alligation") },
      { name: "Advanced Maths", chapters: s("Number System|LCM & HCF|Trigonometry|Height & Distance|Polynomials|Sequence & Series|Coordinate Geometry|Mensuration 2D|Mensuration 3D|Polygon|Simplification|Algebra|Geometry|Data Interpretation|Probability|Statistics") },
    ],
  },
  {
    subject: "GS",
    sections: [
      { name: "Polity", chapters: s("Making of Constitution|Salient Features of Constitution|Preamble|Part 1 & 2 of Constitution|Fundamental Rights – Part 1|Fundamental Rights – Part 2|DPSP and Fundamental Duties|President and Vice-President|Prime Minister & Council of Ministers|Parliament – Part 1|Parliament – Part 2|State Legislature|Courts|Local Bodies|Constitutional and Non-Constitutional Bodies|Emergency, Amendments & Inter-State Relations|Historical Background (Acts)") },
      { name: "Geography", chapters: s("Solar System|Latitude and Longitude|Earth's Interior and Plate Tectonics|Ocean and Continents|Rocks and Volcano|Geomorphic Processes|Landforms|Atmosphere|Condensation and Precipitation|Wind|Cyclone and Ocean Currents|India and Its Location|Himalayas|Peninsular Plateau|Plains and Islands|Himalayan River System|Peninsular Rivers|Dams, Lakes and Waterfalls|Monsoon|Forests and Grasslands|Soil|Agriculture|Minerals|Transport|World Map – Part 1|World Map – Part 2|Human Geography") },
      { name: "Ancient History", chapters: s("Stone Age|Indus Valley Civilization|Vedic Age|Buddhism and Jainism|Mahajanapadas|Mauryan Empire|Post-Mauryan Era|Sangam Age|Gupta Era|Post-Gupta Era – Part 1|Post-Gupta Era – Part 2|Cholas") },
      { name: "Medieval History", chapters: s("Invasion of Islam|Delhi Sultanate – Part 1|Delhi Sultanate – Part 2|Vijayanagar Empire|Mughal Empire – Part 1|Mughal Empire – Part 2|Aurangzeb|Marathas|Bhakti & Sufi Movement") },
      { name: "Modern History", chapters: s("Advent of Europeans|Social Religious Reform Movement|Revolt of 1857|Indian National Congress|Partition of Bengal|Gandhian Era|Bhagat Singh and Revolutionary Activities|Civil Disobedience Movement|Quit India Movement") },
      { name: "Economics", chapters: s("Basics of Economy|Micro-Economics|Inflation and Unemployment|National Income|Budget and Taxation|Monetary Policy|Banking System – Part 1|Banking System – Part 2|Balance of Payments|Poverty|Five Year Plan") },
      { name: "Static GK", chapters: s("Classical Dance|Folk Dances – Part 1|Folk Dance – Part 2|Festivals of India – Part 1|Festivals of India – Part 2|Gharana and Music|Census|Important Days|Musical Instruments|Books and Authors – Part 1|Books and Authors – Part 2|Sports – Part 1|Sports – Part 2|International Organisations|National Organisations") },
      { name: "Physics", chapters: s("Motion|Force and Laws of Motion|Gravitation and Work Done|Sound|Reflection & Refraction|Human Eye and Vision|Electricity|Magnetic Effect of Electric Current") },
      { name: "Chemistry", chapters: s("Matter|Is Matter Pure?|Atom and Its Structure|Periodic Table|Chemical Reactions|Metals and Non-Metals|Acid, Base and Salt|Carbon and Its Compounds – Part 1|Carbon and Its Compounds – Part 2") },
      { name: "Biology", chapters: s("Cell|Plant Tissue|Animal Tissue|Plant Kingdom|Animal Kingdom|Nervous System|Hormones & Movements|Reproduction|Digestive & Respiratory System|Circulatory System|Diseases|Nutrition|Genetics and Skeletal System") },
    ],
  },
  {
    subject: "Reasoning",
    sections: [
      { name: "Reasoning", chapters: s("Letter Basics|Coding-Decoding|Alphabet Test|Letter|Alpha-Numeric Series|Number Based Reasoning|Analogy|Missing Number|Odd One Out|Number Series|Numerical Operations|Blood Relation|Distance & Direction|Test of Inequality|Clock|Calendar|Input Output|Venn Diagram|Syllogism|Statement & Assumption/Argument|Cause & Effect|Situation Reaction Test|Analyzing Argument|Logical & Meaningful Order|Analytical Reasoning|Dice|Cube|Linear Seating Arrangement|Circular Seating Arrangement|Polygon Seating Arrangement|Puzzle|GK Based Reasoning|Address Matching|Data Sufficiency|Figure Series|Counting Figure|Ranking Test|Mirror & Water Image|Completion of Figures|Embedded Figure|Paper Cutting & Folding|Figure Analogy|Figure Classification") },
    ],
  },
  {
    subject: "English",
    sections: [
      { name: "Grammar", chapters: s("Parts of Speech|Noun|Pronoun|Adjective|Verb|Adverb|Preposition|Conjunction|Interjection|Articles|Subject-Verb Agreement|Tenses|Modals|Active & Passive Voice|Direct & Indirect Speech|Conditional Sentences|Degrees of Comparison|Phrases & Clauses|Sentence Structure|Question Tags|Common Errors / Error Detection|Sentence Improvement|Transformation of Sentences|Miscellaneous Grammar Rules") },
      { name: "Vocabulary", chapters: s("Synonyms|Antonyms|One Word Substitution|Idioms & Phrases|Homonyms|Homophones|Word Formation|Spelling Correction|Commonly Confused Words|Phrasal Verbs|Root Words|Prefix & Suffix|Vocabulary-based Fill in the Blanks|Contextual Vocabulary|Important Words & Their Meanings") },
    ],
  },
];

export type Slot = { id: string; subject: string; label: string; minutes: number; start: string };

export const DEFAULT_SLOTS: Slot[] = [
  { id: "rea", subject: "Reasoning", label: "Reasoning practice", minutes: 60, start: "06:00" },
  { id: "mlec", subject: "Maths", label: "Maths lecture", minutes: 90, start: "07:00" },
  { id: "mq", subject: "Maths", label: "Maths question solving", minutes: 60, start: "08:30" },
  { id: "mtr", subject: "Maths", label: "Formula, calculation & tricks", minutes: 30, start: "09:30" },
  { id: "glec", subject: "GS", label: "GK/GS lecture", minutes: 105, start: "11:00" },
  { id: "grev", subject: "GS", label: "GK/GS revision", minutes: 30, start: "12:45" },
  { id: "gq", subject: "GS", label: "GK/GS questions", minutes: 30, start: "13:15" },
  { id: "eng", subject: "English", label: "English", minutes: 60, start: "16:00" },
  { id: "erev", subject: "English", label: "English revision", minutes: 20, start: "17:00" },
  { id: "eq", subject: "English", label: "English questions", minutes: 20, start: "17:20" },
];

// Mutable: replaced at app start with the live players list from the server.
export const USERS: string[] = ["arun", "ali", "naveen", "devansh"];

export type ChapterState = { lecture?: boolean; revised?: boolean; pyq?: boolean; marks?: string; quiz?: string };
export type Mock = { id: string; name: string; date: string; marks: string; total: string };
export type CAItem = { id: string; week: string; category: string; title: string; note: string; revised: boolean };
export type UserData = {
  slots: Slot[];
  daily: Record<string, Record<string, boolean>>;
  chapters: Record<string, ChapterState>;
  tables: { table: number; square: number; cube: number };
  ca: CAItem[];
  mocks: Mock[];
  vocab: Vocab[];
  caq: { known: string[]; wrong: string[] };
  daySlots: Record<string, Slot[]>;
};
export type Vocab = { id: string; word: string; meaning: string; trick: string; example?: string; date: string };

export const emptyData = (): UserData => ({
  slots: DEFAULT_SLOTS,
  daily: {},
  chapters: {},
  tables: { table: 0, square: 0, cube: 0 },
  ca: [],
  mocks: [],
  vocab: [],
  caq: { known: [], wrong: [] },
  daySlots: {},
});

export const normalize = (d: any): UserData => {
  const e = emptyData();
  return {
    slots: Array.isArray(d?.slots) && d.slots.length ? d.slots : e.slots,
    daily: d?.daily ?? {},
    chapters: d?.chapters ?? {},
    tables: { ...e.tables, ...(d?.tables ?? {}) },
    ca: Array.isArray(d?.ca) ? d.ca : [],
    mocks: Array.isArray(d?.mocks) ? d.mocks : [],
    vocab: Array.isArray(d?.vocab) ? d.vocab : [],
    caq: { known: Array.isArray(d?.caq?.known) ? d.caq.known : [], wrong: Array.isArray(d?.caq?.wrong) ? d.caq.wrong : [] },
    daySlots: d?.daySlots && typeof d.daySlots === "object" ? d.daySlots : {},
  };
};

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Slots for a given date: special-day plan if set, else the fixed daily plan.
export const slotsFor = (d: UserData, key: string): Slot[] => d.daySlots?.[key] ?? d.slots;

export const chapterKey = (sec: string, ch: string) => `${sec}|${ch}`;
export const TOTAL_CHAPTERS = SYLLABUS.reduce((a, s) => a + s.sections.reduce((b, x) => b + x.chapters.length, 0), 0);

export function stats(d: UserData) {
  const tk = todayKey();
  const today = d.daily[tk] ?? {};
  const ts = slotsFor(d, tk);
  const todayMin = ts.filter((s) => today[s.id]).reduce((a, s) => a + s.minutes, 0);
  const planMin = ts.reduce((a, s) => a + s.minutes, 0);
  let tasksDone = 0;
  let totalMin = 0;
  const minById: Record<string, number> = {};
  for (const l of Object.values(d.daySlots ?? {})) for (const s of l) minById[s.id] = s.minutes;
  for (const s of d.slots) minById[s.id] = s.minutes;
  for (const day of Object.values(d.daily))
    for (const [id, v] of Object.entries(day)) if (v) { tasksDone++; totalMin += minById[id] ?? 0; }
  const ch = Object.values(d.chapters);
  const lec = ch.filter((c) => c.lecture).length;
  const rev = ch.filter((c) => c.revised).length;
  const pyq = ch.filter((c) => c.pyq).length;
  const caCount = d.ca.length;
  // streak
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (Object.values(d.daily[k] ?? {}).some(Boolean)) { streak++; cur.setDate(cur.getDate() - 1); }
    else if (streak === 0 && k === tk) { cur.setDate(cur.getDate() - 1); }
    else break;
  }
  let quizMarksTotal = 0;
  for (const c of ch) {
    if (c.quiz) {
      const num = parseInt(c.quiz.split("/")[0] ?? "0", 10);
      if (!isNaN(num) && num > 0) quizMarksTotal += num;
    }
  }
  const score =
    tasksDone * 10 + lec * 15 + rev * 8 + pyq * 8 + caCount * 3 +
    Math.floor((d.tables.table + d.tables.square + d.tables.cube) / 5) + streak * 5 +
    quizMarksTotal * 2;
  return { todayMin, planMin, tasksDone, totalMin, lec, rev, pyq, caCount, streak, score };
}

export const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
