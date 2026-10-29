import React, { useState } from 'react';
import { Bot, Copy, Check, Globe, Play, Plus, Trash2, Users, X } from 'lucide-react';
import { PIRATE_AVATARS } from '../game/cards';
import { AIDifficulty, GameMode, GameSettings, PlayerConfig } from '../game/types';

interface OnlineRoomData {
  code: string;
  hostPlayerId: string;
  players: Array<PlayerConfig & { connected?: boolean }>;
  settings: GameSettings;
}

interface LobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: GameMode;
  onChangeMode: (mode: GameMode) => void;
  players: PlayerConfig[];
  onUpdatePlayers: (players: PlayerConfig[]) => void;
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onStartLocalOrAIGame: () => void;
  // Online multiplayer props
  localPlayerId: string;
  onlineRoom: OnlineRoomData | null;
  onlineError: string | null;
  onCreateOnlineRoom: (name: string, avatar: string) => void;
  onJoinOnlineRoom: (code: string, name: string, avatar: string) => void;
  onAddOnlineBot: (difficulty: AIDifficulty) => void;
  onRemoveOnlinePlayer: (targetId: string) => void;
  onStartOnlineGame: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  onClose,
  mode,
  onChangeMode,
  players,
  onUpdatePlayers,
  settings,
  onUpdateSettings,
  onStartLocalOrAIGame,
  localPlayerId,
  onlineRoom,
  onlineError,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onAddOnlineBot,
  onRemoveOnlinePlayer,
  onStartOnlineGame,
}) => {
  const [onlineName, setOnlineName] = useState('ক্যাপ্টেন রফিক');
  const [onlineAvatar, setOnlineAvatar] = useState(PIRATE_AVATARS[0].emoji);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const lang = settings.language;

  const handlePlayerCountChange = (newCount: number) => {
    const clamped = Math.max(2, Math.min(6, newCount));
    const defaultBnNames = [
      'ক্যাপ্টেন রফিক',
      'জলদস্যু রুস্তম',
      'নাবিক সুলতানা',
      'গোলন্দাজ করিম',
      'গুপ্তচর নাদিয়া',
      'বণিক হাশেম',
    ];
    const next: PlayerConfig[] = [];
    for (let i = 0; i < clamped; i++) {
      if (players[i]) {
        next.push({
          ...players[i],
          isAI: mode === 'ai' ? i > 0 : false,
        });
      } else {
        next.push({
          id: `player_${i + 1}`,
          name: defaultBnNames[i % defaultBnNames.length],
          avatar: PIRATE_AVATARS[i % PIRATE_AVATARS.length].emoji,
          isAI: mode === 'ai' ? i > 0 : false,
          aiDifficulty: 'medium',
        });
      }
    }
    onUpdatePlayers(next);
    onUpdateSettings({ playerCount: clamped });
  };

  const updateSinglePlayer = (index: number, patch: Partial<PlayerConfig>) => {
    const next = [...players];
    next[index] = { ...next[index], ...patch };
    onUpdatePlayers(next);
  };

  const copyRoomCode = () => {
    if (!onlineRoom) return;
    navigator.clipboard?.writeText(onlineRoom.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'bn' ? 'গেম লবি ও প্লেয়ার সেটআপ' : 'Game Lobby & Player Setup'}
    >
      <div className="cabin-wood-panel w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-amber-500/25 bg-[#160e09]">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-300">
              {lang === 'bn' ? '⚓ জাহাজের কেবিন লবি (Game Lobby)' : '⚓ Captain’s Cabin Lobby'}
            </h2>
            <p className="text-sm sm:text-base text-amber-100/80 mt-0.5">
              {lang === 'bn'
                ? 'খেলার মোড, খেলোয়াড় সংখ্যা, নাম, অবতার এবং এআই বুদ্ধিমত্তা নির্ধারণ করুন'
                : 'Configure play mode, number of pirates, names, avatars, and AI difficulty'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lobby"
            className="p-2.5 rounded-xl bg-amber-900/35 hover:bg-amber-700/55 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 py-3.5 bg-[#1b110b] border-b border-amber-500/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1.5 bg-black/45 rounded-xl border border-amber-500/25 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                onChangeMode('ai');
                onUpdatePlayers(
                  players.map((p, idx) => ({ ...p, isAI: idx > 0 }))
                );
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'ai'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-200/80 hover:text-amber-100'
              }`}
            >
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{lang === 'bn' ? 'এআই বনাম একক খেলা' : 'Play vs AI'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeMode('local');
                onUpdatePlayers(
                  players.map((p, idx) => ({
                    ...p,
                    isAI: false,
                    name:
                      idx === 0 && p.name.includes('আপনি')
                        ? 'ক্যাপ্টেন রফিক'
                        : p.name,
                  }))
                );
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'local'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-200/80 hover:text-amber-100'
              }`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{lang === 'bn' ? 'লোকাল মাল্টিপ্লেয়ার (Pass & Play)' : 'Local Pass & Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeMode('online')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'online'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-200/80 hover:text-amber-100'
              }`}
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{lang === 'bn' ? 'অনলাইন রুম (Online)' : 'Online Multiplayer'}</span>
            </button>
          </div>

          {mode !== 'online' && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm sm:text-base font-bold text-amber-200">
                {lang === 'bn' ? 'খেলোয়াড় সংখ্যা:' : 'Players:'}
              </span>
              {[2, 3, 4, 5, 6].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handlePlayerCountChange(cnt)}
                  className={`w-10 h-10 rounded-xl font-mono-num text-sm sm:text-base font-extrabold transition-colors cursor-pointer ${
                    players.length === cnt
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-black/45 border border-amber-500/30 text-amber-200 hover:border-amber-400'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {mode !== 'online' ? (
            <>
              {/* Player Roster Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono-num font-bold text-amber-400">
                        {lang === 'bn' ? `খেলোয়াড় #${idx + 1}` : `Pirate Seat #${idx + 1}`}
                      </span>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => updateSinglePlayer(idx, { isAI: !p.isAI })}
                          className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                            p.isAI
                              ? 'bg-purple-900/65 text-purple-200 border border-purple-400/35'
                              : 'bg-emerald-900/65 text-emerald-200 border border-emerald-400/35'
                          }`}
                        >
                          {p.isAI
                            ? lang === 'bn'
                              ? '🤖 কম্পিউটার (AI)'
                              : '🤖 AI Bot'
                            : lang === 'bn'
                            ? '👤 মানুষ (Human)'
                            : '👤 Human'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Avatar cycle button */}
                      <button
                        type="button"
                        onClick={() => {
                          const curIdx = PIRATE_AVATARS.findIndex((a) => a.emoji === p.avatar);
                          const nextAvatar =
                            PIRATE_AVATARS[(curIdx + 1) % PIRATE_AVATARS.length].emoji;
                          updateSinglePlayer(idx, { avatar: nextAvatar });
                        }}
                        aria-label={`Change avatar for player ${idx + 1}`}
                        className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-2xl hover:border-amber-300 transition-colors shrink-0 cursor-pointer"
                        title={lang === 'bn' ? 'অবতার পরিবর্তন করুন' : 'Click to change avatar'}
                      >
                        {p.avatar}
                      </button>

                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updateSinglePlayer(idx, { name: e.target.value })}
                        aria-label={`Player ${idx + 1} name`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/35 text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {p.isAI && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs sm:text-sm text-amber-200/85 font-semibold">
                          {lang === 'bn' ? 'এআই দক্ষতা (AI Difficulty):' : 'AI Difficulty:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((diff) => (
                            <button
                              key={diff}
                              type="button"
                              onClick={() => updateSinglePlayer(idx, { aiDifficulty: diff })}
                              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold capitalize transition-colors cursor-pointer ${
                                (p.aiDifficulty ?? 'medium') === diff
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-black/55 text-amber-200/75 hover:text-amber-100'
                              }`}
                            >
                              {diff === 'easy'
                                ? lang === 'bn'
                                  ? 'সহজ'
                                  : 'Easy'
                                : diff === 'medium'
                                ? lang === 'bn'
                                  ? 'মাঝারি'
                                  : 'Medium'
                                : lang === 'bn'
                                ? 'কঠিন'
                                : 'Hard'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Match Victory & Reward Summary */}
              <div className="p-4 rounded-xl bg-black/40 border border-amber-500/25 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2.5 text-sm sm:text-base font-semibold text-amber-100">
                    <span>{lang === 'bn' ? 'জয়ের কয়েন লক্ষ্য:' : 'Victory Target:'}</span>
                    <select
                      value={settings.targetCoins}
                      onChange={(e) =>
                        onUpdateSettings({ targetCoins: Number(e.target.value) })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#160e09] border border-amber-500/35 font-mono-num text-sm sm:text-base text-amber-300 font-bold"
                    >
                      {[2, 3, 4, 5, 6, 8, 10].map((v) => (
                        <option key={v} value={v}>
                          {v} {lang === 'bn' ? 'কয়েন' : 'Coins'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2.5 text-sm sm:text-base font-semibold text-amber-100">
                    <span>{lang === 'bn' ? 'রাউন্ড জয়ে পুরস্কার:' : 'Round Win Reward:'}</span>
                    <select
                      value={settings.roundVictoryReward}
                      onChange={(e) =>
                        onUpdateSettings({ roundVictoryReward: Number(e.target.value) })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#160e09] border border-amber-500/35 font-mono-num text-sm sm:text-base text-amber-300 font-bold"
                    >
                      {[1, 2, 3, 4].map((v) => (
                        <option key={v} value={v}>
                          +{v} {lang === 'bn' ? 'কয়েন' : 'Coins'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={onStartLocalOrAIGame}
                  className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{lang === 'bn' ? 'জাহাজে খেলা শুরু করুন!' : 'Set Sail & Start Game!'}</span>
                </button>
              </div>
            </>
          ) : (
            /* Online Multiplayer Room View */
            <div className="space-y-4">
              {onlineError && (
                <div className="p-4 rounded-xl bg-red-950/75 border border-red-500/50 text-sm sm:text-base text-red-200 font-semibold leading-relaxed">
                  ⚠️ {onlineError}
                </div>
              )}

              {!onlineRoom ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Profile setup */}
                  <div className="p-5 rounded-xl bg-black/45 border border-amber-500/25 space-y-4">
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                      {lang === 'bn' ? '১. আপনার জলদস্যু প্রোফাইল' : '1. Your Pirate Identity'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = PIRATE_AVATARS.findIndex((a) => a.emoji === onlineAvatar);
                          setOnlineAvatar(
                            PIRATE_AVATARS[(idx + 1) % PIRATE_AVATARS.length].emoji
                          );
                        }}
                        className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 text-2xl flex items-center justify-center cursor-pointer"
                      >
                        {onlineAvatar}
                      </button>
                      <input
                        type="text"
                        value={onlineName}
                        onChange={(e) => setOnlineName(e.target.value)}
                        placeholder={lang === 'bn' ? 'আপনার নাম...' : 'Your Pirate Name...'}
                        aria-label="Your Online Pirate Name"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/35 text-base font-bold text-amber-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateOnlineRoom(onlineName, onlineAvatar)}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg transition-colors cursor-pointer"
                    >
                      {lang === 'bn' ? 'নতুন অনলাইন রুম তৈরি করুন' : 'Create New Online Room'}
                    </button>
                  </div>

                  {/* Join by Room Code */}
                  <div className="p-5 rounded-xl bg-black/45 border border-amber-500/25 space-y-4">
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                      {lang === 'bn' ? '২. বন্ধুর রুমে যোগ দিন' : '2. Join Friend’s Room by Code'}
                    </h3>
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder={lang === 'bn' ? '৬-অক্ষরের রুম কোড (যেমন AB92CD)' : 'Enter 6-character code'}
                      aria-label="Room Code"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/35 font-mono-num uppercase tracking-widest text-base font-bold text-amber-200"
                    />
                    <button
                      type="button"
                      disabled={joinCode.trim().length < 4}
                      onClick={() => onJoinOnlineRoom(joinCode, onlineName, onlineAvatar)}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-base sm:text-lg transition-colors cursor-pointer"
                    >
                      {lang === 'bn' ? 'রুমে যোগ দিন (Join Room)' : 'Join Room'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Inside Online Room Lobby */
                <div className="p-5 rounded-xl bg-black/45 border border-amber-500/30 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-amber-500/20">
                    <div>
                      <span className="text-sm text-amber-200/80">
                        {lang === 'bn' ? 'রুম কোড (বন্ধুদের শেয়ার করুন):' : 'Room Code (Share with friends):'}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-2xl sm:text-3xl font-mono-num font-extrabold tracking-widest text-amber-300">
                          {onlineRoom.code}
                        </span>
                        <button
                          type="button"
                          onClick={copyRoomCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/45 hover:bg-amber-800/65 text-sm font-bold text-amber-200 cursor-pointer"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {onlineRoom.hostPlayerId === localPlayerId && onlineRoom.players.length < 6 && (
                      <button
                        type="button"
                        onClick={() => onAddOnlineBot('medium')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/55 hover:bg-purple-800/75 border border-purple-400/35 text-sm font-bold text-purple-100 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{lang === 'bn' ? 'এআই বট যোগ করুন' : 'Add AI Bot Seat'}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {onlineRoom.players.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl bg-black/55 border border-amber-500/25 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p.avatar}</span>
                          <div>
                            <div className="text-base font-extrabold text-amber-100 flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.id === onlineRoom.hostPlayerId && (
                                <span className="text-xs text-amber-400 font-mono-num">
                                  [HOST]
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-amber-200/75">
                              {p.isAI
                                ? `AI Bot (${p.aiDifficulty ?? 'medium'})`
                                : p.connected !== false
                                ? lang === 'bn'
                                  ? 'সংযুক্ত (Connected)'
                                  : 'Connected'
                                : 'Reconnecting...'}
                            </div>
                          </div>
                        </div>

                        {onlineRoom.hostPlayerId === localPlayerId &&
                          p.id !== localPlayerId &&
                          idx > 0 && (
                            <button
                              type="button"
                              onClick={() => onRemoveOnlinePlayer(p.id)}
                              aria-label={`Remove ${p.name}`}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-950/60 cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm sm:text-base font-semibold text-amber-200/85">
                      {onlineRoom.players.length} / 6{' '}
                      {lang === 'bn' ? 'জন খেলোয়াড় প্রস্তুত' : 'Pirates Ready'}
                    </span>

                    {onlineRoom.hostPlayerId === localPlayerId ? (
                      <button
                        type="button"
                        disabled={onlineRoom.players.length < 2}
                        onClick={onStartOnlineGame}
                        className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-base sm:text-lg cursor-pointer"
                      >
                        {lang === 'bn' ? 'অনলাইন ম্যাচ শুরু করুন!' : 'Start Online Match!'}
                      </button>
                    ) : (
                      <span className="text-sm sm:text-base text-amber-300 font-bold">
                        {lang === 'bn'
                          ? 'হোস্ট খেলা শুরু করার জন্য অপেক্ষা করা হচ্ছে...'
                          : 'Waiting for the room host to start the match...'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
