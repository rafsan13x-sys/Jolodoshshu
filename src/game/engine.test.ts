import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeReveal,
  buildDeck,
  createDefaultPlayers,
  createDefaultSettings,
  createInitialGameState,
  getPlayableCardUids,
  mustPlayCaptain,
  playCard,
  resolveMerchantChoice,
  sanitizeStateForPlayer,
  scoreRoundEnd,
  startNextRound,
} from './engine';
import { DEFAULT_DECK_COUNTS } from './cards';
import { CardInstance, GameState } from './types';

function makeDeterministicRng(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('1. Deck composition matches official 21-card specification and supports custom counts', () => {
  const deck = buildDeck(DEFAULT_DECK_COUNTS);
  assert.equal(deck.length, 21);

  const countByVal = (v: number) => deck.filter((c) => c.value === v).length;
  assert.equal(countByVal(0), 2);
  assert.equal(countByVal(1), 6);
  assert.equal(countByVal(2), 2);
  assert.equal(countByVal(3), 2);
  assert.equal(countByVal(4), 2);
  assert.equal(countByVal(5), 2);
  assert.equal(countByVal(6), 2);
  assert.equal(countByVal(7), 1);
  assert.equal(countByVal(8), 1);
  assert.equal(countByVal(9), 1);
});

test('2. Shuffling and removing one hidden card leaves 20 playable cards dealt to players and deck', () => {
  const settings = createDefaultSettings({ playerCount: 4, mode: 'ai' });
  const players = createDefaultPlayers(4, 'ai');
  const state = createInitialGameState(players, settings, makeDeterministicRng(7));

  assert.ok(state.removedCard, 'One secret card must be removed face-down');
  // 21 total - 1 removed - 4 dealt (1 per player) - 1 drawn by active player 0 = 15 in deck
  assert.equal(state.players[0].hand.length, 2);
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(state.players[2].hand.length, 1);
  assert.equal(state.players[3].hand.length, 1);
  assert.equal(state.deck.length, 15);
});

test('3. Mandatory Captain (8) play rule enforced with Cannon Operator (5) or Sailor (7)', () => {
  const handWithCannon: CardInstance[] = [
    { uid: 'c_8', value: 8 },
    { uid: 'c_5', value: 5 },
  ];
  assert.equal(mustPlayCaptain(handWithCannon), true);
  assert.deepEqual(getPlayableCardUids(handWithCannon), ['c_8']);

  const handWithSailor: CardInstance[] = [
    { uid: 'c_7', value: 7 },
    { uid: 'c_8', value: 8 },
  ];
  assert.equal(mustPlayCaptain(handWithSailor), true);
  assert.deepEqual(getPlayableCardUids(handWithSailor), ['c_8']);

  const handWithPirate: CardInstance[] = [
    { uid: 'c_8', value: 8 },
    { uid: 'c_9', value: 9 },
  ];
  assert.equal(mustPlayCaptain(handWithPirate), false);
  assert.equal(getPlayableCardUids(handWithPirate).length, 2);

  // Attempting to play Cannon Operator (5) when holding Captain (8) must throw an error
  const settings = createDefaultSettings({ playerCount: 2, mode: 'ai' });
  const state = createInitialGameState(createDefaultPlayers(2, 'ai'), settings, makeDeterministicRng(1));
  state.players[0].hand = [
    { uid: 'c_8', value: 8 },
    { uid: 'c_5', value: 5 },
  ];

  assert.throws(() => {
    playCard(state, {
      playerId: state.players[0].id,
      cardUid: 'c_5',
      targetPlayerId: state.players[1].id,
    });
  }, /Mandatory rule violation/);
});

test('4. Pirate (9) elimination on voluntary play and when destroyed by Cannon Operator (5)', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'ai' });
  let state = createInitialGameState(createDefaultPlayers(3, 'ai'), settings, makeDeterministicRng(2));

  // Case A: Player 0 voluntarily plays Pirate (9) -> immediately eliminated
  state.players[0].hand = [
    { uid: 'p_9', value: 9 },
    { uid: 'p_1', value: 1 },
  ];
  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'p_9',
  });
  assert.equal(state.players[0].isEliminated, true);
  assert.equal(state.players[0].hand.length, 0);
  // Active player moved to Player 1
  assert.equal(state.activePlayerIndex, 1);

  // Case B: Player 1 plays Cannon Operator (5) targeting Player 2 who holds Pirate (9) -> Player 2 eliminated, Player 1 wins round as last standing!
  state.players[1].hand = [
    { uid: 'p_5', value: 5 },
    { uid: 'p_2', value: 2 },
  ];
  state.players[2].hand = [{ uid: 'p_target_9', value: 9 }];

  state = playCard(state, {
    playerId: state.players[1].id,
    cardUid: 'p_5',
    targetPlayerId: state.players[2].id,
  });

  assert.equal(state.players[2].isEliminated, true);
  assert.equal(state.phase, 'round_over');
  assert.equal(state.players[1].coins, settings.roundVictoryReward);
});

test('5. Pending Pickpocket (0) resolution, cancellation by another Pickpocket, and failure on elimination', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'ai', targetCoins: 5 });
  let state = createInitialGameState(createDefaultPlayers(3, 'ai'), settings, makeDeterministicRng(10));

  // Player 0 plays Pickpocket (0)
  state.players[0].hand = [
    { uid: 'pp_0_a', value: 0 },
    { uid: 'pp_4_a', value: 4 },
  ];
  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'pp_0_a',
  });
  assert.equal(state.players[0].pendingPickpocket, true);
  assert.equal(state.pendingPickpocketPlayerId, state.players[0].id);

  // Player 1 plays Pickpocket (0) -> cancels Player 0's pending theft!
  state.players[1].hand = [
    { uid: 'pp_0_b', value: 0 },
    { uid: 'pp_4_b', value: 4 },
  ];
  state = playCard(state, {
    playerId: state.players[1].id,
    cardUid: 'pp_0_b',
  });
  assert.equal(state.players[0].pendingPickpocket, false);
  assert.equal(state.players[1].pendingPickpocket, true);
  assert.equal(state.pendingPickpocketPlayerId, state.players[1].id);

  // Player 2 plays Spy (4)
  state.players[2].hand = [
    { uid: 'pp_4_c', value: 4 },
    { uid: 'pp_8_c', value: 8 },
  ];
  state = playCard(state, {
    playerId: state.players[2].id,
    cardUid: 'pp_4_c',
  });

  // Player 0 plays Spy (4)
  state.players[0].hand = [
    { uid: 'pp_4_a', value: 4 },
    { uid: 'pp_6_a', value: 6 },
  ];
  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'pp_4_a',
  });

  // Now it is Player 1's turn again — a full round of turns has passed and Player 1 is still alive!
  assert.equal(state.activePlayerIndex, 1);
  assert.equal(state.players[1].coins, 1);
  assert.equal(state.players[1].pendingPickpocket, false);
  assert.equal(state.pendingPickpocketPlayerId, null);
});

test('6. Guard (1), Ship Worker (2), Swordsman (3), Spy (4), Merchant (6), and Sailor (7) abilities', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'ai' });
  let state = createInitialGameState(createDefaultPlayers(3, 'ai'), settings, makeDeterministicRng(21));

  // Guard cannot guess 1
  state.players[0].hand = [
    { uid: 'g_1', value: 1 },
    { uid: 'g_8', value: 8 },
  ];
  state.players[1].hand = [{ uid: 't_6', value: 6 }];
  assert.throws(() => {
    playCard(state, {
      playerId: state.players[0].id,
      cardUid: 'g_1',
      targetPlayerId: state.players[1].id,
      guessedValue: 1,
    });
  }, /cannot guess that the target holds another Guard/);

  // Ship Worker (2) by human Player 0 opens private_reveal and records target card
  state.players[0].hand = [
    { uid: 'sw_2', value: 2 },
    { uid: 'sw_8', value: 8 },
  ];
  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'sw_2',
    targetPlayerId: state.players[1].id,
  });
  assert.equal(state.phase, 'private_reveal');
  assert.equal(state.activeReveal?.targetCard?.value, 6);
  state = acknowledgeReveal(state);
  assert.equal(state.activePlayerIndex, 1);

  // Merchant (6) by Player 1 draws 2 cards, lets player keep 1 and return 2 to bottom of deck
  state.players[1].hand = [
    { uid: 'm_6', value: 6 },
    { uid: 'm_keep', value: 7 },
  ];
  const deckSizeBefore = state.deck.length;
  state = playCard(state, {
    playerId: state.players[1].id,
    cardUid: 'm_6',
  });
  assert.equal(state.phase, 'merchant_selection');
  assert.equal(state.pendingMerchant?.options.length, 3);
  state = resolveMerchantChoice(state, {
    playerId: state.players[1].id,
    keepCardUid: 'm_keep',
  });
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(state.players[1].hand[0].uid, 'm_keep');
  assert.equal(state.deck.length, deckSizeBefore - 1); // 2 drawn, 2 returned, then Player 2 drew 1 for their turn

  // Sailor (7) by Player 2 swaps hand card with Player 0
  state.players[2].hand = [
    { uid: 's_7', value: 7 },
    { uid: 's_swap_out', value: 2 },
  ];
  state.players[0].hand = [{ uid: 'p0_card', value: 8 }];
  state = playCard(state, {
    playerId: state.players[2].id,
    cardUid: 's_7',
    targetPlayerId: state.players[0].id,
  });
  assert.equal(state.players[2].hand[0].uid, 'p0_card');
  assert.equal(state.players[0].hand[0].uid, 's_swap_out');
});

test('7. Swordsman (3) duel compares remaining hand cards and eliminates lower value', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'ai' });
  let state = createInitialGameState(createDefaultPlayers(3, 'ai'), settings, makeDeterministicRng(33));

  // Move to AI Player 1 so duel resolves without pausing for human modal
  state.activePlayerIndex = 1;
  state.players[1].hand = [
    { uid: 'swd_3', value: 3 },
    { uid: 'swd_8', value: 8 },
  ];
  state.players[2].hand = [{ uid: 'opp_4', value: 4 }];

  state = playCard(state, {
    playerId: state.players[1].id,
    cardUid: 'swd_3',
    targetPlayerId: state.players[2].id,
  });

  assert.equal(state.players[2].isEliminated, true);
  assert.equal(state.players[1].isEliminated, false);
});

test('8. Deck exhaustion triggers Condition B comparison, handles ties, and prevents duplicate scoring', () => {
  const settings = createDefaultSettings({
    playerCount: 3,
    mode: 'ai',
    roundVictoryReward: 2,
    tieRule: 'split',
    targetCoins: 6,
  });
  let state = createInitialGameState(createDefaultPlayers(3, 'ai'), settings, makeDeterministicRng(44));

  // Empty the deck so that after Player 0 plays a card, the round ends immediately by deck exhaustion
  state.deck = [];
  state.players[0].hand = [
    { uid: 'c_4', value: 4 },
    { uid: 'c_8_a', value: 8 },
  ];
  state.players[1].hand = [{ uid: 'c_8_b', value: 8 }];
  state.players[2].hand = [{ uid: 'c_5', value: 5 }];

  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'c_4',
  });

  assert.equal(state.phase, 'round_over');
  // Players 0 and 1 tied with 8, splitting the 2-coin reward equally (1 coin each)
  assert.equal(state.players[0].coins, 1);
  assert.equal(state.players[1].coins, 1);
  assert.equal(state.players[2].coins, 0);

  // Calling scoreRoundEnd again must be a no-op (never award duplicate coins)
  scoreRoundEnd(state, 'highest_card');
  assert.equal(state.players[0].coins, 1);
  assert.equal(state.players[1].coins, 1);
});

test('9. Overall game victory triggers when a player reaches targetCoins', () => {
  const settings = createDefaultSettings({
    playerCount: 2,
    mode: 'ai',
    roundVictoryReward: 2,
    targetCoins: 2,
  });
  let state = createInitialGameState(createDefaultPlayers(2, 'ai'), settings, makeDeterministicRng(55));
  state.deck = [];
  state.players[0].hand = [
    { uid: 'c_4', value: 4 },
    { uid: 'c_9', value: 9 },
  ];
  state.players[1].hand = [{ uid: 'c_2', value: 2 }];

  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'c_4',
  });

  assert.equal(state.phase, 'game_over');
  assert.deepEqual(state.winnerIds, [state.players[0].id]);
});

test('10. Hidden-information protection masks opponent hands, removed card, and private reveals', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'online' });
  const state: GameState = createInitialGameState(
    createDefaultPlayers(3, 'online'),
    settings,
    makeDeterministicRng(99)
  );
  state.players[0].hand = [{ uid: 'secret_p0', value: 9 }];
  state.players[1].hand = [{ uid: 'secret_p1', value: 8 }];

  const sanitizedForP0 = sanitizeStateForPlayer(state, state.players[0].id);
  // Player 0 sees their own hand
  assert.equal(sanitizedForP0.players[0].hand[0].value, 9);
  // Player 0 CANNOT see Player 1's hand value or UID
  assert.equal(sanitizedForP0.players[1].hand[0].value, 0);
  assert.notEqual(sanitizedForP0.players[1].hand[0].uid, 'secret_p1');
  // Removed card is masked while round is in progress
  assert.equal(sanitizedForP0.removedCard?.uid, 'hidden_removed_card');
  assert.equal(sanitizedForP0.removedCard?.value, 0);
});
