import {
  getPlayableCardUids,
  getValidTargetIds,
} from './engine';
import {
  CardInstance,
  CardValue,
  GameState,
  PlayCardAction,
  PlayerState,
  ResolveMerchantAction,
} from './types';

/**
 * Calculates how many copies of each card value have NOT been publicly discarded
 * and are NOT currently in the AI player's own hand.
 */
export function getRemainingCardProbabilities(
  state: GameState,
  aiPlayer: PlayerState
): Record<CardValue, number> {
  const remaining: Record<CardValue, number> = { ...state.settings.deckCounts };

  for (const entry of state.publicDiscardPile) {
    remaining[entry.card.value] = Math.max(0, (remaining[entry.card.value] ?? 0) - 1);
  }

  for (const c of aiPlayer.hand) {
    remaining[c.value] = Math.max(0, (remaining[c.value] ?? 0) - 1);
  }

  return remaining;
}

/**
 * Strategic AI decision-maker for choosing which card to play, which target to select,
 * and which character to guess when playing Guard (1).
 */
export function computeAIMove(
  state: GameState,
  rng: () => number = Math.random
): PlayCardAction {
  const ai = state.players[state.activePlayerIndex];
  if (!ai || ai.hand.length === 0) {
    throw new Error('AI player has no cards to play.');
  }

  const difficulty = ai.aiDifficulty ?? 'medium';
  const playableUids = getPlayableCardUids(ai.hand);
  const playableCards = ai.hand.filter((c) => playableUids.includes(c.uid));

  // Never voluntarily play Pirate (9) unless it is the only card (which shouldn't happen)
  const nonPirateCards = playableCards.filter((c) => c.value !== 9);
  const candidateCards = nonPirateCards.length > 0 ? nonPirateCards : playableCards;

  let chosenCard: CardInstance = candidateCards[0];

  if (candidateCards.length > 1) {
    const [c1, c2] = candidateCards;
    chosenCard = selectBestCardToPlay(state, ai, c1, c2, difficulty, rng);
  }

  const validTargets = getValidTargetIds(state, ai.id, chosenCard.value);
  let targetPlayerId: string | undefined;
  let guessedValue: CardValue | undefined;

  if (validTargets.length > 0) {
    targetPlayerId = selectBestTarget(state, ai, chosenCard.value, validTargets, difficulty, rng);
  }

  if (chosenCard.value === 1 && targetPlayerId) {
    guessedValue = selectBestGuardGuess(state, ai, targetPlayerId, difficulty, rng);
  }

  return {
    playerId: ai.id,
    cardUid: chosenCard.uid,
    targetPlayerId,
    guessedValue,
  };
}

function selectBestCardToPlay(
  state: GameState,
  ai: PlayerState,
  c1: CardInstance,
  c2: CardInstance,
  difficulty: 'easy' | 'medium' | 'hard',
  rng: () => number
): CardInstance {
  if (difficulty === 'easy' && rng() < 0.35) {
    return rng() < 0.5 ? c1 : c2;
  }

  const scoreCardToPlay = (play: CardInstance, keep: CardInstance): number => {
    let score = 0;

    // Generally prefer keeping higher-value cards in hand for duels and end-of-round comparisons
    score += keep.value * 4;

    // Never play Pirate (9)
    if (play.value === 9) return -1000;

    // If holding Pirate (9) or Captain (8), Spy (4) is extremely valuable to play
    if (play.value === 4 && keep.value >= 7) {
      score += 35;
    }

    // If another player has a pending Pickpocket (0), playing our own Pickpocket (0) cancels theirs!
    if (
      play.value === 0 &&
      state.pendingPickpocketPlayerId &&
      state.pendingPickpocketPlayerId !== ai.id
    ) {
      score += 30;
    } else if (play.value === 0 && keep.value >= 4) {
      // Playing Pickpocket while keeping a mid/high card is great
      score += 18;
    }

    // Guard (1) is strongest when we know an opponent's card
    const knownOpponentEntries = Object.entries(ai.aiKnownCards ?? {}).filter(([pid, val]) => {
      const opp = state.players.find((p) => p.id === pid);
      return opp && !opp.isEliminated && !opp.isProtected && val !== 1;
    });
    if (play.value === 1) {
      score += knownOpponentEntries.length > 0 ? 45 : 15;
    }

    // Swordsman (3) is great ONLY if the card we keep is high (>= 6) or higher than a known opponent card
    if (play.value === 3) {
      if (keep.value >= 7) {
        score += 32;
      } else if (keep.value <= 3) {
        score -= 30; // Risky to duel with a low card!
      }
      const beatableKnown = Object.entries(ai.aiKnownCards ?? {}).some(([pid, val]) => {
        const opp = state.players.find((p) => p.id === pid);
        return opp && !opp.isEliminated && !opp.isProtected && keep.value > val;
      });
      if (beatableKnown) score += 40;
    }

    // Ship Worker (2) is solid early-mid game info gathering
    if (play.value === 2) {
      score += 16;
    }

    // Cannon Operator (5) is critical if someone is known to hold Pirate (9) or has pending Pickpocket
    if (play.value === 5) {
      const pirateHolder = Object.entries(ai.aiKnownCards ?? {}).some(([pid, val]) => {
        const opp = state.players.find((p) => p.id === pid);
        return opp && !opp.isEliminated && !opp.isProtected && val === 9;
      });
      if (pirateHolder) score += 60;
      else score += 14;
    }

    // Merchant (6) is great if our other card is low
    if (play.value === 6) {
      score += keep.value <= 4 ? 22 : 10;
    }

    // Sailor (7) is useful if we are swapping away a low card (0 or 1), bad if swapping away 8 or 9
    if (play.value === 7) {
      if (keep.value <= 2) score += 20;
      if (keep.value >= 8) score -= 35;
    }

    // Avoid voluntarily playing Captain (8) unless forced
    if (play.value === 8) {
      score -= 25;
    }

    return score;
  };

  const s1 = scoreCardToPlay(c1, c2);
  const s2 = scoreCardToPlay(c2, c1);
  return s1 >= s2 ? c1 : c2;
}

function selectBestTarget(
  state: GameState,
  ai: PlayerState,
  cardValue: CardValue,
  validTargets: string[],
  difficulty: 'easy' | 'medium' | 'hard',
  rng: () => number
): string {
  // For Cannon Operator (5), never target self if an opponent is available
  const opponentTargets = validTargets.filter((id) => id !== ai.id);
  const candidates = opponentTargets.length > 0 ? opponentTargets : validTargets;

  if (difficulty === 'easy' || candidates.length === 1) {
    return candidates[Math.floor(rng() * candidates.length)];
  }

  const known = ai.aiKnownCards ?? {};
  const otherCardValue = ai.hand.find((c) => c.value !== cardValue)?.value ?? ai.hand[0]?.value ?? 0;

  let bestId = candidates[0];
  let bestScore = -999;

  for (const tid of candidates) {
    const target = state.players.find((p) => p.id === tid)!;
    let score = target.coins * 5; // Prefer targeting coin leaders

    if (target.pendingPickpocket) {
      score += 18; // Stop pending Pickpocket thief!
    }

    const knownVal = known[tid];
    if (cardValue === 1 && knownVal !== undefined && knownVal !== 1) {
      score += 50; // Guaranteed Guard elimination!
    }
    if (cardValue === 3 && knownVal !== undefined) {
      if (otherCardValue > knownVal) score += 50;
      else if (otherCardValue < knownVal) score -= 60;
    }
    if (cardValue === 5 && knownVal === 9) {
      score += 80; // Destroy Pirate (9) for instant elimination!
    }

    // Check if target played Captain (8) recently — they likely hold 5 or 7!
    const lastDiscard = target.discards[target.discards.length - 1];
    if (lastDiscard?.value === 8 && (cardValue === 1 || cardValue === 5)) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = tid;
    }
  }

  return bestId;
}

function selectBestGuardGuess(
  state: GameState,
  ai: PlayerState,
  targetId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  rng: () => number
): CardValue {
  const validGuesses: CardValue[] = [0, 2, 3, 4, 5, 6, 7, 8, 9];
  if (difficulty === 'easy' && rng() < 0.5) {
    return validGuesses[Math.floor(rng() * validGuesses.length)];
  }

  // 1. If AI knows the target's exact card (and it's not Guard 1), guess it!
  const knownVal = ai.aiKnownCards?.[targetId];
  if (knownVal !== undefined && knownVal !== 1) {
    return knownVal;
  }

  const remaining = getRemainingCardProbabilities(state, ai);
  const target = state.players.find((p) => p.id === targetId);

  // 2. If target just played Captain (8), they were likely forced by holding 5 or 7!
  const lastDiscard = target?.discards[target.discards.length - 1];
  if (lastDiscard?.value === 8 && difficulty === 'hard') {
    if (remaining[5] > 0) return 5;
    if (remaining[7] > 0) return 7;
  }

  // 3. Pick among cards with highest remaining unseen copies, preferring higher threat values
  let bestGuess: CardValue = 5;
  let bestWeight = -1;

  for (const val of validGuesses) {
    const countLeft = remaining[val] ?? 0;
    if (countLeft <= 0) continue;
    const weight = countLeft * 10 + val * 0.5 + rng() * 2;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestGuess = val;
    }
  }

  return bestGuess;
}

/**
 * Strategic AI choice for Merchant (6): pick the best card to keep among up to 3 options.
 */
export function computeAIMerchantChoice(state: GameState): ResolveMerchantAction {
  const pending = state.pendingMerchant;
  if (!pending) {
    throw new Error('No pending Merchant choice.');
  }

  const options = [...pending.options];
  // Sort options by strategic value to keep in hand:
  // High cards (9, 8, 7) or Spy (4) or Guard (1) are preferred over self-restricting combinations
  options.sort((a, b) => {
    const score = (c: CardInstance) => {
      if (c.value === 4) return 7.5; // Spy is very safe
      return c.value;
    };
    return score(b) - score(a);
  });

  const keep = options[0];
  const bottom = options.slice(1).map((c) => c.uid);

  return {
    playerId: pending.playerId,
    keepCardUid: keep.uid,
    bottomOrderUids: bottom,
  };
}
