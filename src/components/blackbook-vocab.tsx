import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
  Plus,
  Volume2,
  Trash2,
  Search,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserData } from "@/lib/syllabus";

export type BlackBookWord = {
  id: string;
  word: string;
  pos: string; // Part of speech, e.g. [adj.], [noun], [verb]
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  trick: string;
  sentences: string[];
  repeatCount: string;
};

export const BLACKBOOK_POOL: BlackBookWord[] = [
  {
    id: "bb-1",
    word: "Ephemeral",
    pos: "[adj.]",
    meaning: "Lasting for a very short time; momentary, fleeting, transient",
    synonyms: ["Transient", "Fleeting", "Evanescent", "Momentary"],
    antonyms: ["Eternal", "Permanent", "Perpetual", "Enduring"],
    trick: "Sounds like 'A-feem-oral' (effects of opium are brief) or E-phantom (ghost disappears fast)",
    sentences: [
      "Fashions in modern society are ephemeral, changing with every passing season.",
      "He realized that wealth and worldly pleasures are purely ephemeral."
    ],
    repeatCount: "Repeated 14+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-2",
    word: "Altruist",
    pos: "[noun]",
    meaning: "A person who selflessly cares for and helps others; a philanthropist",
    synonyms: ["Philanthropist", "Benefactor", "Humanitarian", "Generous"],
    antonyms: ["Egoist", "Selfish", "Misanthrope"],
    trick: "All-Trust: a noble person whom everyone trusts because he helps without self-interest",
    sentences: [
      "Mother Teresa is revered across the globe as a devoted altruist.",
      "An altruist finds true fulfillment in easing the suffering of fellow human beings."
    ],
    repeatCount: "Repeated 12+ times in SSC CGL",
  },
  {
    id: "bb-3",
    word: "Ubiquitous",
    pos: "[adj.]",
    meaning: "Present, appearing, or found everywhere; omnipresent",
    synonyms: ["Omnipresent", "Pervasive", "Universal", "Everywhere"],
    antonyms: ["Rare", "Scarce", "Seldom", "Infrequent"],
    trick: "Sounds like 'You-be-with-us' everywhere; smartphones and Wi-Fi are now ubiquitous",
    sentences: [
      "Smartphones have become ubiquitous across both urban and rural India.",
      "Coffee shops and street vendors are ubiquitous on almost every city corner."
    ],
    repeatCount: "Repeated 11+ times in SSC CGL / CPO",
  },
  {
    id: "bb-4",
    word: "Fastidious",
    pos: "[adj.]",
    meaning: "Very attentive to accuracy and detail; meticulous, very hard to please",
    synonyms: ["Meticulous", "Punctilious", "Scrupulous", "Finicky"],
    antonyms: ["Careless", "Sloppy", "Easygoing", "Lenient"],
    trick: "Fast + Tedious: Demands fastidious perfection; very difficult to satisfy",
    sentences: [
      "He is fastidious about keeping his study desk clean, organized, and dust-free.",
      "The editor was fastidious regarding grammatical precision and proper citations."
    ],
    repeatCount: "Repeated 15+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-5",
    word: "Obsequious",
    pos: "[adj.]",
    meaning: "Obedient or attentive to an excessive or servile degree; flattering, sycophantic",
    synonyms: ["Sycophantic", "Servile", "Fawning", "Submissive"],
    antonyms: ["Assertive", "Domineering", "Arrogant", "Defiant"],
    trick: "Obs-equious: obsessed with flattering the authorities to gain personal favors",
    sentences: [
      "The minister was surrounded by obsequious assistants eager to praise his every word.",
      "His obsequious behavior made all of his genuine coworkers deeply uncomfortable."
    ],
    repeatCount: "Repeated 10+ times in SSC CGL",
  },
  {
    id: "bb-6",
    word: "Panacea",
    pos: "[noun]",
    meaning: "A remedy for all difficulties or diseases; a universal cure-all",
    synonyms: ["Cure-all", "Universal remedy", "Elixir", "Magic bullet"],
    antonyms: ["Poison", "Bane", "Disease", "Affliction"],
    trick: "Pan (Greek for All) + Acea (Cure) = Solution for all illnesses and problems",
    sentences: [
      "Technology is helpful, but it is not a panacea for all societal problems.",
      "There is no simple economic panacea to curb inflation overnight."
    ],
    repeatCount: "Repeated 16+ times in SSC CGL / CPO / MTS",
  },
  {
    id: "bb-7",
    word: "Incorrigible",
    pos: "[adj.]",
    meaning: "Not able to be corrected, improved, or reformed; habitual",
    synonyms: ["Irredeemable", "Unreformable", "Incurable", "Habitual"],
    antonyms: ["Reformable", "Docile", "Repentant", "Correctable"],
    trick: "In (Not) + Corrigible (Correctable) = A habit or person that cannot be reformed",
    sentences: [
      "The mischievous boy was an incorrigible prankster who ignored every warning.",
      "Despite health issues, his uncle remained an incorrigible smoker."
    ],
    repeatCount: "Repeated 13+ times in SSC exams",
  },
  {
    id: "bb-8",
    word: "Cacophony",
    pos: "[noun]",
    meaning: "A harsh, discordant mixture of loud and unpleasant sounds",
    synonyms: ["Dissonance", "Clamor", "Din", "Racket"],
    antonyms: ["Harmony", "Euphony", "Symphony", "Melody"],
    trick: "Caco (Greek for Bad/Ugly) + Phone (Sound) = Harsh and noisy sound",
    sentences: [
      "A deafening cacophony of blaring horns and construction drills echoed through the market.",
      "The peaceful morning was disrupted by a cacophony of barking street dogs."
    ],
    repeatCount: "Repeated 10+ times in SSC CGL",
  },
  {
    id: "bb-9",
    word: "Gregarious",
    pos: "[adj.]",
    meaning: "Fond of company; sociable; living in herds or flocks",
    synonyms: ["Sociable", "Companionable", "Outgoing", "Extroverted"],
    antonyms: ["Solitary", "Introverted", "Reclusive", "Misanthropic"],
    trick: "Greg- means flock or herd (congregation); one who loves mingling with people",
    sentences: [
      "Elephants and deer are gregarious animals that thrive in large herds.",
      "Her gregarious nature made her instantly popular at college gatherings."
    ],
    repeatCount: "Repeated 12+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-10",
    word: "Misanthrope",
    pos: "[noun]",
    meaning: "A person who dislikes humankind and avoids human society",
    synonyms: ["Cynic", "Recluse", "Hater of mankind"],
    antonyms: ["Philanthropist", "Humanitarian", "Altruist"],
    trick: "Mis (Hate) + Anthrope (Humanity) = One who hates society and people",
    sentences: [
      "Cheated repeatedly by partners, the elderly man became a bitter misanthrope.",
      "Ebenezer Scrooge is classic literature's most famous misanthrope."
    ],
    repeatCount: "Repeated 14+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-11",
    word: "Supercilious",
    pos: "[adj.]",
    meaning: "Behaving or looking as though one is superior to others; arrogant, haughty",
    synonyms: ["Arrogant", "Haughty", "Conceited", "Pompous"],
    antonyms: ["Humble", "Modest", "Unpretentious", "Meek"],
    trick: "Super + Cilia (eyebrows): Raising eyebrows in disdain and looking down on others",
    sentences: [
      "She gave him a supercilious glance and walked past without acknowledging his greeting.",
      "His supercilious demeanor quickly alienated his team members."
    ],
    repeatCount: "Repeated 9+ times in SSC exams",
  },
  {
    id: "bb-12",
    word: "Querulous",
    pos: "[adj.]",
    meaning: "Complaining in a whining, petulant, or irritable manner",
    synonyms: ["Whiny", "Petulant", "Grumbling", "Peevish"],
    antonyms: ["Content", "Cheerful", "Forbearing", "Patient"],
    trick: "Full of queries and petty complaints; always questioning and grumbling",
    sentences: [
      "The exhausted child became increasingly querulous as the long flight progressed.",
      "He spoke in a thin, querulous tone that irritated the entire office."
    ],
    repeatCount: "Repeated 9+ times in SSC CGL",
  },
  {
    id: "bb-13",
    word: "Reticent",
    pos: "[adj.]",
    meaning: "Not revealing one's thoughts or feelings readily; reserved, taciturn",
    synonyms: ["Reserved", "Taciturn", "Uncommunicative", "Withdrawn"],
    antonyms: ["Talkative", "Loquacious", "Voluble", "Outspoken"],
    trick: "Re-silent: maintaining silence and hesitation in expressing opinions",
    sentences: [
      "He was remarkably reticent about discussing his past work in public.",
      "The suspect remained reticent throughout the police interrogation."
    ],
    repeatCount: "Repeated 11+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-14",
    word: "Mellifluous",
    pos: "[adj.]",
    meaning: "Sweet or musical; pleasant and soothing to hear",
    synonyms: ["Melodious", "Dulcet", "Harmonious", "Sweet-sounding"],
    antonyms: ["Cacophonous", "Harsh", "Grating", "Strident"],
    trick: "Mel (honey) + Fluent (flowing): A voice flowing sweet and soothing like pure honey",
    sentences: [
      "The singer possessed a rich, mellifluous voice that spellbound the audience.",
      "The mellifluous notes of the flute brought peace to the quiet evening."
    ],
    repeatCount: "Repeated 8+ times in SSC exams",
  },
  {
    id: "bb-15",
    word: "Loquacious",
    pos: "[adj.]",
    meaning: "Tending to talk a great deal; extremely talkative",
    synonyms: ["Talkative", "Garrulous", "Voluble", "Chatty"],
    antonyms: ["Reticent", "Taciturn", "Reserved", "Silent"],
    trick: "Loqu- means speech/talk (as in eloquent, dialogue): Highly talkative person",
    sentences: [
      "The loquacious tour guide kept the tourists entertained during the long bus journey.",
      "After drinking coffee, he turned from a quiet student into a loquacious speaker."
    ],
    repeatCount: "Repeated 12+ times in SSC CGL",
  },
  {
    id: "bb-16",
    word: "Munificent",
    pos: "[adj.]",
    meaning: "Extremely generous; larger or more lavish than usual",
    synonyms: ["Generous", "Bountiful", "Magnanimous", "Lavish"],
    antonyms: ["Stingy", "Miserly", "Parsimonious", "Niggardly"],
    trick: "Money + Sufficient: Giving generous amounts of funds with an open heart",
    sentences: [
      "The university received a munificent grant from an anonymous alumnus.",
      "His munificent hospitality was celebrated by all who visited his estate."
    ],
    repeatCount: "Repeated 10+ times in SSC CGL",
  },
  {
    id: "bb-17",
    word: "Prolific",
    pos: "[adj.]",
    meaning: "Producing much fruit or many works/results; highly productive",
    synonyms: ["Productive", "Fertile", "Fruitful", "Creative"],
    antonyms: ["Unproductive", "Barren", "Sterile"],
    trick: "Pro + Life: Creating life and results in great abundance",
    sentences: [
      "Rabindranath Tagore was a prolific writer, poet, and composer.",
      "The striker enjoyed a prolific season, scoring thirty-five goals across tournaments."
    ],
    repeatCount: "Repeated 9+ times in SSC exams",
  },
  {
    id: "bb-18",
    word: "Pragmatic",
    pos: "[adj.]",
    meaning: "Dealing with problems sensibly and realistically; practical rather than idealistic",
    synonyms: ["Practical", "Realistic", "Utilitarian", "Sensible"],
    antonyms: ["Idealistic", "Impractical", "Visionary", "Unrealistic"],
    trick: "Pragmatic = Practical logic grounded in everyday reality",
    sentences: [
      "The committee adopted a pragmatic approach to balance the budget constraints.",
      "Her pragmatic advice saved the company from making a risky investment."
    ],
    repeatCount: "Repeated 11+ times in SSC CGL",
  },
  {
    id: "bb-19",
    word: "Lethargic",
    pos: "[adj.]",
    meaning: "Affected by sluggishness; abnormally tired, sluggish, and lacking energy",
    synonyms: ["Sluggish", "Torpid", "Listless", "Indolent"],
    antonyms: ["Energetic", "Active", "Dynamic", "Vigorous"],
    trick: "Late + Allergic: Too tired and sluggish to get out of bed",
    sentences: [
      "The humid summer afternoon left everyone feeling sleepy and lethargic.",
      "A deficiency of vitamin B12 often causes patients to feel weak and lethargic."
    ],
    repeatCount: "Repeated 13+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-20",
    word: "Esoteric",
    pos: "[adj.]",
    meaning: "Understood by or intended for only a specialized inner circle; obscure, arcane",
    synonyms: ["Obscure", "Arcane", "Cryptic", "Abstruse"],
    antonyms: ["Exoteric", "Common", "Familiar", "Simple"],
    trick: "Exotic/Secret knowledge meant only for specialists",
    sentences: [
      "Quantum physics contains esoteric concepts that baffle non-scientists.",
      "The ancient manuscript was filled with esoteric philosophical symbols."
    ],
    repeatCount: "Repeated 9+ times in SSC exams",
  },
  {
    id: "bb-21",
    word: "Voracious",
    pos: "[adj.]",
    meaning: "Wanting or devouring great quantities of food, information, or knowledge",
    synonyms: ["Insatiable", "Ravenous", "Rapacious", "Avid"],
    antonyms: ["Satiated", "Indifferent", "Moderate"],
    trick: "Vora- (eat/devour as in carnivore): Voracious reader eats up books",
    sentences: [
      "He was a voracious reader who devoured two full novels every weekend.",
      "After the grueling trek, the hikers possessed a voracious appetite."
    ],
    repeatCount: "Repeated 11+ times in SSC CGL",
  },
  {
    id: "bb-22",
    word: "Nefarious",
    pos: "[adj.]",
    meaning: "Wicked, villainous, or criminal in nature",
    synonyms: ["Wicked", "Evil", "Heinous", "Atrocious"],
    antonyms: ["Noble", "Righteous", "Virtuous", "Exemplary"],
    trick: "Not Fair: Evil deeds that destroy honesty and fairness",
    sentences: [
      "The intelligence agency foiled a nefarious plot to hack defense networks.",
      "The dictator became infamous for his nefarious human rights violations."
    ],
    repeatCount: "Repeated 10+ times in SSC exams",
  },
  {
    id: "bb-23",
    word: "Vindictive",
    pos: "[adj.]",
    meaning: "Having or showing a strong or unreasoning desire for revenge",
    synonyms: ["Vengeful", "Spiteful", "Retaliatory", "Resentful"],
    antonyms: ["Forgiving", "Merciful", "Magnanimous"],
    trick: "Vindicate through bitter revenge",
    sentences: [
      "He refused to help his former partner out of pure vindictive spite.",
      "A mature leader must rise above vindictive politics and focus on progress."
    ],
    repeatCount: "Repeated 9+ times in SSC exams",
  },
  {
    id: "bb-24",
    word: "Sycophant",
    pos: "[noun]",
    meaning: "A person who acts obsequiously toward someone powerful to gain advantages",
    synonyms: ["Flatterer", "Toady", "Yes-man", "Bootlicker"],
    antonyms: ["Critic", "Independent thinker"],
    trick: "Psycho fan: showering hollow praise on superiors to secure favors",
    sentences: [
      "The autocratic emperor was surrounded by sycophants who concealed the truth.",
      "He despised sycophants and welcomed honest constructive feedback."
    ],
    repeatCount: "Repeated 15+ times in SSC CGL / CHSL",
  },
  {
    id: "bb-25",
    word: "Alacrity",
    pos: "[noun]",
    meaning: "Brisk, energetic, and cheerful readiness; prompt enthusiasm",
    synonyms: ["Eagerness", "Promptness", "Keenness", "Zeal"],
    antonyms: ["Reluctance", "Sluggishness", "Apathy", "Hesitation"],
    trick: "Alert + Activity: jumping into a task with brisk cheerful speed",
    sentences: [
      "She accepted the promotion offer with immense alacrity and gratitude.",
      "The soldiers responded to the emergency call with disciplined alacrity."
    ],
    repeatCount: "Repeated 12+ times in SSC CGL",
  },
  {
    id: "bb-26",
    word: "Bellicose",
    pos: "[adj.]",
    meaning: "Demonstrating aggression and willingness to fight; warlike, belligerent",
    synonyms: ["Warlike", "Aggressive", "Combative", "Pugnacious"],
    antonyms: ["Peaceful", "Pacifist", "Conciliatory", "Harmonious"],
    trick: "Belli- (war as in rebellion): Ready to start a battle at any time",
    sentences: [
      "The bellicose rhetoric of the neighboring general heightened border tensions.",
      "Diplomacy should prevail over bellicose posturing."
    ],
    repeatCount: "Repeated 8+ times in SSC exams",
  },
  {
    id: "bb-27",
    word: "Magnanimous",
    pos: "[adj.]",
    meaning: "Very generous or forgiving, especially toward a rival or someone less powerful",
    synonyms: ["Generous", "Charitable", "Benevolent", "Noble"],
    antonyms: ["Vindictive", "Petty", "Mean-spirited", "Grudging"],
    trick: "Magna (great) + Animus (mind/soul): Great-hearted person who forgives readily",
    sentences: [
      "He was magnanimous in victory, praising his defeated opponent warmly.",
      "A magnanimous ruler pardons minor offenses to foster national unity."
    ],
    repeatCount: "Repeated 11+ times in SSC CGL",
  },
  {
    id: "bb-28",
    word: "Capricious",
    pos: "[adj.]",
    meaning: "Given to sudden and unaccountable changes of mood or behavior; fickle",
    synonyms: ["Fickle", "Volatile", "Unpredictable", "Whimsical"],
    antonyms: ["Constant", "Predictable", "Stable", "Steadfast"],
    trick: "Car-price: changing prices unpredictably like moody stock swings",
    sentences: [
      "The capricious mountain weather shifted from bright sunshine to hail in minutes.",
      "Investors grew cautious under the CEO's capricious leadership style."
    ],
    repeatCount: "Repeated 10+ times in SSC exams",
  },
  {
    id: "bb-29",
    word: "Enervate",
    pos: "[verb]",
    meaning: "To cause someone to feel drained of energy or vitality; weaken",
    synonyms: ["Weaken", "Debilitate", "Exhaust", "Fatigue"],
    antonyms: ["Energize", "Invigorate", "Strengthen", "Vitalize"],
    trick: "Enter-no-energy: completely draining the energy out of a person",
    sentences: [
      "The scorching heat of the desert enervated the stranded travelers.",
      "Prolonged illness had enervated his once powerful physique."
    ],
    repeatCount: "Repeated 9+ times in SSC CGL",
  },
  {
    id: "bb-30",
    word: "Lugubrious",
    pos: "[adj.]",
    meaning: "Looking or sounding sad, dismal, and mournful",
    synonyms: ["Mournful", "Gloomy", "Melancholy", "Doleful"],
    antonyms: ["Cheerful", "Jubilant", "Joyous", "Sanguine"],
    trick: "Lugu sounds like 'Loot gaya': weeping in gloomy despair",
    sentences: [
      "The film was filled with dark scenes and lugubrious background music.",
      "His lugubrious expression dampened the festive celebration."
    ],
    repeatCount: "Repeated 8+ times in SSC exams",
  },
  {
    id: "bb-31",
    word: "Clandestine",
    pos: "[adj.]",
    meaning: "Kept secret or done secretively, especially because illicit",
    synonyms: ["Secret", "Covert", "Surreptitious", "Stealthy"],
    antonyms: ["Open", "Overt", "Public", "Transparent"],
    trick: "Clan-destiny: secret meeting of a clan to plan covert operations",
    sentences: [
      "The rebels held clandestine meetings in abandoned farmhouses after dark.",
      "He conducted clandestine business transactions to avoid paying taxes."
    ],
    repeatCount: "Repeated 12+ times in SSC CGL",
  },
  {
    id: "bb-32",
    word: "Taciturn",
    pos: "[adj.]",
    meaning: "Reserved or uncommunicative in speech; saying very little",
    synonyms: ["Untalkative", "Reticent", "Quiet", "Reserved"],
    antonyms: ["Loquacious", "Garrulous", "Talkative", "Voluble"],
    trick: "Taxi-turn: the driver makes turns quietly without speaking a single word",
    sentences: [
      "My grandfather was a taciturn man who spoke only when strictly necessary.",
      "Her taciturn response indicated that she did not wish to elaborate further."
    ],
    repeatCount: "Repeated 11+ times in SSC CGL",
  },
];

export function BlackBookVocabZone({
  data,
  update,
  all,
  who,
}: {
  data: UserData;
  update: (fn: (d: UserData) => UserData) => void;
  all: Record<string, UserData>;
  who: string;
}) {
  const [tab, setTab] = useState<"deck" | "quiz" | "mastered" | "add">("deck");
  const [searchQuery, setSearchQuery] = useState("");

  // Per-user mastered IDs stored in localStorage
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`arena-bb-mastered-${who}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleMastered = (id: string) => {
    const next = new Set(masteredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMasteredIds(next);
    try {
      localStorage.setItem(`arena-bb-mastered-${who}`, JSON.stringify([...next]));
    } catch {}
  };

  // Pool includes system BlackBook pool + custom user-added words
  const fullPool = useMemo(() => {
    const customWords = data.vocab.map((v) => ({
      id: v.id,
      word: v.word,
      pos: "[user]",
      meaning: v.meaning,
      synonyms: [],
      antonyms: [],
      trick: v.trick || "",
      sentences: v.example ? [v.example] : [],
      repeatCount: "Personal Mock Word",
    }));
    return [...BLACKBOOK_POOL, ...customWords];
  }, [data.vocab]);

  // Unmastered words: Active deck is ALWAYS the first 10 unmastered words!
  const unmastered = useMemo(() => fullPool.filter((w) => !masteredIds.has(w.id)), [fullPool, masteredIds]);
  const active10 = useMemo(() => unmastered.slice(0, 10), [unmastered]);
  const masteredList = useMemo(() => fullPool.filter((w) => masteredIds.has(w.id)), [fullPool, masteredIds]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                BlackBook SSC Engine
              </span>
              <span className="text-xs text-muted-foreground font-semibold">User: {who}</span>
            </div>
            <p className="font-display text-base font-bold mt-1">
              Active Learning Deck · Exactly 10 Words
            </p>
            <p className="text-xs text-muted-foreground">
              These 10 words stay in your daily deck until you mark them as Mastered. Once mastered, the next BlackBook word slides in automatically.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-secondary/50 p-2.5 rounded-lg shrink-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-extrabold text-primary">{active10.length}</p>
            </div>
            <div className="h-7 w-[1px] bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Mastered</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{masteredList.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="practice-tabs flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["deck", `Active Deck (${active10.length})`],
          ["quiz", "10-Word Sprint Quiz"],
          ["mastered", `Mastered Archive (${masteredList.length})`],
          ["add", "+ Add Custom Word"],
        ] as const).map(([k, l]) => (
          <Button
            variant="unstyled"
            key={k}
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              tab === k ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {l}
          </Button>
        ))}
      </div>

      {/* 1. Active 10 Deck View */}
      {tab === "deck" && (
        <div className="space-y-3">
          {active10.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center bg-card">
              <Trophy size={40} className="mx-auto text-primary mb-2" />
              <p className="font-bold text-base">All BlackBook Words Mastered!</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have mastered all available vocabulary words. Visit the Mastered Archive to review or add custom words.
              </p>
            </div>
          ) : (
            active10.map((w, index) => {
              const isDone = masteredIds.has(w.id);
              return (
                <div key={w.id} className="rounded-xl border bg-card p-4 space-y-2.5 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-secondary text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <p className="font-display text-lg font-extrabold tracking-wide">{w.word}</p>
                      <span className="text-xs text-muted-foreground font-semibold">{w.pos}</span>
                    </div>
                    <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-2 py-0.5">
                      {w.repeatCount}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-foreground">{w.meaning}</p>

                  {/* Synonyms & Antonyms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {w.synonyms.length > 0 && (
                      <div className="rounded-md bg-secondary/40 p-2">
                        <span className="font-bold text-primary mr-1">Synonyms:</span>
                        <span className="text-muted-foreground">{w.synonyms.join(", ")}</span>
                      </div>
                    )}
                    {w.antonyms.length > 0 && (
                      <div className="rounded-md bg-secondary/40 p-2">
                        <span className="font-bold text-destructive mr-1">Antonyms:</span>
                        <span className="text-muted-foreground">{w.antonyms.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Memory Trick / Mnemonic */}
                  {w.trick && (
                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-xs">
                      <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-primary">Memory Trick: </span>
                        <span className="text-muted-foreground">{w.trick}</span>
                      </div>
                    </div>
                  )}

                  {/* Example sentences */}
                  {w.sentences.length > 0 && (
                    <div className="space-y-1 text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 py-0.5">
                      {w.sentences.map((st, i) => (
                        <p key={i} className="italic leading-relaxed">
                          "{st}"
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Mastered toggle */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant={isDone ? "outline" : "default"}
                      onClick={() => toggleMastered(w.id)}
                      className={cn("text-xs font-bold", isDone ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10" : "")}
                    >
                      <Check size={14} className="mr-1.5" />
                      {isDone ? "Mastered (Completed)" : "I Know This (Mark Mastered)"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. 10-Word Sprint Quiz */}
      {tab === "quiz" && <ActiveDeckQuiz words={active10} onMastered={toggleMastered} />}

      {/* 3. Mastered Archive View */}
      {tab === "mastered" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mastered words..."
              className="w-full rounded-lg border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          {masteredList.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
              No words marked as mastered yet. Click "I Know This" on words in the Active Deck to move them here.
            </p>
          ) : (
            masteredList
              .filter((w) => w.word.toLowerCase().includes(searchQuery.toLowerCase()) || w.meaning.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((w) => (
                <div key={w.id} className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{w.word}</p>
                      <span className="text-xs text-muted-foreground">{w.pos}</span>
                      <span className="rounded bg-emerald-500/15 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2">
                        Mastered
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{w.meaning}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleMastered(w.id)} className="text-xs shrink-0">
                    <RotateCcw size={13} className="mr-1" /> Re-learn
                  </Button>
                </div>
              ))
          )}
        </div>
      )}

      {/* 4. Add Custom Word */}
      {tab === "add" && <AddCustomWordForm update={update} onDone={() => setTab("deck")} />}
    </div>
  );
}

// Interactive Quiz on the 10 Active Words
function ActiveDeckQuiz({
  words,
  onMastered,
}: {
  words: BlackBookWord[];
  onMastered: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = words[index];

  const options = useMemo(() => {
    if (!current) return [];
    const correct = current.meaning;
    const fakes = words
      .filter((w) => w.id !== current.id)
      .map((w) => w.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [correct, ...fakes].sort(() => Math.random() - 0.5);
    return all;
  }, [current, words]);

  if (!current || finished || words.length < 2) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-4">
        <Trophy size={40} className="mx-auto text-primary" />
        <p className="font-bold text-lg">Active Deck Quiz Complete</p>
        <p className="text-3xl font-extrabold text-primary">
          {score} / {words.length}
        </p>
        <p className="text-xs text-muted-foreground">
          {score === words.length ? "Flawless score! You have mastered these 10 words." : "Keep revising your active deck to master them completely."}
        </p>
        <Button
          onClick={() => {
            setIndex(0);
            setScore(0);
            setSelectedOpt(null);
            setFinished(false);
          }}
          className="w-full"
        >
          <RotateCcw size={15} className="mr-1.5" /> Re-take Quiz
        </Button>
      </div>
    );
  }

  const handleSelect = (opt: string) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(opt);
    const isCorrect = opt === current.meaning;
    if (isCorrect) {
      setScore((s) => s + 1);
    }
    setTimeout(() => {
      setSelectedOpt(null);
      if (index < words.length - 1) setIndex((i) => i + 1);
      else setFinished(true);
    }, 900);
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span>Question {index + 1} of {words.length}</span>
        <span className="font-bold text-primary">Score: {score}</span>
      </div>

      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / words.length) * 100}%` }} />
      </div>

      <div className="p-4 rounded-lg bg-secondary/30 text-center space-y-1">
        <p className="text-xs text-muted-foreground font-semibold">Select the correct meaning of:</p>
        <p className="text-2xl font-extrabold text-foreground">{current.word}</p>
        <p className="text-xs text-muted-foreground italic">{current.pos}</p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const isChosen = selectedOpt === opt;
          const isCorrect = opt === current.meaning;
          let cls = "border bg-card hover:bg-secondary/50";
          if (selectedOpt !== null) {
            if (isCorrect) cls = "border-emerald-500 bg-emerald-500/15 text-emerald-600 font-bold dark:text-emerald-400";
            else if (isChosen) cls = "border-destructive bg-destructive/15 text-destructive font-bold";
          }
          return (
            <Button
              variant="unstyled"
              key={opt}
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(opt)}
              className={cn("w-full rounded-lg p-3 text-left text-sm font-medium transition flex items-center justify-between", cls)}
            >
              <span>{opt}</span>
              {selectedOpt !== null && isCorrect && <Check size={16} className="text-emerald-500 shrink-0" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// Add Custom Word Form
function AddCustomWordForm({
  update,
  onDone,
}: {
  update: (fn: (d: UserData) => UserData) => void;
  onDone: () => void;
}) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [trick, setTrick] = useState("");
  const [example, setExample] = useState("");

  const handleAdd = () => {
    if (!word.trim() || !meaning.trim()) return;
    update((d) => {
      d.vocab = [
        {
          id: `custom-${Date.now()}`,
          word: word.trim(),
          meaning: meaning.trim(),
          trick: trick.trim(),
          example: example.trim(),
          date: new Date().toISOString(),
        },
        ...d.vocab,
      ];
      return d;
    });
    onDone();
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="font-bold text-sm">Add Personal Mock Test Word</p>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Word (e.g. Obdurate)"
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        value={meaning}
        onChange={(e) => setMeaning(e.target.value)}
        placeholder="Meaning (e.g. Stubbornly refusing to change one's opinion)"
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={trick}
        onChange={(e) => setTrick(e.target.value)}
        placeholder="Memory aid / trick (optional)"
        rows={2}
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={example}
        onChange={(e) => setExample(e.target.value)}
        placeholder="Example sentence (optional)"
        rows={2}
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <Button onClick={handleAdd} className="w-full font-bold">
        Add Word to Learning Deck
      </Button>
    </div>
  );
}
