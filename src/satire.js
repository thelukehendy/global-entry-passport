// All the words. Spicy-meme political-cartoon satire of bureaucracy-as-power-fantasy.
// Punching at pomp, paperwork, and self-importance — the crowd are the heroes/allies.
import { pick } from './utils.js';

export const COUNTRIES = [
  'KENYA', 'COLOMBIA', 'CANADA', 'MEXICO', 'BRAZIL', 'NIGERIA', 'INDIA',
  'JAPAN', 'GERMANY', 'FRANCE', 'IRELAND', 'POLAND', 'VIETNAM', 'PERU',
  'GHANA', 'MOROCCO', 'SWEDEN', 'GREECE', 'PORTUGAL', 'JAMAICA', 'FINLAND',
  'ICELAND', 'ARGENTINA', 'THAILAND', 'KOREA', 'ITALY', 'SPAIN', 'CHILE',
];

// Level subtitle. Rotating country + occasional bureaucratic flourish.
export function levelSubtitle(country) {
  return pick([
    `NOW DEFENDING: ${country}`,
    `INCOMING DELEGATION: ${country}`,
    `TODAY'S GUEST LIST: ${country}`,
    `PROCESSING QUEUE: ${country}`,
    `VIP LANE: ${country}`,
  ]);
}

// Trump-flavored VO captions on a successful catch (kept light + braggy).
export const VO_CATCH = [
  'TREMENDOUS!',
  'A perfect passport. Perfect!',
  'They love me, believe me.',
  'Best throw. Everybody says so.',
  'Welcome aboard, folks!',
  'HUGE arm. HUGE.',
  'Nobody stamps like me.',
  'Global Entry, baby!',
];

// VO on a breach (border crossing without a passport). Synced with the vibe
// of the classic clips ("bye bye", "you're fired").
export const VO_BREACH = [
  "YOU'RE FIRED!",
  'BYE BYE!',
  'Get him OUTTA here!',
  'Total disaster. Sad!',
  'Not on my watch, folks.',
  'Where was the paperwork?!',
  'A very low-energy breach.',
  'We needed a wall right there.',
];

// VO when the eagle is caught.
export const VO_EAGLE = [
  'FREEDOM!!',
  'The eagle has landed, folks!',
  'Passports for EVERYBODY!',
  'This is what winning looks like.',
  'Beautiful bird. The best bird.',
];

// VO when a golden passport is caught.
export const VO_GOLDEN = [
  'GOLD! Solid gold!',
  'Double points — I invented that.',
  'Luxury Global Entry, folks.',
];

// Fake CNN-style breaking-news ticker lines. Spicy meme satire —
// punch Trumpisms / bureaucracy / ticker parody, not the crowd.
export const TICKER = [
  // originals
  'PRESIDENT DECLARES BORDER LINE "THE MOST BEAUTIFUL LINE EVER DRAWN"',
  'ALLIES REPORT RECORD SEATING SATISFACTION AT PRESIDENTIAL PODIUM',
  'SOURCES: FREEDOM EAGLE "DOING NUMBERS," DEMANDS BIGGER PERCH',
  'PASSPORT SUPPLY AT ALL-TIME HIGH; PAPER LOBBY THRILLED',
  'STUDY FINDS 100% OF STAMPED GUESTS "VERY, VERY HAPPY"',
  'PODIUM APPROVAL RATING HITS "THE BIGLIEST" NUMBER ON RECORD',
  'BREAKING: MAN THROWS LAMINATED CARDS AT PEOPLE, CALLS IT POLICY',
  'ECONOMISTS BAFFLED AS "RALLY THE ALLIES" BECOMES ENTIRE ECONOMY',
  'EAGLE SIGHTED OVER PLAZA; SEAGULLS "DEEPLY JEALOUS"',
  'PRESS CORPS ASKS ABOUT BREACHES; PODIUM ASKS ABOUT RATINGS',
  // classic Trumpisms / meme paraphrases
  'BREAKING: PASSPORTS DECLARED "TREMENDOUS, THE BEST BOOKS, MAYBE EVER"',
  'TRUMP: "WE\'RE GIVING OUT GLOBAL ENTRY LIKE CANDY — BEAUTIFUL CANDY"',
  'SOURCES SAY FREEDOM EAGLE DEMANDS MORE RATINGS',
  'PODIUM: "NOBODY KNOWS MORE ABOUT STAMPS THAN ME, BELIEVE ME"',
  'COVERAGE ALERT: COVFEFE NOW OFFICIAL CUSTOMS CLEARANCE CODE',
  'TRUMP CALLS HIMSELF "A VERY STABLE GENIUS" AFTER CATCHING ONE PASSPORT',
  'YOU\'RE FIRED — SAID TO A BREACH, A SEAGULL, AND THE CONCEPT OF WAITING',
  'FAKE NEWS CLAIMS QUEUE EXISTS; PODIUM SAYS "TREMENDOUS FLOW"',
  'MAKE GLOBAL ENTRY GREAT AGAIN — HATS SOLD IN GIFT SHOP',
  'BIGLY APPROVED: LANE TWO DECLARED "THE MOST BIGLY LANE"',
  'TREMENDOUS CROWD ENERGY REPORTED; ACTUAL CROWD JUST WANTS STAMPS',
  'CHINA DIDN\'T INVENT PASSPORTS — "BUT WE HAVE THE BEST ONES," SAYS PODIUM',
  'THE WALL WILL HAVE A VIP DOOR, A GOLD DOOR, AND A RATINGS DOOR',
  'RATINGS THROUGH THE ROOF — LITERALLY; EAGLE NESTING ON ANTENNA',
  'TRUMP: "I HAVE THE BEST WORDS" — THEN YELLS "PASSPORT!!!"',
  'MANY PEOPLE ARE SAYING THIS IS THE GREATEST BORDER SEGMENT EVER',
  'SAD!: PAPERWORK TRIED TO ENTER WITHOUT AN APPOINTMENT',
  'LOW ENERGY CUSTOMS AGENT REPLACED BY HIGH ENERGY HAND GESTURES',
  'WITCH HUNT BEGINS AFTER SOMEONE ASKS FOR A RECEIPT',
  'FAKE NEWS: BREACH COUNTER IS FAKE. ALSO REAL. ALSO FAKE.',
  // Global Entry / passport / border game jokes
  'TSA PRECHECK JEALOUS OF GLOBAL ENTRY\'S "MAIN CHARACTER ENERGY"',
  'CBP APP CRASHES; PODIUM SWITCHES TO THROWING LAMINATED CARDS',
  'BIOMETRIC KIOSK REPLACED BY "LOOK AT ME — I KNOW YOU\'RE GOOD"',
  'GOLDEN PASSPORT CONFIRMED REAL; ECONOMISTS FILE FOR EMOTIONAL DAMAGES',
  'QUEUE SCIENCE: EVERYONE IS NEXT IF YOU THROW HARD ENOUGH',
  'BORDER LINE MOVES TWO FEET; PODIUM CALLS IT "HISTORIC REALIGNMENT"',
  'FREEDOM EAGLE ENDORSES CATCH MECHANIC; DEMANDS HAZARD PAY',
  'PASSPORT ARC PHYSICS CALLED "THE BEST SCIENCE, VERY FAIR SCIENCE"',
  'GLOBAL ENTRY RENEWAL FEE NOW PAYABLE IN COMBO MULTIPLIERS',
  'ALLIES SEATED SUCCESSFULLY; PODIUM CLAIMS CREDIT FOR CHAIRS',
  'BREACH METER HITS YELLOW; PODIUM CALLS IT "A BEAUTIFUL COLOR"',
  'CUSTOMS FORM 6059B REPLACED BY "JUST CATCH THE THING"',
  'VIP LANE OPENS; EVERYONE IMMEDIATELY BECOMES A VIP IN THEIR HEART',
  'IMMIGRATION LAWYERS WATCH GAMEPLAY, QUIETLY TAKE NOTES',
  'PASSPORT PHOTO RULES: LOOK TREMENDOUS OR RETAKE, FOLKS',
  // punchy fake headlines
  'BREAKING: PODIUM APPROVAL HITS NUMBERS THAT DON\'T EXIST IN MATH',
  'EXCLUSIVE: MAN BEHIND CURTAIN IS ALSO MAN THROWING PASSPORTS',
  'LIVE: PRESS ASKS ABOUT POLICY; GETS THREE MINUTES ON EAGLE',
  'DEVELOPING: "YOU\'RE FIRED" NOW VALID EXIT STAMP',
  'JUST IN: TREMENDOUS DEAL STRUCK WITH LAMINATE INDUSTRY',
  'ALERT: SOMEONE SAID "DUE PROCESS" AND THE TICKER GLITCHED',
  'UPDATE: WALL PROPOSAL INCLUDES SLIDING GLASS FOR RATINGS CAMERAS',
  'RUMOR: NEXT LEVEL SPONSORED BY THE CONCEPT OF PAPERWORK',
  'FLASH: STABLE GENIUS MODE UNLOCKED AFTER X4 COMBO',
  'REPORT: NOBODY BUILDS A BETTER BREAKING-NEWS BANNER THAN THIS ONE',
  'SCANDAL: TICKER CAUGHT READING ITS OWN HEADLINES FOR RATINGS',
  'OVERNIGHT POLL: 100% OF STAMPED ALLIES WOULD STAMP AGAIN',
  'EMERGENCY BRIEFING: THE PASSPORTS ARE FINE. THE VIBES ARE FINE.',
  'WORLD REACTS: "THIS IS FINE," SAYS EVERY CUSTOMS WINDOW',
  'FINAL WORD FROM PODIUM: "IT\'S GONNA BE HUGE." IT WAS A PASSPORT.',
];

// Avoid immediate repeats when the banner flashes often.
const _recentTicker = [];
const TICKER_RECENT_CAP = 8;

export function pickTicker() {
  if (TICKER.length <= 1) return TICKER[0] || '';
  let line;
  let guard = 0;
  do {
    line = pick(TICKER);
    guard += 1;
  } while (_recentTicker.includes(line) && guard < 24);
  _recentTicker.push(line);
  if (_recentTicker.length > TICKER_RECENT_CAP) _recentTicker.shift();
  return line;
}

// Rare VIP special walker call-outs.
export const VIP_LINES = [
  'VIP INCOMING — roll out the gold lane!',
  'A very important person, folks. Very important.',
  'Somebody big just showed up. Big league.',
];

// Level complete headline variants.
export function levelCompleteSub(stats) {
  const opts = [
    'Allies rallied — advancing to next border...',
    'The podium is PLEASED. Onward!',
    'Ratings through the roof. Next!',
    'Another beautiful, beautiful border. Next!',
  ];
  if (stats && stats.breaches === 0) {
    return pick([
      'FLAWLESS. Zero breaches. Framed and hung in the lobby.',
      'Not a single freeloader. Perfection, folks.',
    ]);
  }
  return pick(opts);
}

// Game-over title + roast, scaled by performance.
export function gameOverCopy({ level, allies, score, best, isRecord }) {
  const titles = ['BORDER BREACHED', 'PODIUM OVERRUN', 'GAME OVER, FOLKS', 'THE WALL FELL'];
  let roast;
  if (isRecord) {
    roast = pick([
      'A record! The biggest, most beautiful record. Nobody does breaches like you — wait, that came out wrong.',
      'NEW RECORD. Frame it. Put it on a hat. Sell the hat.',
    ]);
  } else if (allies >= 20) {
    roast = pick([
      `You rallied ${allies} allies. Honestly? Presidential.`,
      'Tremendous crowd. The podium salutes you.',
    ]);
  } else if (level <= 1) {
    roast = pick([
      'Low energy. SAD! Even the eagle left early.',
      'That was a very short press conference.',
      'Folks, we have GOT to work on that arm.',
    ]);
  } else {
    roast = pick([
      'Not bad. Not great. Very... adequate.',
      'The base is disappointed but still clapping.',
      'You peaked, then the paperwork peaked harder.',
    ]);
  }
  return { title: pick(titles), roast };
}

export const START_TAGLINES = [
  "Fling Global Entry passports. Rally allies. Keep the freeloaders out. It's gonna be HUGE.",
  'Stamp fast. Rally big. Catch the eagle. Ratings are everything.',
  'A bureaucracy power fantasy in 90 loud seconds. Believe me.',
];

// Challenge / goal definitions surfaced per level.
export function challengeForLevel(n) {
  const pool = [
    { id: 'noBreach', label: 'CHALLENGE', text: '0 breaches this level' },
    { id: 'rally', label: 'CHALLENGE', text: `Rally ${5 + n} allies` },
    { id: 'combo', label: 'CHALLENGE', text: 'Hit a x4 combo' },
    { id: 'eagle', label: 'CHALLENGE', text: 'Catch the Freedom Eagle' },
    { id: 'golden', label: 'CHALLENGE', text: 'Snag a golden passport' },
  ];
  return pool[n % pool.length];
}
