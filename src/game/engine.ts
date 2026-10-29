import { CHARACTERS, DEFAULT_DECK_COUNTS, PIRATE_AVATARS } from './cards';
import {
  CardInstance,
  CardValue,
  GameLogEntry,
  GameSettings,
  GameState,
  PlayCardAction,
  PlayerConfig,
  PlayerState,
  ResolveMerchantAction,
} from './types';

export function createDefaultSettings(overrides?: Partial<GameSettings>): GameSettings {
  return {
    mode: 'ai',
    playerCount: 4,
    targetCoins: 4,
    maxRounds: 10,
    roundVictoryReward: 2,
    tieRule: 'split',
    pickpocketRule: 'next_turn',
    allowCannonSelfTarget: true,
    deckCounts: { ...DEFAULT_DECK_COUNTS },
    language: 'bn',
    soundEnabled: true,
    musicEnabled: false,
    reducedMotion: false,
    ...overrides,
  };
}

export function createDefaultPlayers(count: number, mode: 'ai' | 'local' | 'online'): PlayerConfig[] {
  const configs: PlayerConfig[] = [];
  const bnNames = ['ক্যাপ্টেন রফিক', 'জলদস্যু রুস্তম', 'নাবিক সুলতানা', 'গোলন্দাজ করিম', 'গুপ্তচর নাদিয়া', 'বণিক হাশেম'];
  for (let i = 0; i < count; i++) {
    const avatar = PIRATE_AVATARS[i % PIRATE_AVATARS.length].emoji;
    const isAI = mode === 'ai' ? i > 0 : false;
    configs.push({
      id: `player_${i + 1}`,
      name: i === 0 && mode === 'ai' ? 'আপনি (You)' : bnNames[i % bnNames.length],
      avatar,
      isAI,
      aiDifficulty: i === 1 ? 'medium' : i === 2 ? 'hard' : 'easy',
    });
  }
  return configs;
}

/**
 * Generates the deck of cards based on configured card counts.
 * Default deck has 21 cards (2x 0, 6x 1, 2x 2..6, 1x 7..9).
 */
export function buildDeck(counts: Record<CardValue, number> = DEFAULT_DECK_COUNTS): CardInstance[] {
  const deck: CardInstance[] = [];
  let seq = 1;
  (Object.keys(counts) as unknown as CardValue[]).forEach((rawKey) => {
    const value = Number(rawKey) as CardValue;
    const qty = Math.max(0, counts[value] ?? 0);
    for (let i = 0; i < qty; i++) {
      deck.push({
        uid: `card_${value}_${seq++}`,
        value,
      });
    }
  });
  return deck;
}

/**
 * Fisher-Yates shuffle with injectable RNG for deterministic unit testing.
 */
export function shuffleDeck<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Checks whether a hand triggers the mandatory Captain (8) rule:
 * If a player holds Captain (8) together with either Cannon Operator (5) or Sailor (7),
 * they MUST play the Captain (8).
 */
export function mustPlayCaptain(hand: CardInstance[]): boolean {
  const values = hand.map((c) => c.value);
  const hasCaptain = values.includes(8);
  const hasRestrictedPartner = values.includes(5) || values.includes(7);
  return hasCaptain && hasRestrictedPartner;
}

/**
 * Returns the UIDs of cards in the player's hand that are legal to play.
 */
export function getPlayableCardUids(hand: CardInstance[]): string[] {
  if (mustPlayCaptain(hand)) {
    return hand.filter((c) => c.value === 8).map((c) => c.uid);
  }
  return hand.map((c) => c.uid);
}

/**
 * Returns valid target player IDs for a given card value played by `actorId`.
 */
export function getValidTargetIds(
  state: GameState,
  actorId: string,
  cardValue: CardValue
): string[] {
  const def = CHARACTERS[cardValue];
  if (!def.requiresTarget) return [];

  const livingUnprotectedOpponents = state.players.filter(
    (p) => !p.isEliminated && !p.isProtected && p.id !== actorId
  );

  if (cardValue === 5) {
    // Cannon Operator: normally targets opponents, or can also target self if enabled or no opponents unprotected
    const ids = livingUnprotectedOpponents.map((p) => p.id);
    if (state.settings.allowCannonSelfTarget || ids.length === 0) {
      const self = state.players.find((p) => p.id === actorId && !p.isEliminated);
      if (self && !ids.includes(self.id)) {
        ids.push(self.id);
      }
    }
    return ids;
  }

  return livingUnprotectedOpponents.map((p) => p.id);
}

function addLog(
  state: GameState,
  entry: Omit<GameLogEntry, 'id' | 'round' | 'turn' | 'timestamp'>
): void {
  state.logs.push({
    id: `log_${state.round}_${state.turnNumber}_${state.logs.length + 1}`,
    round: state.round,
    turn: state.turnNumber,
    timestamp: Date.now(),
    ...entry,
  });
}

function eliminatePlayer(
  state: GameState,
  player: PlayerState,
  reasonBn: string,
  reasonEn: string
): void {
  if (player.isEliminated) return;
  player.isEliminated = true;
  player.isProtected = false;
  player.eliminationReasonBn = reasonBn;
  player.eliminationReasonEn = reasonEn;

  // If the eliminated player had a pending Pickpocket theft, it fails immediately
  if (player.pendingPickpocket) {
    player.pendingPickpocket = false;
    if (state.pendingPickpocketPlayerId === player.id) {
      state.pendingPickpocketPlayerId = null;
    }
    addLog(state, {
      actorId: player.id,
      type: 'pickpocket_cancel',
      textBn: `${player.name} বাদ পড়ায় তার ছিচকে চোরের কয়েন চুরির চেষ্টা ব্যর্থ হয়েছে!`,
      textEn: `${player.name} was eliminated, causing their pending Pickpocket theft to fail!`,
    });
  }

  // Reveal and discard any remaining cards in hand so everyone can track public discards
  while (player.hand.length > 0) {
    const remaining = player.hand.shift()!;
    player.discards.push(remaining);
    state.publicDiscardPile.push({
      card: remaining,
      playerId: player.id,
      turn: state.turnNumber,
    });
  }

  addLog(state, {
    actorId: player.id,
    type: 'elimination',
    textBn: `💀 ${player.name} রাউন্ড থেকে বাদ পড়েছেন (${reasonBn})।`,
    textEn: `💀 ${player.name} was eliminated from the round (${reasonEn}).`,
  });
}

/**
 * Starts a brand new game match.
 */
export function createInitialGameState(
  playerConfigs: PlayerConfig[],
  settings: GameSettings,
  rng: () => number = Math.random
): GameState {
  const players: PlayerState[] = playerConfigs.map((cfg) => ({
    id: cfg.id,
    name: cfg.name,
    avatar: cfg.avatar,
    isAI: cfg.isAI,
    aiDifficulty: cfg.aiDifficulty,
    hand: [],
    discards: [],
    isEliminated: false,
    isProtected: false,
    pendingPickpocket: false,
    coins: 0,
    roundCoinsEarned: 0,
    aiKnownCards: {},
  }));

  const state: GameState = {
    matchId: `match_${Math.floor(rng() * 1_000_000)}`,
    settings,
    round: 1,
    turnNumber: 1,
    phase: 'choosing_action',
    players,
    activePlayerIndex: 0,
    deck: [],
    removedCard: null,
    publicDiscardPile: [],
    pendingPickpocketPlayerId: null,
    pendingMerchant: null,
    activeReveal: null,
    roundHistory: [],
    roundScored: false,
    winnerIds: [],
    logs: [],
  };

  return setupRound(state, 0, rng);
}

/**
 * Sets up a round: builds & shuffles deck, removes 1 secret card face-down,
 * deals 1 card to each player, and starts the first player's turn (drawing their 2nd card).
 */
export function setupRound(
  prevState: GameState,
  startingPlayerIndex: number = 0,
  rng: () => number = Math.random
): GameState {
  const state: GameState = structuredClone(prevState);
  const rawDeck = buildDeck(state.settings.deckCounts);
  const shuffled = shuffleDeck(rawDeck, rng);

  // Secretly remove one random card face down for the entire round
  const removedCard = shuffled.shift() ?? null;

  state.deck = shuffled;
  state.removedCard = removedCard;
  state.publicDiscardPile = [];
  state.pendingPickpocketPlayerId = null;
  state.pendingMerchant = null;
  state.activeReveal = null;
  state.lastAnimationEvent = undefined;
  state.roundScored = false;
  state.turnNumber = 1;
  state.activePlayerIndex = startingPlayerIndex % state.players.length;

  for (const p of state.players) {
    p.hand = [];
    p.discards = [];
    p.isEliminated = false;
    p.eliminationReasonBn = undefined;
    p.eliminationReasonEn = undefined;
    p.isProtected = false;
    p.pendingPickpocket = false;
    p.roundCoinsEarned = 0;
    p.aiKnownCards = {};
  }

  // Deal 1 secret card to each player
  for (const p of state.players) {
    const card = state.deck.shift();
    if (card) {
      p.hand.push(card);
    }
  }

  addLog(state, {
    type: 'round_start',
    textBn: `⚓ রাউন্ড ${state.round} শুরু হয়েছে! ১টি গোপন কার্ড ডেক থেকে সরিয়ে রাখা হয়েছে এবং সবাইকে ১টি করে কার্ড দেওয়া হয়েছে।`,
    textEn: `⚓ Round ${state.round} started! 1 secret card was set aside face-down and each player was dealt 1 card.`,
  });

  // Active player draws their turn card
  beginTurnForActivePlayer(state);
  return state;
}

/**
 * Begins the turn for `state.activePlayerIndex`:
 * - Expires Spy protection on this player
 * - Resolves pending Pickpocket theft if `pickpocketRule === 'next_turn'`
 * - Draws 1 card from the deck if available
 */
export function beginTurnForActivePlayer(state: GameState): void {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.isEliminated) return;

  // Expire Spy (4) protection when the player's next turn begins
  if (activePlayer.isProtected) {
    activePlayer.isProtected = false;
    addLog(state, {
      actorId: activePlayer.id,
      type: 'ability_effect',
      textBn: `🛡️ ${activePlayer.name}-এর গুপ্তচর (৪) সুরক্ষার মেয়াদ শেষ হয়েছে।`,
      textEn: `🛡️ ${activePlayer.name}'s Spy (4) protection has expired.`,
    });
  }

  // Resolve pending Pickpocket (0) after surviving a full round of turns
  if (
    activePlayer.pendingPickpocket &&
    state.pendingPickpocketPlayerId === activePlayer.id &&
    state.settings.pickpocketRule === 'next_turn'
  ) {
    activePlayer.pendingPickpocket = false;
    state.pendingPickpocketPlayerId = null;
    activePlayer.coins += 1;
    activePlayer.roundCoinsEarned += 1;
    state.lastAnimationEvent = {
      id: `anim_coin_${state.turnNumber}`,
      type: 'coin',
      actorId: activePlayer.id,
      cardValue: 0,
      success: true,
    };
    addLog(state, {
      actorId: activePlayer.id,
      cardValue: 0,
      type: 'pickpocket_steal',
      textBn: `🪙 ${activePlayer.name} পুরো এক রাউন্ড টিকে থেকে ছিচকে চোরের ক্ষমতায় ১টি কয়েন চুরি করতে সফল হয়েছেন!`,
      textEn: `🪙 ${activePlayer.name} survived a full round of turns and successfully stole 1 coin with Pickpocket (0)!`,
    });

    // Check if this stolen coin immediately reaches the game victory target!
    if (activePlayer.coins >= state.settings.targetCoins) {
      finalizeOverallGameWinner(state);
      return;
    }
  }

  // Draw 1 card from deck if available
  if (state.deck.length > 0) {
    const drawn = state.deck.shift()!;
    activePlayer.hand.push(drawn);
    addLog(state, {
      actorId: activePlayer.id,
      type: 'draw',
      textBn: `${activePlayer.name} ডেক থেকে ১টি কার্ড তুলেছেন।`,
      textEn: `${activePlayer.name} drew 1 card from the deck.`,
    });
  }

  if (state.settings.mode === 'local' && !activePlayer.isAI) {
    state.phase = 'waiting_for_privacy';
  } else {
    state.phase = 'choosing_action';
  }
}

/**
 * Unlocks the local pass-and-play privacy screen for the active human player.
 */
export function unlockPrivacyScreen(prevState: GameState): GameState {
  if (prevState.phase !== 'waiting_for_privacy') return prevState;
  const state = structuredClone(prevState);
  state.phase = 'choosing_action';
  return state;
}

/**
 * Validates and executes playing a card from the active player's hand.
 */
export function playCard(prevState: GameState, action: PlayCardAction): GameState {
  const state: GameState = structuredClone(prevState);
  if (state.phase !== 'choosing_action') {
    throw new Error(`Cannot play a card during phase '${state.phase}'.`);
  }

  const actor = state.players[state.activePlayerIndex];
  if (!actor || actor.id !== action.playerId) {
    throw new Error('It is not this player’s turn.');
  }
  if (actor.isEliminated) {
    throw new Error('Eliminated players cannot take turns.');
  }

  const cardIndex = actor.hand.findIndex((c) => c.uid === action.cardUid);
  if (cardIndex === -1) {
    throw new Error('Selected card is not in player’s hand.');
  }

  const playableUids = getPlayableCardUids(actor.hand);
  if (!playableUids.includes(action.cardUid)) {
    throw new Error(
      'Mandatory rule violation: When holding Captain (8) with Cannon Operator (5) or Sailor (7), you must play the Captain (8).'
    );
  }

  const playedCard = actor.hand[cardIndex];
  const validTargets = getValidTargetIds(state, actor.id, playedCard.value);

  if (validTargets.length > 0 && !action.targetPlayerId) {
    throw new Error(`Character ${playedCard.value} requires selecting a valid target player.`);
  }
  if (action.targetPlayerId && validTargets.length > 0 && !validTargets.includes(action.targetPlayerId)) {
    throw new Error('Selected target player is not a legal target (eliminated or protected by Spy).');
  }
  if (playedCard.value === 1 && validTargets.length > 0) {
    if (action.guessedValue === undefined || action.guessedValue === null) {
      throw new Error('Guard (1) requires guessing a character value.');
    }
    if (action.guessedValue === 1) {
      throw new Error('Guard (1) cannot guess that the target holds another Guard (1).');
    }
  }

  // Remove the played card from hand and place it face up in discard area
  actor.hand.splice(cardIndex, 1);
  actor.discards.push(playedCard);
  state.publicDiscardPile.push({
    card: playedCard,
    playerId: actor.id,
    turn: state.turnNumber,
  });

  // Clear any outdated AI knowledge about actor's card if they played it
  for (const p of state.players) {
    if (p.aiKnownCards && p.aiKnownCards[actor.id] === playedCard.value) {
      delete p.aiKnownCards[actor.id];
    }
  }

  const charDef = CHARACTERS[playedCard.value];
  addLog(state, {
    actorId: actor.id,
    targetId: action.targetPlayerId,
    cardValue: playedCard.value,
    type: 'play_card',
    textBn: `🃏 ${actor.name} খেলেছেন: ${charDef.nameBn} (${charDef.bengaliNumber})।`,
    textEn: `🃏 ${actor.name} played ${charDef.nameEn} (${playedCard.value}).`,
  });

  const target = action.targetPlayerId
    ? state.players.find((p) => p.id === action.targetPlayerId)
    : undefined;

  // Dispatch to the specific character ability handler
  switch (playedCard.value) {
    case 0:
      handlePickpocket(state, actor);
      break;
    case 1:
      handleGuard(state, actor, target, action.guessedValue);
      break;
    case 2:
      handleShipWorker(state, actor, target);
      break;
    case 3:
      handleSwordsman(state, actor, target);
      break;
    case 4:
      handleSpy(state, actor);
      break;
    case 5:
      handleCannonOperator(state, actor, target);
      break;
    case 6:
      handleMerchant(state, actor);
      break;
    case 7:
      handleSailor(state, actor, target);
      break;
    case 8:
      handleCaptain(state, actor);
      break;
    case 9:
      handlePirate(state, actor);
      break;
  }

  // If Merchant (6) paused the turn to let the player choose 1 of up to 3 cards, wait for resolveMerchantChoice
  if (state.phase === 'merchant_selection') {
    return state;
  }

  // If a private reveal modal (Ship Worker or Swordsman duel for a human player) is active in local/AI mode,
  // we still check if the round ended or let the player acknowledge the reveal.
  if (state.phase === 'private_reveal') {
    return state;
  }

  completeTurnAndAdvance(state);
  return state;
}

/**
 * Value 0 — ছিচকে চোর (Pickpocket)
 */
function handlePickpocket(state: GameState, actor: PlayerState): void {
  // Cancel any earlier pending Pickpocket theft from another player
  if (state.pendingPickpocketPlayerId && state.pendingPickpocketPlayerId !== actor.id) {
    const prevPlayer = state.players.find((p) => p.id === state.pendingPickpocketPlayerId);
    if (prevPlayer && prevPlayer.pendingPickpocket) {
      prevPlayer.pendingPickpocket = false;
      addLog(state, {
        actorId: actor.id,
        targetId: prevPlayer.id,
        cardValue: 0,
        type: 'pickpocket_cancel',
        textBn: `⚠️ ${actor.name} নতুন ছিচকে চোর খেলায় ${prevPlayer.name}-এর আগের কয়েন চুরির চেষ্টা বাতিল হয়ে গেছে!`,
        textEn: `⚠️ ${actor.name} played Pickpocket (0), cancelling ${prevPlayer.name}'s earlier Pickpocket attempt!`,
      });
    }
  }

  actor.pendingPickpocket = true;
  state.pendingPickpocketPlayerId = actor.id;
  state.lastAnimationEvent = {
    id: `anim_pickpocket_${state.turnNumber}`,
    type: 'card_play',
    actorId: actor.id,
    cardValue: 0,
  };

  addLog(state, {
    actorId: actor.id,
    cardValue: 0,
    type: 'ability_effect',
    textBn: `🗝️ ${actor.name} ১টি কয়েন চুরির প্রস্তুতি নিয়েছেন (পরবর্তী টার্ন পর্যন্ত টিকে থাকলে সফল হবে)।`,
    textEn: `🗝️ ${actor.name} is attempting to steal 1 coin (resolves if they survive until their next turn).`,
  });
}

/**
 * Value 1 — পাহারাদার (Guard)
 */
function handleGuard(
  state: GameState,
  actor: PlayerState,
  target: PlayerState | undefined,
  guessedValue: CardValue | undefined
): void {
  if (!target || guessedValue === undefined) {
    addLog(state, {
      actorId: actor.id,
      cardValue: 1,
      type: 'ability_effect',
      textBn: `${actor.name}-এর পাহারাদার কাউকে টার্গেট করতে পারেনি (সবাই গুপ্তচর দ্বারা সুরক্ষিত)।`,
      textEn: `${actor.name}'s Guard had no unprotected opponents to target.`,
    });
    return;
  }

  const guessedChar = CHARACTERS[guessedValue];
  const actualCard = target.hand[0];
  const isCorrect = actualCard !== undefined && actualCard.value === guessedValue;

  state.lastAnimationEvent = {
    id: `anim_guard_${state.turnNumber}`,
    type: 'guard',
    actorId: actor.id,
    targetId: target.id,
    cardValue: guessedValue,
    success: isCorrect,
  };

  if (isCorrect) {
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 1,
      type: 'ability_effect',
      textBn: `🎯 সঠিক অনুমান! ${actor.name} অনুমান করেছেন ${target.name}-এর হাতে ${guessedChar.nameBn} (${guessedChar.bengaliNumber}) আছে!`,
      textEn: `🎯 Direct hit! ${actor.name} correctly guessed that ${target.name} held ${guessedChar.nameEn} (${guessedValue})!`,
    });
    eliminatePlayer(
      state,
      target,
      `পাহারাদার কর্তৃক ${guessedChar.nameBn} ধরা পড়েছে`,
      `Caught holding ${guessedChar.nameEn} by Guard`
    );
  } else {
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 1,
      type: 'ability_effect',
      textBn: `❌ ${actor.name} অনুমান করেছিলেন ${target.name}-এর হাতে ${guessedChar.nameBn} (${guessedChar.bengaliNumber}) আছে, কিন্তু তা সঠিক নয়।`,
      textEn: `❌ ${actor.name} guessed ${target.name} held ${guessedChar.nameEn} (${guessedValue}), but was incorrect.`,
    });
  }
}

/**
 * Value 2 — জাহাজ কর্মচারী (Ship Worker)
 */
function handleShipWorker(
  state: GameState,
  actor: PlayerState,
  target: PlayerState | undefined
): void {
  if (!target || !target.hand[0]) {
    addLog(state, {
      actorId: actor.id,
      cardValue: 2,
      type: 'ability_effect',
      textBn: `${actor.name}-এর জাহাজ কর্মচারী কাউকে পর্যবেক্ষণ করতে পারেনি (সবাই সুরক্ষিত)।`,
      textEn: `${actor.name}'s Ship Worker could not inspect anyone (all opponents protected).`,
    });
    return;
  }

  const inspectedCard = target.hand[0];
  if (!actor.aiKnownCards) actor.aiKnownCards = {};
  actor.aiKnownCards[target.id] = inspectedCard.value;

  addLog(state, {
    actorId: actor.id,
    targetId: target.id,
    cardValue: 2,
    type: 'ability_effect',
    textBn: `🔍 ${actor.name} গোপনে ${target.name}-এর হাতের কার্ড পর্যবেক্ষণ করেছেন।`,
    textEn: `🔍 ${actor.name} secretly inspected ${target.name}'s hand card.`,
  });

  // If the actor is a human player, open the private reveal overlay so they can inspect the card
  if (!actor.isAI) {
    const charDef = CHARACTERS[inspectedCard.value];
    state.activeReveal = {
      id: `reveal_sw_${state.turnNumber}`,
      type: 'ship_worker',
      actorId: actor.id,
      targetId: target.id,
      targetCard: inspectedCard,
      messageBn: `${target.name}-এর হাতের গোপন কার্ডটি হলো: ${charDef.nameBn} (${charDef.bengaliNumber})`,
      messageEn: `${target.name}'s secret hand card is: ${charDef.nameEn} (${inspectedCard.value})`,
      visibleToPlayerIds: [actor.id],
    };
    state.phase = 'private_reveal';
  }
}

/**
 * Value 3 — তলোয়ারবাজ (Swordsman)
 */
function handleSwordsman(
  state: GameState,
  actor: PlayerState,
  target: PlayerState | undefined
): void {
  if (!target || !actor.hand[0] || !target.hand[0]) {
    addLog(state, {
      actorId: actor.id,
      cardValue: 3,
      type: 'ability_effect',
      textBn: `${actor.name}-এর তলোয়ারবাজ ডুয়েল করার মতো কাউকে পায়নি (সবাই সুরক্ষিত)।`,
      textEn: `${actor.name}'s Swordsman had no unprotected opponent to duel.`,
    });
    return;
  }

  const actorCard = actor.hand[0];
  const targetCard = target.hand[0];

  state.lastAnimationEvent = {
    id: `anim_duel_${state.turnNumber}`,
    type: 'duel',
    actorId: actor.id,
    targetId: target.id,
    cardValue: 3,
    success: actorCard.value >= targetCard.value,
  };

  let eliminatedId: string | undefined;
  let resultBn = '';
  let resultEn = '';

  if (actorCard.value > targetCard.value) {
    eliminatedId = target.id;
    resultBn = `⚔️ তলোয়ারবাজের ডুয়েলে ${actor.name} জয়ী হয়েছেন! ${target.name}-এর কার্ডের মান কম হওয়ায় তিনি বাদ পড়েছেন।`;
    resultEn = `⚔️ ${actor.name} won the Swordsman duel! ${target.name} had the lower card and was eliminated.`;
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 3,
      type: 'ability_effect',
      textBn: resultBn,
      textEn: resultEn,
    });
    eliminatePlayer(state, target, 'তলোয়ারবাজের ডুয়েলে পরাজিত', 'Defeated in Swordsman duel');
  } else if (actorCard.value < targetCard.value) {
    eliminatedId = actor.id;
    resultBn = `⚔️ তলোয়ারবাজের ডুয়েলে ${target.name} জয়ী হয়েছেন! ${actor.name}-এর কার্ডের মান কম হওয়ায় তিনি নিজেই বাদ পড়েছেন!`;
    resultEn = `⚔️ ${target.name} won the Swordsman duel! ${actor.name} had the lower card and was eliminated!`;
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 3,
      type: 'ability_effect',
      textBn: resultBn,
      textEn: resultEn,
    });
    eliminatePlayer(state, actor, 'তলোয়ারবাজের ডুয়েলে পরাজিত', 'Defeated in Swordsman duel');
  } else {
    // Tie — neither is eliminated, both now know each other's card value
    if (!actor.aiKnownCards) actor.aiKnownCards = {};
    if (!target.aiKnownCards) target.aiKnownCards = {};
    actor.aiKnownCards[target.id] = targetCard.value;
    target.aiKnownCards[actor.id] = actorCard.value;

    resultBn = `⚔️ ${actor.name} ও ${target.name}-এর তলোয়ারবাজের ডুয়েল সমান (টাই) হয়েছে! কেউই বাদ পড়েননি।`;
    resultEn = `⚔️ The Swordsman duel between ${actor.name} and ${target.name} ended in a tie! Neither player was eliminated.`;
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 3,
      type: 'ability_effect',
      textBn: resultBn,
      textEn: resultEn,
    });
  }

  // If either participant is human in AI mode (or actor is human in local mode), show private duel modal
  if (!actor.isAI || (state.settings.mode === 'ai' && !target.isAI)) {
    state.activeReveal = {
      id: `reveal_duel_${state.turnNumber}`,
      type: 'swordsman_duel',
      actorId: actor.id,
      targetId: target.id,
      actorCard,
      targetCard,
      eliminatedPlayerId: eliminatedId,
      messageBn: resultBn,
      messageEn: resultEn,
      visibleToPlayerIds: [actor.id, target.id],
    };
    state.phase = 'private_reveal';
  }
}

/**
 * Value 4 — গুপ্তচর (Spy)
 */
function handleSpy(state: GameState, actor: PlayerState): void {
  actor.isProtected = true;
  state.lastAnimationEvent = {
    id: `anim_spy_${state.turnNumber}`,
    type: 'spy',
    actorId: actor.id,
    cardValue: 4,
    success: true,
  };
  addLog(state, {
    actorId: actor.id,
    cardValue: 4,
    type: 'ability_effect',
    textBn: `🛡️ ${actor.name} গুপ্তচর (৪) খেলেছেন! পরবর্তী টার্ন পর্যন্ত অন্য কারও কার্ডের প্রভাব তার ওপর পড়বে না।`,
    textEn: `🛡️ ${actor.name} is now protected by the Spy (4) until their next turn begins!`,
  });
}

/**
 * Value 5 — কামানচালক (Cannon Operator)
 */
function handleCannonOperator(
  state: GameState,
  actor: PlayerState,
  target: PlayerState | undefined
): void {
  if (!target || target.hand.length === 0) {
    addLog(state, {
      actorId: actor.id,
      cardValue: 5,
      type: 'ability_effect',
      textBn: `${actor.name}-এর কামানচালক কাউকে লক্ষ্যবস্তু করতে পারেনি।`,
      textEn: `${actor.name}'s Cannon Operator had no valid target.`,
    });
    return;
  }

  const destroyedCard = target.hand.shift()!;
  target.discards.push(destroyedCard);
  state.publicDiscardPile.push({
    card: destroyedCard,
    playerId: target.id,
    turn: state.turnNumber,
  });

  // Clear AI knowledge of target's old card
  for (const p of state.players) {
    if (p.aiKnownCards) {
      delete p.aiKnownCards[target.id];
    }
  }

  const destroyedDef = CHARACTERS[destroyedCard.value];
  state.lastAnimationEvent = {
    id: `anim_cannon_${state.turnNumber}`,
    type: 'cannon',
    actorId: actor.id,
    targetId: target.id,
    cardValue: destroyedCard.value,
    success: true,
  };

  if (destroyedCard.value === 9) {
    // Destroying the Pirate (9) eliminates the targeted player immediately!
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 5,
      type: 'ability_effect',
      textBn: `💥 কামানের গোলার আঘাতে ${target.name}-এর হাতের জলদস্যু (৯) কার্ডটি ধ্বংস হয়েছে!`,
      textEn: `💥 Cannon fire destroyed ${target.name}'s Pirate (9) card!`,
    });
    eliminatePlayer(
      state,
      target,
      'কামানের তোপে জলদস্যু (৯) কার্ড ধ্বংস হয়েছে',
      'Pirate (9) destroyed by Cannon Operator'
    );
    return;
  }

  // Target draws a replacement card if the deck still has cards
  if (state.deck.length > 0) {
    const replacement = state.deck.shift()!;
    target.hand.push(replacement);
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 5,
      type: 'ability_effect',
      textBn: `💣 ${actor.name}-এর কামানের গোলায় ${target.name}-এর হাতের কার্ড (${destroyedDef.nameBn}) ধ্বংস হয়েছে এবং তিনি ডেক থেকে নতুন ১টি কার্ড নিয়েছেন।`,
      textEn: `💣 ${actor.name}'s Cannon Operator destroyed ${target.name}'s card (${destroyedDef.nameEn}) and forced them to draw a replacement.`,
    });
  } else {
    addLog(state, {
      actorId: actor.id,
      targetId: target.id,
      cardValue: 5,
      type: 'ability_effect',
      textBn: `💣 ${actor.name}-এর কামানের গোলায় ${target.name}-এর কার্ড (${destroyedDef.nameBn}) ধ্বংস হয়েছে (ডেক খালি থাকায় নতুন কার্ড নেই)।`,
      textEn: `💣 ${actor.name}'s Cannon Operator destroyed ${target.name}'s card (${destroyedDef.nameEn}). The deck is empty, so no replacement was drawn.`,
    });
  }
}

/**
 * Value 6 — বণিক (Merchant)
 */
function handleMerchant(state: GameState, actor: PlayerState): void {
  const drawnCards: CardInstance[] = [];
  for (let i = 0; i < 2; i++) {
    if (state.deck.length > 0) {
      drawnCards.push(state.deck.shift()!);
    }
  }

  if (drawnCards.length === 0) {
    // Deck was already empty — Merchant resolves without drawing
    addLog(state, {
      actorId: actor.id,
      cardValue: 6,
      type: 'ability_effect',
      textBn: `⚖️ ${actor.name} বণিক খেলেছেন, কিন্তু ডেকে কোনো কার্ড অবশিষ্ট না থাকায় হাতের কার্ডটিই অপরিবর্তিত রয়েছে।`,
      textEn: `⚖️ ${actor.name} played Merchant (6), but the deck is empty so their hand remains unchanged.`,
    });
    return;
  }

  const options = [...actor.hand, ...drawnCards];
  actor.hand = [];
  state.pendingMerchant = {
    playerId: actor.id,
    options,
  };
  state.phase = 'merchant_selection';

  addLog(state, {
    actorId: actor.id,
    cardValue: 6,
    type: 'ability_effect',
    textBn: `⚖️ ${actor.name} বণিক (৬) খেলে ডেক থেকে ${drawnCards.length}টি কার্ড নিয়েছেন এবং ১টি কার্ড বাছাই করছেন...`,
    textEn: `⚖️ ${actor.name} drew ${drawnCards.length} card(s) with Merchant (6) and is choosing 1 card to keep...`,
  });
}

/**
 * Resolves the Merchant (6) card selection and returns unchosen cards to the bottom of the deck.
 */
export function resolveMerchantChoice(
  prevState: GameState,
  action: ResolveMerchantAction
): GameState {
  const state = structuredClone(prevState);
  if (state.phase !== 'merchant_selection' || !state.pendingMerchant) {
    throw new Error('No pending Merchant selection to resolve.');
  }
  if (state.pendingMerchant.playerId !== action.playerId) {
    throw new Error('Only the player resolving Merchant may choose the card.');
  }

  const actor = state.players.find((p) => p.id === action.playerId);
  if (!actor) {
    throw new Error('Player not found.');
  }

  const options = state.pendingMerchant.options;
  const keepCard = options.find((c) => c.uid === action.keepCardUid);
  if (!keepCard) {
    throw new Error('Chosen card is not one of the Merchant options.');
  }

  const remaining = options.filter((c) => c.uid !== action.keepCardUid);
  let orderedBottom: CardInstance[] = remaining;
  if (action.bottomOrderUids && action.bottomOrderUids.length === remaining.length) {
    const mapped = action.bottomOrderUids
      .map((uid) => remaining.find((c) => c.uid === uid))
      .filter((c): c is CardInstance => Boolean(c));
    if (mapped.length === remaining.length) {
      orderedBottom = mapped;
    }
  }

  actor.hand = [keepCard];
  state.deck.push(...orderedBottom);
  state.pendingMerchant = null;
  state.phase = 'choosing_action';

  addLog(state, {
    actorId: actor.id,
    cardValue: 6,
    type: 'ability_effect',
    textBn: `⚖️ ${actor.name} ১টি কার্ড হাতে রেখে বাকি ${orderedBottom.length}টি কার্ড গোপনে ডেকের নিচে রেখেছেন।`,
    textEn: `⚖️ ${actor.name} kept 1 card in hand and returned ${orderedBottom.length} card(s) to the bottom of the deck.`,
  });

  completeTurnAndAdvance(state);
  return state;
}

/**
 * Value 7 — নাবিক (Sailor)
 */
function handleSailor(
  state: GameState,
  actor: PlayerState,
  target: PlayerState | undefined
): void {
  if (!target || !actor.hand[0] || !target.hand[0]) {
    addLog(state, {
      actorId: actor.id,
      cardValue: 7,
      type: 'ability_effect',
      textBn: `${actor.name}-এর নাবিক কার্ড বদল করার মতো কাউকে পায়নি (সবাই সুরক্ষিত)।`,
      textEn: `${actor.name}'s Sailor had no unprotected opponent to swap cards with.`,
    });
    return;
  }

  const actorOldCard = actor.hand[0];
  const targetOldCard = target.hand[0];

  actor.hand = [targetOldCard];
  target.hand = [actorOldCard];

  // Both players now know what the other player received!
  if (!actor.aiKnownCards) actor.aiKnownCards = {};
  if (!target.aiKnownCards) target.aiKnownCards = {};
  actor.aiKnownCards[target.id] = actorOldCard.value;
  target.aiKnownCards[actor.id] = targetOldCard.value;

  state.lastAnimationEvent = {
    id: `anim_swap_${state.turnNumber}`,
    type: 'swap',
    actorId: actor.id,
    targetId: target.id,
    cardValue: 7,
    success: true,
  };

  addLog(state, {
    actorId: actor.id,
    targetId: target.id,
    cardValue: 7,
    type: 'ability_effect',
    textBn: `🔄 ${actor.name} নাবিক (৭) ব্যবহার করে ${target.name}-এর সাথে গোপনে হাতের কার্ড বদল করেছেন!`,
    textEn: `🔄 ${actor.name} used Sailor (7) to secretly exchange hand cards with ${target.name}!`,
  });
}

/**
 * Value 8 — ক্যাপ্টেন (Captain)
 */
function handleCaptain(state: GameState, actor: PlayerState): void {
  state.lastAnimationEvent = {
    id: `anim_captain_${state.turnNumber}`,
    type: 'card_play',
    actorId: actor.id,
    cardValue: 8,
  };
  addLog(state, {
    actorId: actor.id,
    cardValue: 8,
    type: 'ability_effect',
    textBn: `⚓ ${actor.name} ক্যাপ্টেন (৮) কার্ডটি টেবিলে নামিয়েছেন।`,
    textEn: `⚓ ${actor.name} played the Captain (8).`,
  });
}

/**
 * Value 9 — জলদস্যু (Pirate)
 */
function handlePirate(state: GameState, actor: PlayerState): void {
  state.lastAnimationEvent = {
    id: `anim_pirate_${state.turnNumber}`,
    type: 'pirate_self_destruct',
    actorId: actor.id,
    cardValue: 9,
    success: false,
  };
  eliminatePlayer(
    state,
    actor,
    'স্বেচ্ছায় জলদস্যু (৯) কার্ড খেলেছেন',
    'Voluntarily played the Pirate (9)'
  );
}

/**
 * Acknowledges a private reveal modal (Ship Worker inspection or Swordsman duel)
 * and advances the turn.
 */
export function acknowledgeReveal(prevState: GameState): GameState {
  if (prevState.phase !== 'private_reveal') return prevState;
  const state = structuredClone(prevState);
  state.activeReveal = null;
  state.phase = 'choosing_action';
  completeTurnAndAdvance(state);
  return state;
}

/**
 * Evaluates round-ending conditions after a turn action finishes, or advances to the next living player.
 */
export function completeTurnAndAdvance(state: GameState): void {
  const livingPlayers = state.players.filter((p) => !p.isEliminated);

  // Condition A: Only one (or zero) living player remains
  if (livingPlayers.length <= 1) {
    scoreRoundEnd(state, 'last_standing');
    return;
  }

  // Condition B: The draw deck is exhausted
  if (state.deck.length === 0) {
    scoreRoundEnd(state, 'highest_card');
    return;
  }

  // Otherwise advance to the next living player
  const totalPlayers = state.players.length;
  let nextIdx = (state.activePlayerIndex + 1) % totalPlayers;
  for (let i = 0; i < totalPlayers; i++) {
    if (!state.players[nextIdx].isEliminated) {
      break;
    }
    nextIdx = (nextIdx + 1) % totalPlayers;
  }

  state.activePlayerIndex = nextIdx;
  state.turnNumber += 1;
  beginTurnForActivePlayer(state);
}

/**
 * Single authoritative scoring function for round endings.
 * Never awards coins twice for the same round-ending event (`state.roundScored`).
 */
export function scoreRoundEnd(
  state: GameState,
  reason: 'last_standing' | 'highest_card'
): void {
  if (state.roundScored) return;
  state.roundScored = true;

  const livingPlayers = state.players.filter((p) => !p.isEliminated);
  const coinsAwarded: Record<string, number> = {};
  for (const p of state.players) {
    coinsAwarded[p.id] = 0;
  }

  // If pickpocketRule is 'round_end' (or if a player has an uncancelled pending pickpocket at round end),
  // resolve round_end pickpocket bonus if configured
  if (state.settings.pickpocketRule === 'round_end' && state.pendingPickpocketPlayerId) {
    const thief = livingPlayers.find((p) => p.id === state.pendingPickpocketPlayerId && p.pendingPickpocket);
    if (thief) {
      thief.pendingPickpocket = false;
      state.pendingPickpocketPlayerId = null;
      thief.coins += 1;
      thief.roundCoinsEarned += 1;
      coinsAwarded[thief.id] += 1;
      addLog(state, {
        actorId: thief.id,
        cardValue: 0,
        type: 'pickpocket_steal',
        textBn: `🪙 ${thief.name} রাউন্ডের শেষ পর্যন্ত টিকে থাকা একমাত্র ছিচকে চোর হিসেবে ১টি অতিরিক্ত কয়েন জিতেছেন!`,
        textEn: `🪙 ${thief.name} survived to the end of the round as the sole Pickpocket and earned 1 bonus coin!`,
      });
    }
  }

  let roundWinners: PlayerState[] = [];

  if (reason === 'last_standing') {
    if (livingPlayers.length === 1) {
      roundWinners = [livingPlayers[0]];
    }
  } else {
    // Compare hand card values of all remaining living players
    let maxVal = -1;
    for (const p of livingPlayers) {
      const val = p.hand[0]?.value ?? -1;
      if (val > maxVal) {
        maxVal = val;
        roundWinners = [p];
      } else if (val === maxVal) {
        roundWinners.push(p);
      }
    }

    // If tied and tieRule === 'discard_sum', break ties using sum of discarded cards
    if (roundWinners.length > 1 && state.settings.tieRule === 'discard_sum') {
      let bestDiscardSum = -1;
      let tieBrokenWinners: PlayerState[] = [];
      for (const w of roundWinners) {
        const sum = w.discards.reduce((acc, c) => acc + c.value, 0);
        if (sum > bestDiscardSum) {
          bestDiscardSum = sum;
          tieBrokenWinners = [w];
        } else if (sum === bestDiscardSum) {
          tieBrokenWinners.push(w);
        }
      }
      roundWinners = tieBrokenWinners;
    }
  }

  const reward = Math.max(1, state.settings.roundVictoryReward);
  if (roundWinners.length === 1) {
    const winner = roundWinners[0];
    winner.coins += reward;
    winner.roundCoinsEarned += reward;
    coinsAwarded[winner.id] += reward;
  } else if (roundWinners.length > 1) {
    if (state.settings.tieRule === 'all_full') {
      for (const w of roundWinners) {
        w.coins += reward;
        w.roundCoinsEarned += reward;
        coinsAwarded[w.id] += reward;
      }
    } else {
      // 'split' (or still tied after 'discard_sum'): share the round reward equally;
      // if reward < winners.length, each tied winner receives at least 1 coin so a win is never 0.
      const share = Math.max(1, Math.floor(reward / roundWinners.length));
      for (const w of roundWinners) {
        w.coins += share;
        w.roundCoinsEarned += share;
        coinsAwarded[w.id] += share;
      }
    }
  }

  const winnerNames = roundWinners.map((w) => w.name);
  const revealedHands = state.players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    card: p.hand[0],
    isEliminated: p.isEliminated,
  }));

  state.roundHistory.push({
    round: state.round,
    winnerIds: roundWinners.map((w) => w.id),
    winnerNames,
    reason,
    coinsAwarded,
    revealedHands,
    removedCard: state.removedCard,
  });

  const namesText = winnerNames.join(', ');
  addLog(state, {
    type: 'round_end',
    textBn:
      reason === 'last_standing'
        ? `🏆 রাউন্ড ${state.round} সমাপ্ত! একমাত্র জীবিত খেলোয়াড় হিসেবে ${namesText} জয়ী হয়েছেন!`
        : `🏆 রাউন্ড ${state.round} সমাপ্ত! ডেক শেষ হওয়ায় সর্বোচ্চ মানের কার্ড নিয়ে ${namesText} জয়ী হয়েছেন!`,
    textEn:
      reason === 'last_standing'
        ? `🏆 Round ${state.round} complete! ${namesText} won as the last pirate standing!`
        : `🏆 Round ${state.round} complete! The deck is empty and ${namesText} won with the highest card!`,
  });

  // Check if overall game victory condition is reached
  const reachedTarget = state.players.some((p) => p.coins >= state.settings.targetCoins);
  const reachedMaxRounds = state.round >= state.settings.maxRounds;

  if (reachedTarget || reachedMaxRounds) {
    finalizeOverallGameWinner(state);
  } else {
    state.phase = 'round_over';
  }
}

function finalizeOverallGameWinner(state: GameState): void {
  let maxCoins = -1;
  let winners: PlayerState[] = [];
  for (const p of state.players) {
    if (p.coins > maxCoins) {
      maxCoins = p.coins;
      winners = [p];
    } else if (p.coins === maxCoins) {
      winners.push(p);
    }
  }
  state.winnerIds = winners.map((w) => w.id);
  state.phase = 'game_over';

  const winnerNames = winners.map((w) => w.name).join(', ');
  addLog(state, {
    type: 'game_end',
    textBn: `👑 খেলা সমাপ্ত! সর্বোচ্চ ${maxCoins}টি কয়েন সংগ্রহ করে বিজয়ী হয়েছেন: ${winnerNames}!`,
    textEn: `👑 Victory! ${winnerNames} won the game with ${maxCoins} coins!`,
  });
}

/**
 * Advances to the next round after a round ends.
 */
export function startNextRound(
  prevState: GameState,
  rng: () => number = Math.random
): GameState {
  if (prevState.phase !== 'round_over') return prevState;
  const nextState = structuredClone(prevState);
  nextState.round += 1;

  // Winner of the previous round starts the next round (or next index if none)
  const lastRecord = nextState.roundHistory[nextState.roundHistory.length - 1];
  let starterIdx = (nextState.activePlayerIndex + 1) % nextState.players.length;
  if (lastRecord && lastRecord.winnerIds.length > 0) {
    const foundIdx = nextState.players.findIndex((p) => p.id === lastRecord.winnerIds[0]);
    if (foundIdx !== -1) starterIdx = foundIdx;
  }

  return setupRound(nextState, starterIdx, rng);
}

/**
 * Sanitizes the full authoritative `GameState` for a specific viewer (`viewerPlayerId`),
 * masking hidden cards in other players' hands, the face-down removed card (until round_over/game_over),
 * the remaining draw deck order, and private reveals not meant for `viewerPlayerId`.
 */
export function sanitizeStateForPlayer(
  state: GameState,
  viewerPlayerId: string | null
): GameState {
  const sanitized = structuredClone(state);
  const isRoundFinished = sanitized.phase === 'round_over' || sanitized.phase === 'game_over';

  // Hide deck card identities (preserve count and UIDs as placeholders)
  sanitized.deck = sanitized.deck.map((c, idx) => ({
    uid: `hidden_deck_${idx}_${c.uid.slice(-2)}`,
    value: 0,
  }));

  // Hide the face-down removed card until the round is over
  if (!isRoundFinished && sanitized.removedCard) {
    sanitized.removedCard = {
      uid: 'hidden_removed_card',
      value: 0,
    };
  }

  // Hide other living players' hands unless the round is over
  for (const p of sanitized.players) {
    delete p.aiKnownCards;
    if (!isRoundFinished && p.id !== viewerPlayerId) {
      p.hand = p.hand.map((c, idx) => ({
        uid: `hidden_hand_${p.id}_${idx}`,
        value: 0,
      }));
    }
  }

  // Hide Merchant options if viewer is not the Merchant player
  if (sanitized.pendingMerchant && sanitized.pendingMerchant.playerId !== viewerPlayerId) {
    sanitized.pendingMerchant.options = sanitized.pendingMerchant.options.map((_, idx) => ({
      uid: `hidden_merchant_${idx}`,
      value: 0,
    }));
  }

  // Hide private reveal card details if viewer is not in visibleToPlayerIds
  if (
    sanitized.activeReveal &&
    (!viewerPlayerId || !sanitized.activeReveal.visibleToPlayerIds.includes(viewerPlayerId))
  ) {
    sanitized.activeReveal = {
      ...sanitized.activeReveal,
      actorCard: undefined,
      targetCard: undefined,
      messageBn: 'অন্য খেলোয়াড়রা গোপনে কার্ড পর্যবেক্ষণ করছেন...',
      messageEn: 'Other players are privately inspecting cards...',
    };
  }

  return sanitized;
}
