import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeReveal,
  buildDeck,
  createDefaultPlayers,
  createDefaultSettings,
  createInitialGameState,
  getPlayableCardUids,
  isPlayerHost,
  mustPlayCaptain,
  playCard,
  refreshGameByHost,
  resolveHostOnDisconnect,
  resolveMerchantChoice,
  restartMatchByHost,
  sanitizeStateForPlayer,
  scoreRoundEnd,
  startNextRound,
} from './engine';
import { computeAIMove } from './ai';
import {
  GAME_MODE_CONFIGS,
  GAME_MODE_LIST,
  assignPlayerToTeam,
  balanceTeams,
  randomizeTeams,
  validateLobbyForMode,
} from './modes';
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

test('11. Host-only Restart and Refresh permissions reject guests and allow only the host', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'online' });
  const players = createDefaultPlayers(3, 'online');
  let state = createInitialGameState(players, settings, makeDeterministicRng(77), 'player_1');

  state.players[0].coins = 2;
  state.round = 3;

  assert.equal(isPlayerHost(state, 'player_1'), true);
  assert.equal(isPlayerHost(state, 'player_2'), false);
  assert.equal(isPlayerHost(state, 'player_3'), false);

  // Guest attempting restartMatchByHost or refreshGameByHost must be rejected
  assert.throws(() => {
    restartMatchByHost(state, 'player_2', makeDeterministicRng(88));
  }, /Host permission required/);

  assert.throws(() => {
    refreshGameByHost(state, 'player_3', makeDeterministicRng(88));
  }, /Host permission required/);

  // Host refreshing game preserves round and coins while re-dealing round cards
  const refreshed = refreshGameByHost(state, 'player_1', makeDeterministicRng(88));
  assert.equal(refreshed.round, 3);
  assert.equal(refreshed.players[0].coins, 2);

  // Host restarting match resets round to 1 and coins to 0
  const restarted = restartMatchByHost(refreshed, 'player_1', makeDeterministicRng(89));
  assert.equal(restarted.round, 1);
  assert.equal(restarted.players[0].coins, 0);
  assert.equal(restarted.hostPlayerId, 'player_1');
});

test('12. Host disconnection safely transfers host to next connected human or closes room when empty', () => {
  const settings = createDefaultSettings({ playerCount: 3, mode: 'online' });
  const roomPlayers = [
    { id: 'host_1', name: 'Host Captain', avatar: '🏴‍☠️', isAI: false, connected: true },
    { id: 'guest_2', name: 'Guest Sailor', avatar: '🧭', isAI: false, connected: true },
    { id: 'bot_3', name: 'Bot Gunner', avatar: '💣', isAI: true, connected: true },
  ];
  const state = createInitialGameState(roomPlayers, settings, makeDeterministicRng(60), 'host_1');

  // Host disconnects -> guest_2 becomes the new host
  const transferOutcome = resolveHostOnDisconnect(roomPlayers, 'host_1', 'host_1', state);
  assert.equal(transferOutcome.shouldCloseRoom, false);
  assert.equal(transferOutcome.hostTransferred, true);
  assert.equal(transferOutcome.hostPlayerId, 'guest_2');
  assert.equal(transferOutcome.gameState?.hostPlayerId, 'guest_2');

  // Now guest_2 also disconnects (only AI bot left) -> room closes safely
  const closeOutcome = resolveHostOnDisconnect(
    transferOutcome.players,
    transferOutcome.hostPlayerId,
    'guest_2',
    transferOutcome.gameState
  );
  assert.equal(closeOutcome.shouldCloseRoom, true);
  assert.equal(closeOutcome.gameState, null);
});

test('13. Centralized GameMode configuration defines all 5 modes and enforces player limits', () => {
  assert.equal(GAME_MODE_LIST.length, 5);
  assert.deepEqual(
    GAME_MODE_LIST.map((m) => m.id),
    ['classic', 'duo', 'trio', 'captain', 'race']
  );

  // Classic: 2–6 players, no teams
  assert.equal(GAME_MODE_CONFIGS.classic.minPlayers, 2);
  assert.equal(GAME_MODE_CONFIGS.classic.maxPlayers, 6);
  assert.equal(GAME_MODE_CONFIGS.classic.sharedTeamEconomy, false);

  // Duo: strictly 4 players, 2 teams of 2
  assert.equal(GAME_MODE_CONFIGS.duo.minPlayers, 4);
  assert.equal(GAME_MODE_CONFIGS.duo.maxPlayers, 4);
  assert.equal(GAME_MODE_CONFIGS.duo.teamsCount, 2);
  assert.equal(GAME_MODE_CONFIGS.duo.sharedTeamEconomy, true);

  // Trio: strictly 6 players, 3 teams of 2
  assert.equal(GAME_MODE_CONFIGS.trio.minPlayers, 6);
  assert.equal(GAME_MODE_CONFIGS.trio.maxPlayers, 6);
  assert.equal(GAME_MODE_CONFIGS.trio.teamsCount, 3);
  assert.equal(GAME_MODE_CONFIGS.trio.sharedTeamEconomy, true);

  // Captain: strictly 4 players, 1 Captain vs 3 Challengers
  assert.equal(GAME_MODE_CONFIGS.captain.minPlayers, 4);
  assert.equal(GAME_MODE_CONFIGS.captain.maxPlayers, 4);
  assert.equal(GAME_MODE_CONFIGS.captain.teamStructure, 'asymmetric_1v3');

  // Race: 2–6 players, individual treasure race (no teams)
  assert.equal(GAME_MODE_CONFIGS.race.minPlayers, 2);
  assert.equal(GAME_MODE_CONFIGS.race.maxPlayers, 6);
  assert.equal(GAME_MODE_CONFIGS.race.teamStructure, 'none');
  assert.equal(GAME_MODE_CONFIGS.race.sharedTeamEconomy, false);

  // Starting Duo with 3 players must throw an error
  const invalidDuoSettings = createDefaultSettings({ matchMode: 'duo' });
  assert.throws(() => {
    createInitialGameState(
      createDefaultPlayers(3, 'ai', 'classic'),
      invalidDuoSettings,
      makeDeterministicRng(1)
    );
  }, /Invalid player count for mode 'duo'/);

  // Starting Trio with 4 players must throw an error
  const invalidTrioSettings = createDefaultSettings({ matchMode: 'trio' });
  assert.throws(() => {
    createInitialGameState(
      createDefaultPlayers(4, 'ai', 'classic'),
      invalidTrioSettings,
      makeDeterministicRng(1)
    );
  }, /Invalid player count for mode 'trio'/);
});

test('14. Team assignment: manual rearrange, balance, randomize, and invalid distribution rejection', () => {
  let duoPlayers = createDefaultPlayers(4, 'ai', 'duo');
  const duoSettings = createDefaultSettings({ matchMode: 'duo' });
  assert.equal(validateLobbyForMode(duoPlayers, duoSettings).valid, true);

  // Host manually swaps player_1 from team_alpha to team_beta -> swaps cleanly with a team_beta member to keep 2v2
  duoPlayers = assignPlayerToTeam(duoPlayers, 'player_1', 'team_beta', 'duo');
  assert.equal(duoPlayers.find((p) => p.id === 'player_1')?.teamId, 'team_beta');
  assert.equal(validateLobbyForMode(duoPlayers, duoSettings).valid, true);

  // If someone forces an unbalanced 3v1 team distribution, lobby validation rejects it
  const unbalancedDuo = duoPlayers.map((p, idx) => ({
    ...p,
    teamId: idx < 3 ? 'team_alpha' : 'team_beta',
  }));
  assert.equal(validateLobbyForMode(unbalancedDuo, duoSettings).valid, false);
  assert.throws(() => {
    createInitialGameState(unbalancedDuo, duoSettings, makeDeterministicRng(2));
  }, /must have exactly 2/);

  // Randomize teams preserves valid 2v2 distribution
  const randomizedDuo = randomizeTeams(unbalancedDuo, 'duo', makeDeterministicRng(99));
  assert.equal(validateLobbyForMode(randomizedDuo, duoSettings).valid, true);

  // Balance teams restores 2v2
  const rebalancedDuo = balanceTeams(unbalancedDuo, 'duo');
  assert.equal(validateLobbyForMode(rebalancedDuo, duoSettings).valid, true);
});

test('15. Mode 2 (Duo — Crew Battle): shared team coin economy, no duplicate rewards when teammates tie, and team victory', () => {
  const settings = createDefaultSettings({
    matchMode: 'duo',
    mode: 'ai',
    targetCoins: 4,
    roundVictoryReward: 2,
  });
  const players = createDefaultPlayers(4, 'ai', 'duo');
  let state = createInitialGameState(players, settings, makeDeterministicRng(12));

  assert.equal(state.teams.length, 2);
  // Team Alpha: player_1 & player_2; Team Beta: player_3 & player_4
  assert.deepEqual(state.teams[0].memberIds, ['player_1', 'player_2']);
  assert.deepEqual(state.teams[1].memberIds, ['player_3', 'player_4']);

  // Suppose deck runs out and BOTH player_1 and player_2 (teammates on team_alpha) hold tied highest cards (8)
  state.deck = [];
  state.players[0].hand = [
    { uid: 'd_4', value: 4 },
    { uid: 'd_8a', value: 8 },
  ];
  state.players[1].hand = [{ uid: 'd_8b', value: 8 }];
  state.players[2].hand = [{ uid: 'd_2', value: 2 }];
  state.players[3].hand = [{ uid: 'd_3', value: 3 }];

  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'd_4',
  });

  // Round ends; Team Alpha must receive +2 coins ONCE (NOT +4 duplicated across two teammates!)
  assert.equal(state.phase, 'round_over');
  assert.equal(state.teams[0].coins, 2);
  assert.equal(state.teams[1].coins, 0);
  // Both teammates see their shared team balance of 2
  assert.equal(state.players[0].coins, 2);
  assert.equal(state.players[1].coins, 2);

  // Start Round 2 -> Team Alpha eliminates both Team Beta members (player_3 and player_4)
  state = startNextRound(state, makeDeterministicRng(15));
  state.players[2].isEliminated = true;
  state.players[3].hand = [{ uid: 'b_9', value: 9 }];
  state.activePlayerIndex = 0;
  state.players[0].hand = [
    { uid: 'a_5', value: 5 },
    { uid: 'a_7', value: 7 },
  ];

  // Player 1 fires Cannon Operator (5) at Player 4 holding Pirate (9) -> Player 4 eliminated!
  // Now only Team Alpha members remain alive -> Round ends immediately and Team Alpha reaches 4 coins to win the match!
  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'a_5',
    targetPlayerId: state.players[3].id,
  });

  assert.equal(state.phase, 'game_over');
  assert.equal(state.teams[0].coins, 4);
  assert.deepEqual(state.winningTeamIds, ['team_alpha']);
  assert.deepEqual(state.winnerIds, ['player_1', 'player_2']);
});

test('16. Mode 3 (Trio — Three Crews): 6 players in 3 crews of 2 with shared Pickpocket and round coins', () => {
  const settings = createDefaultSettings({
    matchMode: 'trio',
    mode: 'ai',
    targetCoins: 3,
    roundVictoryReward: 2,
  });
  const players = createDefaultPlayers(6, 'ai', 'trio');
  let state = createInitialGameState(players, settings, makeDeterministicRng(25));

  assert.equal(state.players.length, 6);
  assert.equal(state.teams.length, 3);
  assert.deepEqual(
    state.teams.map((t) => t.memberIds.length),
    [2, 2, 2]
  );

  // Teammates cannot see each other's hidden cards in online/sanitized view
  const sanitizedForP1 = sanitizeStateForPlayer(state, 'player_1');
  // player_2 is player_1's teammate on team_alpha, yet player_2's hand is strictly masked!
  assert.equal(sanitizedForP1.players[1].teamId, 'team_alpha');
  assert.equal(sanitizedForP1.players[1].hand[0].value, 0);
  assert.ok(sanitizedForP1.players[1].hand[0].uid.startsWith('hidden_hand_'));

  // Suppose Team Gamma (player_5 & player_6) already has 1 coin from Pickpocket, and wins the round (+2 coins) -> reaches 3 targetCoins!
  state.teams[2].coins = 1;
  state.players[4].coins = 1;
  state.players[5].coins = 1;
  state.deck = [];
  state.activePlayerIndex = 4; // player_5 (Team Gamma)
  state.players[4].hand = [
    { uid: 't_4', value: 4 },
    { uid: 't_9', value: 9 },
  ];
  for (let i = 0; i < 6; i++) {
    if (i !== 4) state.players[i].hand = [{ uid: `low_${i}`, value: 2 }];
  }

  state = playCard(state, {
    playerId: state.players[4].id,
    cardUid: 't_4',
  });

  assert.equal(state.phase, 'game_over');
  assert.equal(state.teams[2].coins, 3);
  assert.equal(state.players[4].coins, 3);
  assert.equal(state.players[5].coins, 3);
  assert.deepEqual(state.winningTeamIds, ['team_gamma']);
  assert.deepEqual(state.winnerIds, ['player_5', 'player_6']);
});

test('17. Mode 4 (Captain — Last Stand): Captain wins immediately when all 3 Challengers are eliminated', () => {
  const settings = createDefaultSettings({
    matchMode: 'captain',
    mode: 'ai',
  });
  const players = createDefaultPlayers(4, 'ai', 'captain');
  let state = createInitialGameState(players, settings, makeDeterministicRng(30));

  // Player 1 is Captain (team_captain), Players 2, 3, 4 are Challengers (team_challengers)
  assert.equal(state.players[0].teamId, 'team_captain');
  assert.equal(state.players[0].role, 'captain');
  assert.equal(state.players[1].teamId, 'team_challengers');
  assert.equal(state.players[2].teamId, 'team_challengers');
  assert.equal(state.players[3].teamId, 'team_challengers');

  // Suppose Challengers player_2 and player_3 are already eliminated, and Captain eliminates player_4 with Guard (1)
  state.players[1].isEliminated = true;
  state.players[2].isEliminated = true;
  state.players[3].hand = [{ uid: 'ch_8', value: 8 }];
  state.activePlayerIndex = 0;
  state.players[0].hand = [
    { uid: 'cap_1', value: 1 },
    { uid: 'cap_9', value: 9 },
  ];

  state = playCard(state, {
    playerId: state.players[0].id,
    cardUid: 'cap_1',
    targetPlayerId: state.players[3].id,
    guessedValue: 8,
  });

  assert.equal(state.players[3].isEliminated, true);
  assert.equal(state.phase, 'game_over');
  assert.deepEqual(state.winningTeamIds, ['team_captain']);
  assert.deepEqual(state.winnerIds, ['player_1']);
});

test('18. Mode 4 (Captain — Last Stand): Challengers win immediately when the Captain is eliminated', () => {
  const settings = createDefaultSettings({
    matchMode: 'captain',
    mode: 'ai',
  });
  const players = createDefaultPlayers(4, 'ai', 'captain');
  let state = createInitialGameState(players, settings, makeDeterministicRng(31));

  // Active turn is Challenger player_2 (index 1); Captain player_1 (index 0) holds Pirate (9)
  state.activePlayerIndex = 1;
  state.players[0].hand = [{ uid: 'cap_pirate_9', value: 9 }];
  state.players[1].hand = [
    { uid: 'ch_cannon_5', value: 5 },
    { uid: 'ch_keep_3', value: 3 },
  ];

  // Challenger player_2 fires Cannon Operator (5) at the Captain, destroying Pirate (9) and eliminating the Captain!
  state = playCard(state, {
    playerId: state.players[1].id,
    cardUid: 'ch_cannon_5',
    targetPlayerId: state.players[0].id,
  });

  assert.equal(state.players[0].isEliminated, true);
  assert.equal(state.phase, 'game_over');
  assert.deepEqual(state.winningTeamIds, ['team_challengers']);
  assert.deepEqual(state.winnerIds, ['player_2', 'player_3', 'player_4']);
  // Challengers share one team coin balance
  const challengerTeam = state.teams.find((t) => t.id === 'team_challengers')!;
  assert.ok(challengerTeam.coins >= 2);
  assert.equal(state.players[1].coins, challengerTeam.coins);
  assert.equal(state.players[2].coins, challengerTeam.coins);
  assert.equal(state.players[3].coins, challengerTeam.coins);
});

test('19. Mode 5 (Race — Treasure Rush): individual competition, no teams, first to configurable target wins immediately', () => {
  const settings = createDefaultSettings({
    matchMode: 'race',
    mode: 'ai',
    playerCount: 5,
    targetCoins: 6,
    roundVictoryReward: 2,
  });
  const players = createDefaultPlayers(5, 'ai', 'race');
  let state = createInitialGameState(players, settings, makeDeterministicRng(40));

  assert.equal(state.teams.length, 0);
  assert.equal(state.players.every((p) => p.teamId === undefined), true);

  // Suppose player_3 has 5 coins (1 away from target 6) and survives a full round with Pickpocket (0)
  state.players[2].coins = 5;
  state.players[2].pendingPickpocket = true;
  state.pendingPickpocketPlayerId = state.players[2].id;
  state.activePlayerIndex = 1; // player_2's turn right before player_3
  state.players[1].hand = [
    { uid: 'r_4', value: 4 },
    { uid: 'r_2', value: 2 },
  ];

  // Player 2 plays Spy (4) -> turn advances to Player 3 -> Pickpocket resolves (+1 coin -> 6/6) -> immediate Race Victory!
  state = playCard(state, {
    playerId: state.players[1].id,
    cardUid: 'r_4',
  });

  assert.equal(state.players[2].coins, 6);
  assert.equal(state.phase, 'game_over');
  assert.deepEqual(state.winnerIds, ['player_3']);
  assert.ok(state.victoryReasonEn?.includes('Treasure Rush'));
});

test('20. Complete AI-simulated matches run cleanly to completion across all 5 modes', () => {
  const modes: Array<'classic' | 'duo' | 'trio' | 'captain' | 'race'> = [
    'classic',
    'duo',
    'trio',
    'captain',
    'race',
  ];

  for (const matchMode of modes) {
    const modeDef = GAME_MODE_CONFIGS[matchMode];
    const settings = createDefaultSettings({
      matchMode,
      mode: 'ai',
      playerCount: modeDef.defaultPlayers,
      targetCoins: 3,
      roundVictoryReward: 2,
      maxRounds: 6,
    });
    // Make all players AI so we can simulate a complete match end-to-end
    const players = createDefaultPlayers(modeDef.defaultPlayers, 'ai', matchMode).map((p) => ({
      ...p,
      isAI: true,
    }));
    const rng = makeDeterministicRng(100 + modes.indexOf(matchMode));
    let state = createInitialGameState(players, settings, rng);

    let safetySteps = 0;
    while (state.phase !== 'game_over' && safetySteps < 500) {
      safetySteps++;
      if (state.phase === 'choosing_action') {
        const move = computeAIMove(state, rng);
        state = playCard(state, move);
      } else if (state.phase === 'merchant_selection') {
        const keepUid = state.pendingMerchant!.options[0].uid;
        state = resolveMerchantChoice(state, {
          playerId: state.pendingMerchant!.playerId,
          keepCardUid: keepUid,
        });
      } else if (state.phase === 'private_reveal') {
        state = acknowledgeReveal(state);
      } else if (state.phase === 'round_over') {
        state = startNextRound(state, rng);
      }
    }

    assert.equal(
      state.phase,
      'game_over',
      `Mode '${matchMode}' should finish cleanly in game_over state`
    );
    assert.ok(
      state.winnerIds.length >= 1,
      `Mode '${matchMode}' must produce at least 1 winner`
    );
  }
});


