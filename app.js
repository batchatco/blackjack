// ============================================================
// Blackjack PWA — Las Vegas Double Deck Blackjack
// With Basic Strategy + KO (Knockout) Count Advisor
// ============================================================

// ===== CASINO CONFIGURATIONS =====

const CASINOS = {
  venetian: {
    name: 'Venetian / Palazzo',
    tables: {
      venetianMain: {
        name: 'VENETIAN MAIN FLOOR',
        decks: 2,
        minBet: 50,
        maxBet: 5000,
        dealerHitsSoft17: true,
        doubleAfterSplit: true,
        resplitAces: false,
        surrender: false,
        maxSplitHands: 4,
        blackjackPays: 1.5,
        penetration: 0.60,
        chips: [25, 50, 100, 500, 1000],
        defaultBankroll: 10000,
      },
      venetianHigh: {
        name: 'VENETIAN HIGH LIMIT',
        decks: 2,
        minBet: 200,
        maxBet: 10000,
        dealerHitsSoft17: false,
        doubleAfterSplit: true,
        resplitAces: true,
        surrender: true,
        maxSplitHands: 4,
        blackjackPays: 1.5,
        penetration: 0.60,
        chips: [100, 200, 500, 1000, 5000],
        defaultBankroll: 20000,
      },
    },
  },
  ti: {
    name: 'Treasure Island',
    tables: {
      tiMain: {
        name: 'TI MAIN FLOOR',
        decks: 2,
        minBet: 10,
        maxBet: 2000,
        dealerHitsSoft17: true,
        doubleAfterSplit: true,
        resplitAces: false,
        surrender: false,
        maxSplitHands: 4,
        blackjackPays: 1.5,
        penetration: 0.60,
        chips: [5, 10, 25, 100, 500],
        defaultBankroll: 4000,
      },
      tiHigh: {
        name: 'TI HIGH LIMIT',
        decks: 2,
        minBet: 50,
        maxBet: 5000,
        dealerHitsSoft17: false,
        doubleAfterSplit: true,
        resplitAces: false,
        surrender: false,
        maxSplitHands: 4,
        blackjackPays: 1.5,
        penetration: 0.60,
        chips: [25, 50, 100, 500, 1000],
        defaultBankroll: 10000,
      },
    },
  },
  wynn: {
    name: 'Wynn / Encore',
    tables: {
      wynnHigh: {
        name: 'WYNN HIGH LIMIT',
        decks: 2,
        minBet: 200,
        maxBet: 20000,
        dealerHitsSoft17: true,
        doubleAfterSplit: true,
        resplitAces: false,
        surrender: false,
        maxSplitHands: 4,
        blackjackPays: 1.5,
        penetration: 0.60,
        chips: [100, 200, 500, 1000, 5000],
        defaultBankroll: 40000,
      },
      encoreHigh: {
        name: 'ENCORE HIGH LIMIT',
        decks: 2,
        minBet: 100,
        maxBet: 20000,
        dealerHitsSoft17: true,
        doubleAfterSplit: true,
        resplitAces: false,
        surrender: false,
        maxSplitHands: 4,
        blackjackPays: 1.5,
        penetration: 0.60,
        chips: [50, 100, 500, 1000, 5000],
        defaultBankroll: 40000,
      },
    },
  },
};

// Flat lookup of all tables
const TABLE_CONFIGS = {};
for (const casino of Object.values(CASINOS)) {
  for (const [key, table] of Object.entries(casino.tables)) {
    TABLE_CONFIGS[key] = table;
  }
}

// ===== BASIC STRATEGY TABLES =====
// Indexed by [total][dealerUpIndex]
// Dealer up index: 2=0, 3=1, 4=2, 5=3, 6=4, 7=5, 8=6, 9=7, 10=8, A=9
//
// Action codes:
//   H = Hit, S = Stand, P = Split
//   D = Double (fall back to Hit), d = Double (fall back to Stand)
//   R = Surrender (fall back to Hit), r = Surrender (fall back to Stand)

// --- 2-deck, H17, DAS (Main Floor) ---

const HARD_H17 = {
  4:  'HHHHHHHHHH',
  5:  'HHHHHHHHHH',
  6:  'HHHHHHHHHH',
  7:  'HHHHHHHHHH',
  8:  'HHHHHHHHHH',
  9:  'HDDDDHHHHH',
  10: 'DDDDDDDDHH',
  11: 'DDDDDDDDDD',
  12: 'HHSSSHHHHH',
  13: 'SSSSSHHHHH',
  14: 'SSSSSHHHHH',
  15: 'SSSSSHHHHH',
  16: 'SSSSSHHHHH',
  17: 'SSSSSSSSSS',
  18: 'SSSSSSSSSS',
  19: 'SSSSSSSSSS',
  20: 'SSSSSSSSSS',
  21: 'SSSSSSSSSS',
};

const SOFT_H17 = {
  13: 'HHHDDHHHHH', // A,2
  14: 'HHHDDHHHHH', // A,3
  15: 'HHDDDHHHHH', // A,4
  16: 'HHDDDHHHHH', // A,5
  17: 'HDDDDHHHHH', // A,6
  18: 'dddddSSHHH', // A,7: double/stand vs 2-6, stand 7-8, hit 9-10-A
  19: 'SSSSSSSSSS', // A,8
  20: 'SSSSSSSSSS', // A,9
};

//       2,2  3,3  4,4  5,5  6,6  7,7  8,8  9,9  10s  A,A
// Pair index by card numeric value (2-11 where A=11)
const PAIR_H17 = {
  2:  'PPPPPPHHHH', // 2,2: split 2-7
  3:  'PPPPPPHHHH', // 3,3: split 2-7
  4:  'HHHPPHHHHH', // 4,4: split 5-6 (DAS)
  5:  'DDDDDDDDHH', // 5,5: treat as 10
  6:  'PPPPPHHHHH', // 6,6: split 2-6 (DAS)
  7:  'PPPPPPHHHH', // 7,7: split 2-7
  8:  'PPPPPPPPPP', // 8,8: always split
  9:  'PPPPPSPPSS', // 9,9: split 2-6,8-9; stand 7,10,A
  10: 'SSSSSSSSSS', // 10s: always stand
  11: 'PPPPPPPPPP', // A,A: always split
};

// --- 2-deck, S17, DAS, Late Surrender (High Limit) ---

const HARD_S17 = {
  4:  'HHHHHHHHHH',
  5:  'HHHHHHHHHH',
  6:  'HHHHHHHHHH',
  7:  'HHHHHHHHHH',
  8:  'HHHHHHHHHH',
  9:  'HDDDDHHHHH',
  10: 'DDDDDDDDHH',
  11: 'DDDDDDDDDD',
  12: 'HHSSSHHHHH',
  13: 'SSSSSHHHHH',
  14: 'SSSSSHHHHH',
  15: 'SSSSSHHHRH', // surrender 15 vs 10
  16: 'SSSSSHHRRR', // surrender 16 vs 9, 10, A
  17: 'SSSSSSSSSS',
  18: 'SSSSSSSSSS',
  19: 'SSSSSSSSSS',
  20: 'SSSSSSSSSS',
  21: 'SSSSSSSSSS',
};

const SOFT_S17 = {
  13: 'HHHDDHHHHH', // A,2
  14: 'HHHDDHHHHH', // A,3
  15: 'HHDDDHHHHH', // A,4
  16: 'HHDDDHHHHH', // A,5
  17: 'DDDDDHHHHH', // A,6: double 2-6 (more aggressive with S17)
  18: 'SddddSSHHS', // A,7: stand vs 2, double 3-6, stand 7-8, hit 9-10, stand A
  19: 'SSSSdSSSSS', // A,8: double vs 6 only
  20: 'SSSSSSSSSS', // A,9
};

const PAIR_S17 = {
  2:  'PPPPPPHHHH',
  3:  'PPPPPPHHHH',
  4:  'HHHPPHHHHH',
  5:  'DDDDDDDDHH',
  6:  'PPPPPHHHHH',
  7:  'PPPPPPHHHH',
  8:  'PPPPPPPPPP',
  9:  'PPPPPSPPSS',
  10: 'SSSSSSSSSS',
  11: 'PPPPPPPPPP',
};

// ===== KO (KNOCKOUT) COUNTING SYSTEM =====
// Card values: 2-7 = +1, 8-9 = 0, 10-A = -1
// IRC (Initial Running Count) for n decks = 4 - 4n
// For 2 decks: IRC = -4, Key Count (pivot) = +1

const KO_IRC_2DECK = -4;
const KO_KEY_COUNT = 1;   // Player has edge at or above this
const KO_INSURANCE_THRESHOLD = 3;

// KO playing deviations for 2-deck
// When RC >= threshold, override basic strategy with koAction
const KO_DEVIATIONS = [
  { total: 16, soft: false, dealerVal: 10, koAction: 'Stand',  threshold: 1,  desc: 'Stand 16 vs 10' },
  { total: 15, soft: false, dealerVal: 10, koAction: 'Stand',  threshold: 4,  desc: 'Stand 15 vs 10' },
  { total: 12, soft: false, dealerVal: 2,  koAction: 'Stand',  threshold: 1,  desc: 'Stand 12 vs 2' },
  { total: 12, soft: false, dealerVal: 3,  koAction: 'Stand',  threshold: -1, desc: 'Stand 12 vs 3' },
  { total: 10, soft: false, dealerVal: 10, koAction: 'Double', threshold: 5,  desc: 'Double 10 vs 10' },
  { total: 10, soft: false, dealerVal: 11, koAction: 'Double', threshold: 5,  desc: 'Double 10 vs A' },
];

// ===== SHOE =====

class Shoe {
  constructor(numDecks, penetration) {
    this.numDecks = numDecks;
    this.penetration = penetration;
    this.cards = [];
    this.totalCards = numDecks * 52;
    this.cutPosition = Math.floor(this.totalCards * penetration);
    this.shuffle();
  }

  shuffle() {
    this.cards = [];
    const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          this.cards.push({ rank, suit });
        }
      }
    }
    // Fisher-Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal() {
    return this.cards.pop();
  }

  needsShuffle() {
    return (this.totalCards - this.cards.length) >= this.cutPosition;
  }

  remaining() {
    return this.cards.length;
  }
}

// ===== HAND UTILITIES =====

function cardNumericValue(card) {
  if (card.rank === 'A') return 11;
  if (['K','Q','J'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces++;
      total += 11;
    } else {
      total += cardNumericValue(c);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards).total === 21;
}

function isBusted(cards) {
  return handValue(cards).total > 21;
}

function sameValue(a, b) {
  return cardNumericValue(a) === cardNumericValue(b);
}

function isRedSuit(suit) {
  return suit === '\u2665' || suit === '\u2666';
}

function dealerUpIndex(card) {
  if (card.rank === 'A') return 9;
  return cardNumericValue(card) - 2;
}

// ===== KO COUNT HELPERS =====

function koValue(card) {
  const r = card.rank;
  if (['2','3','4','5','6','7'].includes(r)) return 1;
  if (['8','9'].includes(r)) return 0;
  return -1; // 10, J, Q, K, A
}

function countCard(card) {
  game.runningCount += koValue(card);
}

function revealHoleCard() {
  if (!game.dealerHoleRevealed && game.dealerCards.length > 1) {
    game.dealerHoleRevealed = true;
    countCard(game.dealerCards[1]);
  }
}

// ===== BASIC STRATEGY LOOKUP =====

function getBasicStrategy(hand, dealerUpcard, config) {
  const cards = hand.cards;
  const val = handValue(cards);
  const dIdx = dealerUpIndex(dealerUpcard);
  const canDbl = cards.length === 2 && !hand.fromSplitAces &&
    (game.playerHands.length === 1 || config.doubleAfterSplit);
  const canSpl = cards.length === 2 && sameValue(cards[0], cards[1]) &&
    game.playerHands.length < config.maxSplitHands &&
    hand.bet <= game.bankroll &&
    (!hand.fromSplitAces || config.resplitAces);
  const canSurr = config.surrender && cards.length === 2 && game.playerHands.length === 1;

  let rawAction = null;
  let reason = '';

  // 1. Check pair table
  if (cards.length === 2 && sameValue(cards[0], cards[1])) {
    const pairVal = cardNumericValue(cards[0]);
    const pTable = config.dealerHitsSoft17 ? PAIR_H17 : PAIR_S17;
    const row = pTable[pairVal];
    if (row) {
      rawAction = row[dIdx];
      const pairName = cards[0].rank === 'A' ? 'A' : String(pairVal);
      reason = `pair of ${pairName}s vs ${dealerUpcard.rank}`;
      // If pair table says split but can't, fall through to hard/soft
      if (rawAction === 'P' && !canSpl) {
        rawAction = null;
        reason = '';
      }
    }
  }

  // 2. Soft hand
  if (!rawAction && val.soft && val.total >= 13 && val.total <= 20) {
    const sTable = config.dealerHitsSoft17 ? SOFT_H17 : SOFT_S17;
    const row = sTable[val.total];
    if (row) {
      rawAction = row[dIdx];
      reason = `soft ${val.total} vs ${dealerUpcard.rank}`;
    }
  }

  // 3. Hard hand
  if (!rawAction) {
    const t = Math.max(4, Math.min(val.total, 21));
    const hTable = config.dealerHitsSoft17 ? HARD_H17 : HARD_S17;
    const row = hTable[t];
    if (row) {
      rawAction = row[dIdx];
    } else {
      rawAction = t <= 11 ? 'H' : 'S';
    }
    reason = `hard ${val.total} vs ${dealerUpcard.rank}`;
  }

  // Resolve action given availability
  const resolved = resolveAction(rawAction, canDbl, canSurr);
  return { action: resolved, raw: rawAction, reason };
}

function resolveAction(code, canDouble, canSurrender) {
  switch (code) {
    case 'H': return 'Hit';
    case 'S': return 'Stand';
    case 'P': return 'Split';
    case 'D': return canDouble ? 'Double' : 'Hit';
    case 'd': return canDouble ? 'Double' : 'Stand';
    case 'R': return canSurrender ? 'Surrender' : 'Hit';
    case 'r': return canSurrender ? 'Surrender' : 'Stand';
    default:  return 'Hit';
  }
}

// ===== KO DEVIATION LOOKUP =====

function getKORecommendation(hand, dealerUpcard, bsAction) {
  const val = handValue(hand.cards);
  const dealerVal = cardNumericValue(dealerUpcard);
  const rc = game.runningCount;

  for (const dev of KO_DEVIATIONS) {
    if (dev.soft !== val.soft) continue;
    if (dev.total !== val.total) continue;
    if (dev.dealerVal !== dealerVal) continue;
    if (rc >= dev.threshold) {
      return {
        action: dev.koAction,
        threshold: dev.threshold,
        desc: dev.desc,
        deviated: dev.koAction !== bsAction,
      };
    }
    // Below threshold — no deviation, but flag that a deviation exists for this hand
    return {
      action: bsAction,
      threshold: dev.threshold,
      desc: dev.desc,
      deviated: false,
      potentialDev: true,
    };
  }
  return { action: bsAction, deviated: false };
}

function getKOInsurance() {
  const rc = game.runningCount;
  return {
    take: rc >= KO_INSURANCE_THRESHOLD,
    threshold: KO_INSURANCE_THRESHOLD,
    rc,
  };
}

// ===== GAME STATE =====

const game = {
  state: 'TABLE_SELECT',
  tableType: null,
  config: null,
  shoe: null,
  bankroll: 0,
  currentBet: 0,
  lastBet: 0,
  dealerCards: [],
  dealerHoleRevealed: false,
  playerHands: [],
  activeHandIndex: 0,
  insuranceBet: 0,
  message: '',
  messageClass: '',
  shuffleNeeded: false,
  // KO count
  runningCount: KO_IRC_2DECK,
  // Hint toggles
  showStrategy: false,
  showKO: false,
};

// ===== PERSISTENCE =====

function saveState() {
  const data = {
    bankroll: game.bankroll,
    lastBet: game.lastBet,
  };
  localStorage.setItem(`venetian-bj-${game.tableType}`, JSON.stringify(data));
}

function loadState(tableType) {
  try {
    const raw = localStorage.getItem(`venetian-bj-${tableType}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveTablePref(type) {
  localStorage.setItem('venetian-bj-table', type);
}

function loadTablePref() {
  return localStorage.getItem('venetian-bj-table');
}

// ===== TABLE SELECTION =====

function renderCasinoList() {
  const container = document.getElementById('casino-list');
  container.innerHTML = '';
  for (const casino of Object.values(CASINOS)) {
    const section = document.createElement('div');
    section.className = 'casino-section';
    const heading = document.createElement('h2');
    heading.className = 'casino-name';
    heading.textContent = casino.name;
    section.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'table-options';
    for (const [key, table] of Object.entries(casino.tables)) {
      const btn = document.createElement('button');
      btn.className = 'table-btn';
      const rules = [];
      rules.push(table.dealerHitsSoft17 ? 'Dealer hits soft 17' : 'Dealer stands on all 17s');
      rules.push('Double down on any two cards');
      rules.push('Double after split');
      rules.push(table.resplitAces ? 'Re-split aces' : 'No re-split aces');
      rules.push(table.surrender ? 'Late surrender' : 'No surrender');
      rules.push('Blackjack pays 3 to 2');
      const limitsStr = `$${table.minBet.toLocaleString()} – $${table.maxBet.toLocaleString()}`;
      // Derive a short display label from the full name
      const label = table.name.replace(/^(VENETIAN|TI|WYNN|ENCORE)\s+/, '').replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase());
      btn.innerHTML = `<h2>${label}</h2><div class="table-limits">${limitsStr}</div><ul>${rules.map(r => `<li>${r}</li>`).join('')}</ul>`;
      btn.addEventListener('click', () => selectTable(key));
      grid.appendChild(btn);
    }
    section.appendChild(grid);
    container.appendChild(section);
  }
}

function selectTable(type) {
  game.tableType = type;
  game.config = TABLE_CONFIGS[type];
  game.shoe = new Shoe(game.config.decks, game.config.penetration);
  game.runningCount = KO_IRC_2DECK;

  const saved = loadState(type);
  if (saved && saved.bankroll > 0) {
    game.bankroll = saved.bankroll;
    game.lastBet = saved.lastBet || 0;
  } else {
    game.bankroll = game.config.defaultBankroll;
    game.lastBet = 0;
  }

  // Default to last bet or table minimum
  if (game.lastBet >= game.config.minBet && game.lastBet <= game.bankroll) {
    game.currentBet = Math.min(game.lastBet, game.config.maxBet);
  } else if (game.bankroll >= game.config.minBet) {
    game.currentBet = game.config.minBet;
  } else {
    game.currentBet = 0;
  }
  game.dealerCards = [];
  game.playerHands = [];
  game.message = '';
  game.messageClass = '';
  game.showStrategy = false;
  game.showKO = false;
  game.state = 'BETTING';
  saveTablePref(type);
  saveState();
  render();
}

function changeTable() {
  game.state = 'TABLE_SELECT';
  render();
}

function resetBankroll() {
  if (game.state !== 'BETTING') return;
  if (!confirm(`Reset bankroll to $${game.config.defaultBankroll.toLocaleString()}?`)) return;
  game.bankroll = game.config.defaultBankroll;
  game.lastBet = 0;
  game.currentBet = game.config.minBet;
  saveState();
  render();
}

// ===== BETTING =====

function addBet(amount) {
  if (game.state !== 'BETTING') return;
  const newBet = game.currentBet + amount;
  if (newBet > game.config.maxBet) return;
  if (newBet > game.bankroll) return;
  game.currentBet = newBet;
  render();
}

function clearBet() {
  game.currentBet = 0;
  render();
}

function adjustBet(direction) {
  if (game.state !== 'BETTING') return;
  const chip = game.config.chips[0]; // smallest denomination
  if (direction > 0) {
    addBet(chip);
  } else {
    const newBet = game.currentBet - chip;
    game.currentBet = Math.max(0, newBet);
    render();
  }
}

// ===== DEALING =====

function startDeal() {
  if (game.state !== 'BETTING') return;
  if (game.currentBet < game.config.minBet) {
    game.message = `Minimum bet is $${game.config.minBet}`;
    game.messageClass = '';
    render();
    return;
  }
  if (game.currentBet > game.bankroll) return;

  // Shuffle if needed
  if (game.shuffleNeeded || game.shoe.needsShuffle()) {
    game.shoe.shuffle();
    game.runningCount = KO_IRC_2DECK;
    game.shuffleNeeded = false;
    showShuffleMessage();
  }

  game.lastBet = game.currentBet;
  game.bankroll -= game.currentBet;
  game.message = '';
  game.messageClass = '';
  game.dealerCards = [];
  game.dealerHoleRevealed = false;
  game.insuranceBet = 0;
  game.showStrategy = false;
  game.showKO = false;

  game.playerHands = [{
    cards: [],
    bet: game.currentBet,
    settled: false,
    result: null,
    resultText: '',
    surrendered: false,
    doubled: false,
    fromSplitAces: false,
  }];

  // Deal: player, dealer up, player, dealer hole
  const p1 = game.shoe.deal();
  game.playerHands[0].cards.push(p1);
  countCard(p1);

  const d1 = game.shoe.deal();
  game.dealerCards.push(d1);
  countCard(d1); // upcard visible

  const p2 = game.shoe.deal();
  game.playerHands[0].cards.push(p2);
  countCard(p2);

  const d2 = game.shoe.deal();
  game.dealerCards.push(d2);
  // Hole card — do NOT count yet (face down)

  game.activeHandIndex = 0;
  saveState();
  checkAfterDeal();
}

function checkAfterDeal() {
  const dealerUpcard = game.dealerCards[0];
  const playerBJ = isBlackjack(game.playerHands[0].cards);
  const dealerShowsAce = dealerUpcard.rank === 'A';
  const dealerShowsTen = cardNumericValue(dealerUpcard) === 10;

  // Dealer shows Ace → insurance/even money
  if (dealerShowsAce) {
    game.state = 'INSURANCE';
    render();
    return;
  }

  // Dealer shows 10-value → peek for blackjack
  if (dealerShowsTen) {
    if (isBlackjack(game.dealerCards)) {
      revealHoleCard();
      if (playerBJ) {
        settlePush(game.playerHands[0]);
        game.message = 'Push';
        game.messageClass = 'push';
      } else {
        settleLoser(game.playerHands[0]);
        game.message = 'Dealer has Blackjack';
        game.messageClass = 'lose';
      }
      endRound();
      return;
    }
  }

  // No dealer BJ — check player BJ
  if (playerBJ) {
    revealHoleCard();
    settleBlackjack(game.playerHands[0]);
    game.message = 'Blackjack!';
    game.messageClass = 'win';
    endRound();
    return;
  }

  game.state = 'PLAYER_TURN';
  render();
}

// ===== INSURANCE =====

function takeInsurance() {
  const insuranceAmount = Math.floor(game.playerHands[0].bet / 2);

  if (insuranceAmount > game.bankroll) {
    declineInsurance();
    return;
  }

  game.bankroll -= insuranceAmount;
  game.insuranceBet = insuranceAmount;
  resolveAfterInsurance();
}

function declineInsurance() {
  game.insuranceBet = 0;
  resolveAfterInsurance();
}

function resolveAfterInsurance() {
  const playerBJ = isBlackjack(game.playerHands[0].cards);
  const dealerBJ = isBlackjack(game.dealerCards);

  if (dealerBJ) {
    revealHoleCard();
    if (game.insuranceBet > 0) {
      game.bankroll += game.insuranceBet * 3;
    }
    if (playerBJ) {
      settlePush(game.playerHands[0]);
      game.message = game.insuranceBet > 0 ? 'Push — Insurance wins!' : 'Push';
      game.messageClass = game.insuranceBet > 0 ? 'win' : 'push';
    } else {
      settleLoser(game.playerHands[0]);
      game.message = game.insuranceBet > 0 ? 'Dealer Blackjack — Insurance wins!' : 'Dealer has Blackjack';
      game.messageClass = game.insuranceBet > 0 ? 'push' : 'lose';
    }
    endRound();
    return;
  }

  // No dealer BJ — insurance lost
  if (playerBJ) {
    revealHoleCard();
    settleBlackjack(game.playerHands[0]);
    game.message = 'Blackjack!';
    game.messageClass = 'win';
    endRound();
    return;
  }

  game.state = 'PLAYER_TURN';
  render();
}

// ===== PLAYER ACTIONS =====

function currentHand() {
  return game.playerHands[game.activeHandIndex];
}

function hideHints() {
  game.showStrategy = false;
  game.showKO = false;
}

function hit() {
  if (game.state !== 'PLAYER_TURN') return;
  hideHints();
  const hand = currentHand();
  const card = game.shoe.deal();
  hand.cards.push(card);
  countCard(card);

  if (isBusted(hand.cards)) {
    settleLoser(hand);
    hand.resultText = 'Bust';
    moveToNextHand();
  } else if (handValue(hand.cards).total === 21) {
    moveToNextHand();
  } else {
    render();
  }
}

function stand() {
  if (game.state !== 'PLAYER_TURN') return;
  hideHints();
  moveToNextHand();
}

function doubleDown() {
  if (game.state !== 'PLAYER_TURN') return;
  hideHints();
  const hand = currentHand();
  if (hand.cards.length !== 2) return;
  if (hand.bet > game.bankroll) return;

  game.bankroll -= hand.bet;
  hand.bet *= 2;
  hand.doubled = true;
  const card = game.shoe.deal();
  hand.cards.push(card);
  countCard(card);

  if (isBusted(hand.cards)) {
    settleLoser(hand);
    hand.resultText = 'Bust';
  }
  moveToNextHand();
}

function split() {
  if (game.state !== 'PLAYER_TURN') return;
  hideHints();
  const hand = currentHand();
  if (hand.cards.length !== 2) return;
  if (!sameValue(hand.cards[0], hand.cards[1])) return;
  if (game.playerHands.length >= game.config.maxSplitHands) return;
  if (hand.bet > game.bankroll) return;

  const isAces = hand.cards[0].rank === 'A';
  if (hand.fromSplitAces && !game.config.resplitAces) return;

  game.bankroll -= hand.bet;

  const secondCard = hand.cards.pop();
  const newHand = {
    cards: [secondCard],
    bet: hand.bet,
    settled: false,
    result: null,
    resultText: '',
    surrendered: false,
    doubled: false,
    fromSplitAces: isAces,
  };
  hand.fromSplitAces = isAces;

  // Deal one card to each hand (count both)
  const c1 = game.shoe.deal();
  hand.cards.push(c1);
  countCard(c1);

  const c2 = game.shoe.deal();
  newHand.cards.push(c2);
  countCard(c2);

  game.playerHands.splice(game.activeHandIndex + 1, 0, newHand);

  if (isAces) {
    if (game.config.resplitAces && hand.cards.length === 2 && sameValue(hand.cards[0], hand.cards[1])) {
      render();
      return;
    }
    advancePastSplitAces();
    return;
  }

  render();
}

function advancePastSplitAces() {
  while (game.activeHandIndex < game.playerHands.length) {
    const hand = game.playerHands[game.activeHandIndex];
    if (hand.fromSplitAces && hand.cards.length === 2) {
      if (game.config.resplitAces && sameValue(hand.cards[0], hand.cards[1]) &&
          game.playerHands.length < game.config.maxSplitHands) {
        render();
        return;
      }
      game.activeHandIndex++;
      continue;
    }
    break;
  }

  if (game.activeHandIndex >= game.playerHands.length) {
    beginDealerTurn();
  } else {
    render();
  }
}

function surrender() {
  if (game.state !== 'PLAYER_TURN') return;
  if (!game.config.surrender) return;
  hideHints();
  const hand = currentHand();
  if (hand.cards.length !== 2) return;
  if (game.playerHands.length > 1) return;

  hand.surrendered = true;
  hand.settled = true;
  hand.result = 'surrender';
  hand.resultText = 'Surrender';
  game.bankroll += Math.floor(hand.bet / 2);

  game.message = 'Surrender';
  game.messageClass = 'lose';
  endRound();
}

function moveToNextHand() {
  game.activeHandIndex++;

  while (game.activeHandIndex < game.playerHands.length) {
    const hand = game.playerHands[game.activeHandIndex];
    if (hand.settled) {
      game.activeHandIndex++;
      continue;
    }
    if (hand.fromSplitAces && hand.cards.length === 2) {
      if (game.config.resplitAces && sameValue(hand.cards[0], hand.cards[1]) &&
          game.playerHands.length < game.config.maxSplitHands) {
        render();
        return;
      }
      game.activeHandIndex++;
      continue;
    }
    break;
  }

  if (game.activeHandIndex >= game.playerHands.length) {
    beginDealerTurn();
  } else {
    render();
  }
}

// ===== DEALER TURN =====

function beginDealerTurn() {
  game.state = 'DEALER_TURN';
  revealHoleCard();

  const allBusted = game.playerHands.every(h => h.settled && h.result === 'lose');
  if (allBusted) {
    settleAll();
    return;
  }

  dealerPlay();
}

function dealerPlay() {
  const { dealerHitsSoft17 } = game.config;

  while (true) {
    const val = handValue(game.dealerCards);
    if (val.total > 21) break;
    if (val.total > 17) break;
    if (val.total === 17) {
      if (val.soft && dealerHitsSoft17) {
        const card = game.shoe.deal();
        game.dealerCards.push(card);
        countCard(card);
        continue;
      }
      break;
    }
    const card = game.shoe.deal();
    game.dealerCards.push(card);
    countCard(card);
  }

  settleAll();
}

// ===== SETTLING =====

function settleBlackjack(hand) {
  hand.settled = true;
  hand.result = 'blackjack';
  hand.resultText = 'Blackjack!';
  const winnings = hand.bet + hand.bet * game.config.blackjackPays;
  game.bankroll += winnings;
}

function settleLoser(hand) {
  hand.settled = true;
  hand.result = 'lose';
}

function settlePush(hand) {
  hand.settled = true;
  hand.result = 'push';
  hand.resultText = 'Push';
  game.bankroll += hand.bet;
}

function settleAll() {
  const dealerVal = handValue(game.dealerCards);
  const dealerBust = dealerVal.total > 21;

  for (const hand of game.playerHands) {
    if (hand.settled) continue;
    const playerVal = handValue(hand.cards);

    if (dealerBust) {
      hand.settled = true;
      hand.result = 'win';
      hand.resultText = 'Win!';
      game.bankroll += hand.bet * 2;
    } else if (playerVal.total > dealerVal.total) {
      hand.settled = true;
      hand.result = 'win';
      hand.resultText = 'Win!';
      game.bankroll += hand.bet * 2;
    } else if (playerVal.total < dealerVal.total) {
      hand.settled = true;
      hand.result = 'lose';
      hand.resultText = 'Lose';
    } else {
      settlePush(hand);
    }
  }

  // Build overall message
  const wins = game.playerHands.filter(h => h.result === 'win' || h.result === 'blackjack').length;
  const losses = game.playerHands.filter(h => h.result === 'lose').length;
  const pushes = game.playerHands.filter(h => h.result === 'push').length;

  if (game.playerHands.length === 1) {
    const h = game.playerHands[0];
    if (!h.resultText && h.result === 'lose') h.resultText = 'Lose';
    game.message = h.resultText || '';
    if (dealerBust && h.result === 'win') {
      game.message = 'Dealer busts — You win!';
    }
    game.messageClass = h.result === 'win' || h.result === 'blackjack' ? 'win' :
                         h.result === 'push' ? 'push' : 'lose';
  } else {
    if (wins > 0 && losses === 0) {
      game.message = 'All hands win!';
      game.messageClass = 'win';
    } else if (losses > 0 && wins === 0) {
      game.message = 'All hands lose';
      game.messageClass = 'lose';
    } else {
      const parts = [];
      if (wins) parts.push(`${wins} win`);
      if (losses) parts.push(`${losses} lose`);
      if (pushes) parts.push(`${pushes} push`);
      game.message = parts.join(', ');
      game.messageClass = wins > losses ? 'win' : losses > wins ? 'lose' : 'push';
    }
  }

  endRound();
}

function endRound() {
  game.state = 'ROUND_OVER';
  if (game.shoe.needsShuffle()) {
    game.shuffleNeeded = true;
  }
  saveState();
  render();
}

// ===== NEW ROUND =====

function newRound() {
  if (game.bankroll <= 0) {
    showRebuy();
    return;
  }
  // Auto-default to last bet, or table minimum
  if (game.lastBet >= game.config.minBet && game.lastBet <= game.bankroll) {
    game.currentBet = Math.min(game.lastBet, game.config.maxBet);
  } else if (game.bankroll >= game.config.minBet) {
    game.currentBet = game.config.minBet;
  } else {
    game.currentBet = 0;
  }
  game.dealerCards = [];
  game.playerHands = [];
  game.message = '';
  game.messageClass = '';
  game.dealerHoleRevealed = false;
  game.insuranceBet = 0;
  game.activeHandIndex = 0;
  game.showStrategy = false;
  game.showKO = false;
  game.state = 'BETTING';
  render();
}

function showRebuy() {
  const overlay = document.createElement('div');
  overlay.className = 'rebuy-overlay';
  overlay.innerHTML = `
    <div class="rebuy-modal">
      <h2>Out of Chips</h2>
      <p>Your bankroll has reached $0. Would you like to rebuy?</p>
      <button id="rebuy-btn">Rebuy ($${game.config.defaultBankroll.toLocaleString()})</button>
      <button id="change-table-rebuy">Change Table</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('rebuy-btn').addEventListener('click', () => {
    game.bankroll = game.config.defaultBankroll;
    game.lastBet = 0;
    saveState();
    overlay.remove();
    newRound();
  });
  document.getElementById('change-table-rebuy').addEventListener('click', () => {
    overlay.remove();
    changeTable();
  });
}

function showHelp() {
  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-modal">
      <h2>Help</h2>

      <h3>Keyboard Shortcuts</h3>
      <table>
        <tr><td colspan="2" style="color:var(--gold-dark);padding-top:4px"><em>During play</em></td></tr>
        <tr><td><kbd>H</kbd></td><td>Hit</td></tr>
        <tr><td><kbd>S</kbd></td><td>Stand</td></tr>
        <tr><td><kbd>D</kbd></td><td>Double down</td></tr>
        <tr><td><kbd>P</kbd></td><td>Split</td></tr>
        <tr><td><kbd>R</kbd></td><td>Surrender</td></tr>
        <tr><td><kbd>?</kbd></td><td>Toggle strategy + KO hints</td></tr>
        <tr><td colspan="2" style="color:var(--gold-dark);padding-top:8px"><em>During betting</em></td></tr>
        <tr><td><kbd>+</kbd></td><td>Increase bet (smallest chip)</td></tr>
        <tr><td><kbd>-</kbd></td><td>Decrease bet (smallest chip)</td></tr>
        <tr><td><kbd>Enter</kbd></td><td>Deal</td></tr>
        <tr><td colspan="2" style="color:var(--gold-dark);padding-top:8px"><em>Insurance</em></td></tr>
        <tr><td><kbd>Y</kbd></td><td>Yes (take insurance)</td></tr>
        <tr><td><kbd>N</kbd></td><td>No (decline)</td></tr>
        <tr><td colspan="2" style="color:var(--gold-dark);padding-top:8px"><em>After hand</em></td></tr>
        <tr><td><kbd>Enter</kbd></td><td>New hand</td></tr>
        <tr><td><kbd>Space</kbd></td><td>New hand</td></tr>
      </table>

      <h3>KO (Knockout) Count</h3>
      <p>
        The KO system is an <strong>unbalanced</strong> card counting method.
        You keep a single running count — no true count conversion needed.
      </p>

      <p><strong>Card values:</strong></p>
      <table class="ko-table">
        <tr><td>2, 3, 4, 5, 6, 7</td><td>+1</td></tr>
        <tr><td>8, 9</td><td>0</td></tr>
        <tr><td>10, J, Q, K, A</td><td>&minus;1</td></tr>
      </table>

      <p><strong>Starting count:</strong> For a 2-deck game, the Initial Running Count (IRC) is <strong>&minus;4</strong>. The count resets to &minus;4 every time the shoe is shuffled.</p>

      <p><strong>Key Count:</strong> The pivot point is <strong>+1</strong>. When the running count reaches +1 or higher, the remaining cards favor the player. This is when you'd increase your bets.</p>

      <div class="ko-example">
        <strong>Example:</strong> The shoe is freshly shuffled (RC = &minus;4). The first hand is dealt:
        you get 7&spades; and 3&hearts; (+1 each), the dealer shows K&diams; (&minus;1). Three cards seen:
        +1 +1 &minus;1 = net +1, so the running count is now &minus;4 + 1 = <strong>&minus;3</strong>.
      </div>

      <p><strong>Key deviations from basic strategy:</strong></p>
      <table class="ko-table">
        <tr><td>16 vs 10</td><td>Stand at RC &ge; +1</td></tr>
        <tr><td>15 vs 10</td><td>Stand at RC &ge; +4</td></tr>
        <tr><td>12 vs 2</td><td>Stand at RC &ge; +1</td></tr>
        <tr><td>12 vs 3</td><td>Stand at RC &ge; &minus;1</td></tr>
        <tr><td>10 vs 10</td><td>Double at RC &ge; +5</td></tr>
        <tr><td>10 vs A</td><td>Double at RC &ge; +5</td></tr>
        <tr><td>Insurance</td><td>Take at RC &ge; +3</td></tr>
      </table>

      <p>Use the <strong>KO Count</strong> button during play to reveal the current running count and whether to deviate from basic strategy.</p>

      <button class="close-help">Got it</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.close-help').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

function showStrategyChart() {
  const config = game.config;
  const hardTable = config.dealerHitsSoft17 ? HARD_H17 : HARD_S17;
  const softTable = config.dealerHitsSoft17 ? SOFT_H17 : SOFT_S17;
  const pairTable = config.dealerHitsSoft17 ? PAIR_H17 : PAIR_S17;
  const dealerCols = ['2','3','4','5','6','7','8','9','10','A'];

  function actionClass(ch) {
    switch (ch) {
      case 'H': return 'act-hit';
      case 'S': return 'act-stand';
      case 'D': case 'd': return 'act-double';
      case 'R': case 'r': return 'act-surrender';
      case 'P': return 'act-split';
      default: return '';
    }
  }

  function actionLabel(ch) {
    switch (ch) {
      case 'H': return 'H';
      case 'S': return 'S';
      case 'D': return 'Dh';
      case 'd': return 'Ds';
      case 'R': return 'Rh';
      case 'r': return 'Rs';
      case 'P': return 'P';
      default: return ch;
    }
  }

  function buildTable(title, table, rowLabels) {
    let html = `<h3>${title}</h3><table class="strat-table"><thead><tr><th></th>`;
    for (const d of dealerCols) html += `<th>${d}</th>`;
    html += '</tr></thead><tbody>';
    for (const { key, label } of rowLabels) {
      const row = table[key];
      if (!row) continue;
      html += `<tr><th>${label}</th>`;
      for (let i = 0; i < 10; i++) {
        const ch = row[i];
        html += `<td class="${actionClass(ch)}">${actionLabel(ch)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  const hardRows = [];
  for (let t = 5; t <= 17; t++) {
    if (hardTable[t]) hardRows.push({ key: t, label: String(t) });
  }

  const softRows = [];
  for (let t = 13; t <= 20; t++) {
    if (softTable[t]) softRows.push({ key: t, label: `A,${t - 11}` });
  }

  const pairOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const pairLabels = { 2:'2,2', 3:'3,3', 4:'4,4', 5:'5,5', 6:'6,6', 7:'7,7', 8:'8,8', 9:'9,9', 10:'T,T', 11:'A,A' };
  const pairRows = pairOrder.filter(k => pairTable[k]).map(k => ({ key: k, label: pairLabels[k] }));

  const rulesDesc = [
    `Dealer ${config.dealerHitsSoft17 ? 'hits' : 'stands on'} soft 17`,
    'Double after split',
    config.resplitAces ? 'Re-split aces' : 'No re-split aces',
    config.surrender ? 'Late surrender' : 'No surrender',
  ].join(' · ');

  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-modal strategy-chart-modal">
      <h2>Basic Strategy</h2>
      <p class="strat-rules">${rulesDesc}</p>
      ${buildTable('Hard Totals', hardTable, hardRows)}
      ${buildTable('Soft Totals', softTable, softRows)}
      ${buildTable('Pairs', pairTable, pairRows)}
      <div class="strat-legend">
        <span class="act-hit">H</span> Hit
        <span class="act-stand">S</span> Stand
        <span class="act-double">Dh</span> Double (hit)
        <span class="act-double">Ds</span> Double (stand)
        <span class="act-split">P</span> Split
        ${config.surrender ? '<span class="act-surrender">Rh</span> Surrender (hit) <span class="act-surrender">Rs</span> Surrender (stand)' : ''}
      </div>
      <button class="close-help">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.close-help').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

function showShuffleMessage() {
  const el = document.createElement('div');
  el.className = 'shuffle-msg';
  el.textContent = 'Shuffling...';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ===== RENDER =====

function render() {
  const selectScreen = document.getElementById('table-select');
  const gameScreen = document.getElementById('game-screen');

  if (game.state === 'TABLE_SELECT') {
    selectScreen.classList.add('active');
    gameScreen.classList.remove('active');
    return;
  }

  selectScreen.classList.remove('active');
  gameScreen.classList.add('active');

  // Header
  document.getElementById('table-name').textContent = game.config.name;
  document.getElementById('table-limits').textContent =
    `$${game.config.minBet.toLocaleString()} – $${game.config.maxBet.toLocaleString()}`;
  document.getElementById('bankroll').textContent = '$' + game.bankroll.toLocaleString();

  // Shoe indicator
  const shoePercent = (game.shoe.remaining() / game.shoe.totalCards) * 100;
  document.getElementById('shoe-remaining').style.width = shoePercent + '%';

  // Dealer cards
  renderDealerHand();

  // Message
  const msgEl = document.getElementById('message');
  msgEl.textContent = game.message;
  msgEl.className = 'message ' + game.messageClass;

  // Player hands
  renderPlayerHands();

  // Actions
  renderActions();

  // Hints
  renderHints();

  // Insurance
  renderInsurance();

  // Betting
  renderBetting();

  // New round button
  const newRoundBtn = document.getElementById('new-round-btn');
  if (game.state === 'ROUND_OVER') {
    newRoundBtn.classList.remove('hidden');
  } else {
    newRoundBtn.classList.add('hidden');
  }
}

function renderDealerHand() {
  const container = document.getElementById('dealer-cards');
  const scoreEl = document.getElementById('dealer-score');
  container.innerHTML = '';

  for (let i = 0; i < game.dealerCards.length; i++) {
    const card = game.dealerCards[i];
    const faceDown = (i === 1 && !game.dealerHoleRevealed);
    container.appendChild(createCardElement(card, faceDown));
  }

  if (game.dealerCards.length > 0) {
    if (game.dealerHoleRevealed) {
      const val = handValue(game.dealerCards);
      if (isBlackjack(game.dealerCards)) {
        scoreEl.textContent = 'Blackjack';
        scoreEl.className = 'score blackjack';
      } else if (val.total > 21) {
        scoreEl.textContent = 'Bust — ' + val.total;
        scoreEl.className = 'score bust';
      } else {
        scoreEl.textContent = val.total + (val.soft ? ' (soft)' : '');
        scoreEl.className = 'score';
      }
    } else {
      const upVal = cardNumericValue(game.dealerCards[0]);
      const upRank = game.dealerCards[0].rank;
      scoreEl.textContent = upRank === 'A' ? '11' : String(upVal);
      scoreEl.className = 'score';
    }
  } else {
    scoreEl.textContent = '';
    scoreEl.className = 'score';
  }
}

function renderPlayerHands() {
  const container = document.getElementById('player-hands');
  container.innerHTML = '';

  for (let i = 0; i < game.playerHands.length; i++) {
    const hand = game.playerHands[i];
    const div = document.createElement('div');
    div.className = 'player-hand';
    if (i === game.activeHandIndex && game.state === 'PLAYER_TURN') {
      div.classList.add('active-hand');
    }

    const label = document.createElement('div');
    label.className = 'hand-label';
    label.textContent = game.playerHands.length > 1 ? 'HAND ' + (i + 1) : 'PLAYER';
    div.appendChild(label);

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'cards';
    for (const card of hand.cards) {
      cardsDiv.appendChild(createCardElement(card, false));
    }
    div.appendChild(cardsDiv);

    const scoreDiv = document.createElement('div');
    const val = handValue(hand.cards);
    if (isBlackjack(hand.cards) && !hand.fromSplitAces) {
      scoreDiv.textContent = 'Blackjack';
      scoreDiv.className = 'score blackjack';
    } else if (val.total > 21) {
      scoreDiv.textContent = 'Bust — ' + val.total;
      scoreDiv.className = 'score bust';
    } else {
      scoreDiv.textContent = val.total + (val.soft ? ' (soft)' : '');
      scoreDiv.className = 'score';
    }
    div.appendChild(scoreDiv);

    const betDiv = document.createElement('div');
    betDiv.className = 'hand-bet';
    betDiv.textContent = '$' + hand.bet.toLocaleString();
    div.appendChild(betDiv);

    if (hand.settled && game.state === 'ROUND_OVER') {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'hand-result';
      resultDiv.textContent = hand.resultText || (hand.result === 'lose' ? 'Lose' : '');
      if (hand.result === 'win' || hand.result === 'blackjack') resultDiv.classList.add('win');
      else if (hand.result === 'lose' || hand.result === 'surrender') resultDiv.classList.add('lose');
      else if (hand.result === 'push') resultDiv.classList.add('push');
      div.appendChild(resultDiv);
    }

    container.appendChild(div);
  }
}

function renderActions() {
  const container = document.getElementById('actions');

  if (game.state !== 'PLAYER_TURN') {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = '';
  const hand = currentHand();

  // Hit
  const hitBtn = document.createElement('button');
  hitBtn.className = 'action-btn hit-btn';
  hitBtn.textContent = 'Hit';
  hitBtn.addEventListener('click', hit);
  container.appendChild(hitBtn);

  // Stand
  const standBtn = document.createElement('button');
  standBtn.className = 'action-btn stand-btn';
  standBtn.textContent = 'Stand';
  standBtn.addEventListener('click', stand);
  container.appendChild(standBtn);

  // Double
  const canDbl = hand.cards.length === 2 && hand.bet <= game.bankroll &&
    (!hand.fromSplitAces) &&
    (game.playerHands.length === 1 || game.config.doubleAfterSplit);
  const dblBtn = document.createElement('button');
  dblBtn.className = 'action-btn double-btn';
  dblBtn.textContent = 'Double';
  dblBtn.disabled = !canDbl;
  dblBtn.addEventListener('click', doubleDown);
  container.appendChild(dblBtn);

  // Split
  const canSpl = hand.cards.length === 2 &&
    sameValue(hand.cards[0], hand.cards[1]) &&
    game.playerHands.length < game.config.maxSplitHands &&
    hand.bet <= game.bankroll &&
    (!hand.fromSplitAces || game.config.resplitAces);
  const splBtn = document.createElement('button');
  splBtn.className = 'action-btn split-btn';
  splBtn.textContent = 'Split';
  splBtn.disabled = !canSpl;
  splBtn.addEventListener('click', split);
  container.appendChild(splBtn);

  // Surrender
  if (game.config.surrender && hand.cards.length === 2 && game.playerHands.length === 1) {
    const surBtn = document.createElement('button');
    surBtn.className = 'action-btn surrender-btn';
    surBtn.textContent = 'Surrender';
    surBtn.addEventListener('click', surrender);
    container.appendChild(surBtn);
  }
}

// ===== HINT RENDERING =====

function renderHints() {
  const container = document.getElementById('hint-area');
  container.innerHTML = '';

  // Show hint buttons during gameplay states
  const showDuring = ['PLAYER_TURN', 'INSURANCE', 'BETTING', 'ROUND_OVER'];
  if (!showDuring.includes(game.state)) return;

  // Hint toggle buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'hint-buttons';

  const bsBtn = document.createElement('button');
  bsBtn.className = 'hint-btn' + (game.showStrategy ? ' active' : '');
  bsBtn.textContent = 'Strategy';
  bsBtn.addEventListener('click', () => {
    game.showStrategy = !game.showStrategy;
    renderHints();
  });
  btnRow.appendChild(bsBtn);

  const koBtn = document.createElement('button');
  koBtn.className = 'hint-btn' + (game.showKO ? ' active' : '');
  koBtn.textContent = 'KO Count';
  koBtn.addEventListener('click', () => {
    game.showKO = !game.showKO;
    renderHints();
  });
  btnRow.appendChild(koBtn);

  container.appendChild(btnRow);

  // Hint content
  if (!game.showStrategy && !game.showKO) return;

  const content = document.createElement('div');
  content.className = 'hint-content';

  if (game.state === 'PLAYER_TURN') {
    renderPlayerTurnHints(content);
  } else if (game.state === 'INSURANCE') {
    renderInsuranceHints(content);
  } else if (game.state === 'BETTING' || game.state === 'ROUND_OVER') {
    renderBettingHints(content);
  }

  container.appendChild(content);
}

function renderPlayerTurnHints(content) {
  const hand = currentHand();
  const dealerUpcard = game.dealerCards[0];
  const bs = getBasicStrategy(hand, dealerUpcard, game.config);

  if (game.showStrategy) {
    const line = document.createElement('span');
    line.className = 'hint-line';
    line.innerHTML = `Basic Strategy: <span class="bs-action">${bs.action}</span> <span class="bs-reason">(${bs.reason})</span>`;
    content.appendChild(line);
  }

  if (game.showKO) {
    const rc = game.runningCount;
    const rcStr = rc >= 0 ? '+' + rc : String(rc);

    const rcLine = document.createElement('span');
    rcLine.className = 'hint-line';
    rcLine.innerHTML = `Running Count: <span class="ko-rc">${rcStr}</span>`;
    content.appendChild(rcLine);

    const koRec = getKORecommendation(hand, dealerUpcard, bs.action);

    const koLine = document.createElement('span');
    koLine.className = 'hint-line';
    if (koRec.deviated) {
      const tStr = koRec.threshold >= 0 ? '+' + koRec.threshold : String(koRec.threshold);
      koLine.innerHTML = `KO: <span class="ko-deviation">${koRec.action}</span> — deviate at RC \u2265 ${tStr}`;
    } else if (koRec.potentialDev) {
      const tStr = koRec.threshold >= 0 ? '+' + koRec.threshold : String(koRec.threshold);
      koLine.innerHTML = `KO: <span class="ko-action">${koRec.action}</span> — agrees (deviate at RC \u2265 ${tStr})`;
    } else {
      koLine.innerHTML = `KO: <span class="ko-action">${bs.action}</span> — agrees with basic strategy`;
    }
    content.appendChild(koLine);
  }
}

function renderInsuranceHints(content) {
  if (game.showStrategy) {
    const playerBJ = isBlackjack(game.playerHands[0].cards);
    const line = document.createElement('span');
    line.className = 'hint-line';
    if (playerBJ) {
      line.innerHTML = `Basic Strategy: <span class="bs-action">Decline even money</span>`;
    } else {
      line.innerHTML = `Basic Strategy: <span class="bs-action">Don't take insurance</span>`;
    }
    content.appendChild(line);
  }

  if (game.showKO) {
    const koIns = getKOInsurance();
    const rcStr = koIns.rc >= 0 ? '+' + koIns.rc : String(koIns.rc);

    const rcLine = document.createElement('span');
    rcLine.className = 'hint-line';
    rcLine.innerHTML = `Running Count: <span class="ko-rc">${rcStr}</span>`;
    content.appendChild(rcLine);

    const koLine = document.createElement('span');
    koLine.className = 'hint-line';
    if (koIns.take) {
      koLine.innerHTML = `KO: <span class="ko-deviation">Take insurance</span> — deviate at RC \u2265 +${koIns.threshold}`;
    } else {
      koLine.innerHTML = `KO: <span class="ko-action">Decline</span> — take at RC \u2265 +${koIns.threshold}`;
    }
    content.appendChild(koLine);
  }
}

function renderBettingHints(content) {
  // During betting/round over, only KO count info is useful
  if (game.showStrategy) {
    const line = document.createElement('span');
    line.className = 'hint-line';
    line.innerHTML = `<span class="bs-reason">Basic strategy hints appear during play</span>`;
    content.appendChild(line);
  }

  if (game.showKO) {
    const rc = game.runningCount;
    const rcStr = rc >= 0 ? '+' + rc : String(rc);

    const rcLine = document.createElement('span');
    rcLine.className = 'hint-line';
    rcLine.innerHTML = `Running Count: <span class="ko-rc">${rcStr}</span>`;
    content.appendChild(rcLine);

    const edgeLine = document.createElement('span');
    edgeLine.className = 'hint-line';
    if (rc >= KO_KEY_COUNT) {
      edgeLine.innerHTML = `<span class="ko-deviation">Player advantage</span> <span class="ko-edge">(key count: +${KO_KEY_COUNT})</span>`;
    } else {
      edgeLine.innerHTML = `<span class="ko-edge">House advantage (key count: +${KO_KEY_COUNT})</span>`;
    }
    content.appendChild(edgeLine);
  }
}

function renderInsurance() {
  const container = document.getElementById('insurance-prompt');
  if (game.state !== 'INSURANCE') {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  const label = document.getElementById('insurance-label');
  const playerBJ = isBlackjack(game.playerHands[0].cards);
  const insuranceCost = Math.floor(game.playerHands[0].bet / 2);

  if (playerBJ) {
    label.textContent = 'Even Money?';
  } else if (insuranceCost > game.bankroll) {
    label.textContent = 'Insurance? (Insufficient funds)';
    document.getElementById('insurance-yes').disabled = true;
  } else {
    label.textContent = `Insurance? ($${insuranceCost})`;
    document.getElementById('insurance-yes').disabled = false;
  }
}

function renderBetting() {
  const container = document.getElementById('betting-area');
  if (game.state !== 'BETTING') {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  document.getElementById('current-bet').textContent = '$' + game.currentBet.toLocaleString();

  const rack = document.getElementById('chip-rack');
  rack.innerHTML = '';
  for (const val of game.config.chips) {
    const chip = document.createElement('button');
    chip.className = `chip chip-${val}`;
    const canAdd = (game.currentBet + val <= game.config.maxBet) && (game.currentBet + val <= game.bankroll);
    if (!canAdd) chip.classList.add('disabled');
    chip.textContent = val >= 1000 ? (val / 1000) + 'K' : '$' + val;
    chip.addEventListener('click', () => { if (canAdd) addBet(val); });
    rack.appendChild(chip);
  }
}

function createCardElement(card, faceDown) {
  const div = document.createElement('div');
  div.className = 'card';

  if (faceDown) {
    div.classList.add('face-down');
    return div;
  }

  div.classList.add('face-up');
  div.classList.add(isRedSuit(card.suit) ? 'red' : 'black');

  const top = document.createElement('div');
  top.className = 'card-corner card-top';
  const topRank = document.createElement('span');
  topRank.className = 'card-rank';
  topRank.textContent = card.rank;
  const topSuit = document.createElement('span');
  topSuit.className = 'card-suit-small';
  topSuit.textContent = card.suit;
  top.appendChild(topRank);
  top.appendChild(topSuit);
  div.appendChild(top);

  const center = document.createElement('span');
  center.className = 'card-center';
  center.textContent = card.suit;
  div.appendChild(center);

  const bottom = document.createElement('div');
  bottom.className = 'card-corner card-bottom';
  const botRank = document.createElement('span');
  botRank.className = 'card-rank';
  botRank.textContent = card.rank;
  const botSuit = document.createElement('span');
  botSuit.className = 'card-suit-small';
  botSuit.textContent = card.suit;
  bottom.appendChild(botRank);
  bottom.appendChild(botSuit);
  div.appendChild(bottom);

  return div;
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  renderCasinoList();

  document.getElementById('change-table-btn').addEventListener('click', changeTable);
  document.getElementById('reset-bankroll-btn').addEventListener('click', resetBankroll);
  document.getElementById('help-btn').addEventListener('click', showHelp);
  document.getElementById('strategy-chart-btn').addEventListener('click', showStrategyChart);

  document.getElementById('clear-bet').addEventListener('click', clearBet);
  document.getElementById('deal-btn').addEventListener('click', startDeal);

  document.getElementById('insurance-yes').addEventListener('click', takeInsurance);
  document.getElementById('insurance-no').addEventListener('click', declineInsurance);

  document.getElementById('new-round-btn').addEventListener('click', newRound);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (game.state === 'PLAYER_TURN') {
      switch (e.key.toLowerCase()) {
        case 'h': hit(); break;
        case 's': stand(); break;
        case 'd': doubleDown(); break;
        case 'p': split(); break;
        case 'r': surrender(); break;
        case '?': game.showStrategy = !game.showStrategy; game.showKO = !game.showKO; renderHints(); break;
      }
    } else if (game.state === 'BETTING') {
      if (e.key === 'Enter') startDeal();
      if (e.key === '=' || e.key === '+') adjustBet(1);
      if (e.key === '-' || e.key === '_') adjustBet(-1);
    } else if (game.state === 'ROUND_OVER') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        newRound();
      }
    } else if (game.state === 'INSURANCE') {
      if (e.key.toLowerCase() === 'y') takeInsurance();
      if (e.key.toLowerCase() === 'n') declineInsurance();
    }
  });
}

// ===== INIT =====

function init() {
  setupEventListeners();

  const savedTable = loadTablePref();
  if (savedTable && TABLE_CONFIGS[savedTable]) {
    const saved = loadState(savedTable);
    if (saved && saved.bankroll > 0) {
      selectTable(savedTable);
      return;
    }
  }

  render();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
