export type CardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Language = 'bn' | 'en';

export type GameMode = 'ai' | 'local' | 'online';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type TieRule = 'split' | 'all_full' | 'discard_sum';

export type PickpocketRule = 'next_turn' | 'round_end';

export interface CharacterDefinition {
  value: CardValue;
  bengaliNumber: string;
  id: string;
  nameBn: string;
  nameEn: string;
  shortDescBn: string;
  shortDescEn: string;
  fullDescBn: string;
  fullDescEn: string;
  restrictionBn?: string;
  restrictionEn?: string;
  strategyBn: string;
  strategyEn: string;
  defaultCount: number;
  bannerColor: string;
  badgeColor: string;
  accentHex: string;
  imageUrl: string;
  requiresTarget: boolean;
  requiresGuess: boolean;
  canTargetSelf: boolean;
}

export interface CardInstance {
  uid: string;
  value: CardValue;
}

export interface PlayerConfig {
  id: string;
  name: string;
  avatar: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
}

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  hand: CardInstance[];
  discards: CardInstance[];
  isEliminated: boolean;
  eliminationReasonBn?: string;
  eliminationReasonEn?: string;
  isProtected: boolean;
  pendingPickpocket: boolean;
  coins: number;
  roundCoinsEarned: number;
  /** Memory used by AI to track known opponent cards (playerId -> CardValue) */
  aiKnownCards?: Record<string, CardValue>;
}

export interface DeckConfig {
  counts: Record<CardValue, number>;
}

export interface GameSettings {
  mode: GameMode;
  playerCount: number;
  targetCoins: number;
  maxRounds: number;
  roundVictoryReward: number;
  tieRule: TieRule;
  pickpocketRule: PickpocketRule;
  allowCannonSelfTarget: boolean;
  deckCounts: Record<CardValue, number>;
  language: Language;
  soundEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
}

export interface PendingMerchantChoice {
  playerId: string;
  options: CardInstance[]; // Up to 3 cards (1 from hand + up to 2 drawn)
}

export interface PrivateRevealEvent {
  id: string;
  type: 'ship_worker' | 'swordsman_duel' | 'guard_guess' | 'cannon_blast' | 'sailor_swap';
  actorId: string;
  targetId: string;
  actorCard?: CardInstance;
  targetCard?: CardInstance;
  guessedValue?: CardValue;
  success?: boolean;
  eliminatedPlayerId?: string;
  messageBn: string;
  messageEn: string;
  /** Which players are allowed to see the secret card(s) in this reveal */
  visibleToPlayerIds: string[];
}

export interface GameLogEntry {
  id: string;
  round: number;
  turn: number;
  timestamp: number;
  actorId?: string;
  targetId?: string;
  cardValue?: CardValue;
  type:
    | 'round_start'
    | 'draw'
    | 'play_card'
    | 'ability_effect'
    | 'pickpocket_steal'
    | 'pickpocket_cancel'
    | 'elimination'
    | 'round_end'
    | 'game_end';
  textBn: string;
  textEn: string;
}

export interface RoundWinnerRecord {
  round: number;
  winnerIds: string[];
  winnerNames: string[];
  reason: 'last_standing' | 'highest_card';
  coinsAwarded: Record<string, number>;
  revealedHands: Array<{
    playerId: string;
    playerName: string;
    card?: CardInstance;
    isEliminated: boolean;
  }>;
  removedCard: CardInstance | null;
}

export type TurnPhase =
  | 'waiting_for_privacy' // Local multiplayer pass-the-device screen
  | 'choosing_action'     // Active player holds 2 cards and must play 1
  | 'merchant_selection'  // Active player played Merchant (6) and chooses 1 of up to 3 cards
  | 'private_reveal'      // Ship Worker / Duel modal waiting for acknowledgment
  | 'round_over'          // Round finished, showing summary
  | 'game_over';          // Overall match finished

export interface GameState {
  matchId: string;
  settings: GameSettings;
  round: number;
  turnNumber: number;
  phase: TurnPhase;
  players: PlayerState[];
  activePlayerIndex: number;
  deck: CardInstance[];
  removedCard: CardInstance | null;
  publicDiscardPile: Array<{
    card: CardInstance;
    playerId: string;
    turn: number;
  }>;
  pendingPickpocketPlayerId: string | null;
  pendingMerchant: PendingMerchantChoice | null;
  activeReveal: PrivateRevealEvent | null;
  lastAnimationEvent?: {
    id: string;
    type: 'card_play' | 'cannon' | 'duel' | 'guard' | 'spy' | 'coin' | 'pirate_self_destruct' | 'swap';
    actorId: string;
    targetId?: string;
    cardValue?: CardValue;
    success?: boolean;
  };
  roundHistory: RoundWinnerRecord[];
  roundScored: boolean; // Ensures coins are never awarded twice for the same round
  winnerIds: string[];
  logs: GameLogEntry[];
}

export interface PlayCardAction {
  playerId: string;
  cardUid: string;
  targetPlayerId?: string;
  guessedValue?: CardValue;
}

export interface ResolveMerchantAction {
  playerId: string;
  keepCardUid: string;
  /** Optional explicit order for the remaining cards placed at bottom of deck */
  bottomOrderUids?: string[];
}
