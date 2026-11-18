import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Flag,
  Plus,
  Trash2,
  Zap,
  Sliders,
  ShieldCheck,
  Wallet,
  Users,
  Server,
} from 'lucide-react';
import {
  BINGO_LETTERS,
  HouseSettings,
  PlayerWallet,
  RoomSummary,
  getBallLetter,
  getColumnRange,
} from '../../shared/bingo';

interface WalletRecord {
  playerId: string;
  name: string;
  wallet: PlayerWallet;
}

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  rooms: RoomSummary[];
  activeStake: number | null;
  calledNumbersByActiveRoom: number[];
  queuedByRoom: Record<number, number[]>;
  wallets: WalletRecord[];
  settings: HouseSettings;
  liveOnlineCount: number;
  onUnlockAdmin: (pin: string) => void;
  onPauseRoom: (stakeBirr: number, paused: boolean) => void;
  onStopRound: (stakeBirr: number) => void;
  onEndRound: (stakeBirr: number) => void;
  onQueueNumbers: (stakeBirr: number, numbers: number[]) => void;
  onCallNow: (stakeBirr: number, num?: number) => void;
  onUpdateSettings: (commissionPercent: number, callIntervalSeconds: number) => void;
  onSetOnlineCount: (count: number | null) => void;
  onAddStake: (stakeBirr: number) => void;
  onRemoveStake: (stakeBirr: number) => void;
  onTopupWallet: (playerId: string, amount: number) => void;
  onOpenHostGuide: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  isAdmin,
  rooms,
  activeStake,
  calledNumbersByActiveRoom,
  queuedByRoom,
  wallets,
  settings,
  liveOnlineCount,
  onUnlockAdmin,
  onPauseRoom,
  onStopRound,
  onEndRound,
  onQueueNumbers,
  onCallNow,
  onUpdateSettings,
  onSetOnlineCount,
  onAddStake,
  onRemoveStake,
  onTopupWallet,
  onOpenHostGuide,
}) => {
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState<'controls' | 'settings' | 'wallets'>('controls');
  const [selectedRoomStake, setSelectedRoomStake] = useState<number>(
    activeStake ?? rooms[0]?.stakeBirr ?? 10
  );
  const [commissionInput, setCommissionInput] = useState(String(settings.commissionPercent));
  const [intervalInput, setIntervalInput] = useState(String(settings.callIntervalSeconds));
  const [onlineInput, setOnlineInput] = useState(
    settings.onlineCountOverride !== null ? String(settings.onlineCountOverride) : String(liveOnlineCount)
  );
  const [newStakeInput, setNewStakeInput] = useState('');
  const [callImmediateMode, setCallImmediateMode] = useState(false);
  const [topupAmount, setTopupAmount] = useState('100');

  useEffect(() => {
    if (activeStake !== null) {
      setSelectedRoomStake(activeStake);
    } else if (rooms.length > 0 && !rooms.some((r) => r.stakeBirr === selectedRoomStake)) {
      setSelectedRoomStake(rooms[0].stakeBirr);
    }
  }, [activeStake, rooms, selectedRoomStake]);

  useEffect(() => {
    setCommissionInput(String(settings.commissionPercent));
    setIntervalInput(String(settings.callIntervalSeconds));
    setOnlineInput(
      settings.onlineCountOverride !== null ? String(settings.onlineCountOverride) : String(liveOnlineCount)
    );
  }, [settings.commissionPercent, settings.callIntervalSeconds, settings.onlineCountOverride, liveOnlineCount]);

  if (!open) return null;

  const targetRoom = rooms.find((r) => r.stakeBirr === selectedRoomStake) || rooms[0];
  const queued = targetRoom ? queuedByRoom[targetRoom.stakeBirr] || [] : [];
  const calledSet = new Set(
    targetRoom && activeStake === targetRoom.stakeBirr ? calledNumbersByActiveRoom : []
  );

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    onUnlockAdmin(pin.trim());
    setPin('');
  };

  const handleNumberTap = (num: number) => {
    if (!targetRoom) return;
    if (calledSet.has(num)) return;

    if (callImmediateMode && targetRoom.phase === 'CALLING') {
      onCallNow(targetRoom.stakeBirr, num);
      return;
    }

    if (queued.includes(num)) {
      onQueueNumbers(
        targetRoom.stakeBirr,
        queued.filter((n) => n !== num)
      );
    } else {
      onQueueNumbers(targetRoom.stakeBirr, [...queued, num]);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(Number(commissionInput), Number(intervalInput));
  };

  const handleSetOnlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(onlineInput);
    if (!Number.isFinite(num) || num < 0) return;
    onSetOnlineCount(Math.round(num));
  };

  const handleAddStakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newStakeInput);
    if (!Number.isFinite(amount) || amount < 1) return;
    onAddStake(Math.round(amount));
    setNewStakeInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto hall-scroll rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11182B] border border-slate-200 dark:border-[#243152] text-slate-900 dark:text-slate-50 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 bg-white/95 dark:bg-[#11182B]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#243152]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-amber-400" />
            <h2 id="admin-modal-title" className="font-display text-lg font-bold">
              Owner Admin Controls
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin panel"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18223C] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin ? (
          <form onSubmit={handlePinSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-amber-400 font-semibold text-sm">
              <Lock className="w-4 h-4" />
              Owner Verification Required
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Admin controls are hidden from regular players. Enter your <code className="font-mono font-bold">ADMIN_PIN</code> to unlock.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Admin PIN"
                autoFocus
                className="flex-1 h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-300 dark:border-[#243152] text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="h-12 px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 cursor-pointer whitespace-nowrap"
              >
                Unlock
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-5">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B1020] rounded-xl border border-slate-200 dark:border-[#243152]">
              <button
                type="button"
                onClick={() => setTab('controls')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'controls'
                    ? 'bg-white dark:bg-[#18223C] text-blue-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Live Game & Balls
              </button>
              <button
                type="button"
                onClick={() => setTab('settings')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'settings'
                    ? 'bg-white dark:bg-[#18223C] text-blue-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Settings & Online
              </button>
              <button
                type="button"
                onClick={() => setTab('wallets')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'wallets'
                    ? 'bg-white dark:bg-[#18223C] text-blue-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Deposits ({wallets.length})
              </button>
            </div>

            {tab === 'controls' && targetRoom && (
              <div className="space-y-5">
                {/* Room Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Target Room:</span>
                  {rooms.map((r) => (
                    <button
                      key={r.stakeBirr}
                      type="button"
                      onClick={() => setSelectedRoomStake(r.stakeBirr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        targetRoom.stakeBirr === r.stakeBirr
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-50 dark:bg-[#18223C] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#243152]'
                      }`}
                    >
                      {r.stakeBirr} Birr ({r.phase})
                    </button>
                  ))}
                </div>

                {/* Pause / Stop / End Round Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onPauseRoom(targetRoom.stakeBirr, !targetRoom.isPaused)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border ${
                      targetRoom.isPaused
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-100 dark:bg-[#18223C] text-slate-900 dark:text-amber-300 border-slate-200 dark:border-[#243152]'
                    }`}
                  >
                    {targetRoom.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {targetRoom.isPaused ? 'Resume Game' : 'Pause Game'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onStopRound(targetRoom.stakeBirr)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#18223C] text-slate-900 dark:text-white border border-slate-200 dark:border-[#243152] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-blue-600 dark:text-amber-400" />
                    Stop & Refund
                  </button>

                  <button
                    type="button"
                    onClick={() => onEndRound(targetRoom.stakeBirr)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-rose-600 text-white border border-rose-500 hover:bg-rose-500 cursor-pointer"
                  >
                    <Flag className="w-4 h-4" />
                    End Round Now
                  </button>
                </div>

                {/* Select Numbers to Be Called Out */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#243152] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-bold">
                        Select Numbers to Call ({targetRoom.stakeBirr} Birr)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Queue as many numbers as you want (1–75) before or during the game.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCallImmediateMode((v) => !v)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          callImmediateMode
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-white dark:bg-[#18223C] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#243152]'
                        }`}
                      >
                        <Zap className="w-3 h-3 inline mr-1" />
                        {callImmediateMode ? 'Tap = Call Now' : 'Tap = Queue Next'}
                      </button>
                      {targetRoom.phase === 'CALLING' && (
                        <button
                          type="button"
                          onClick={() => onCallNow(targetRoom.stakeBirr)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                        >
                          Call Next Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Queued List */}
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-2 rounded-lg bg-white dark:bg-[#11182B] border border-slate-200 dark:border-[#243152]">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">
                      Queue ({queued.length}):
                    </span>
                    {queued.length === 0 ? (
                      <span className="text-[11px] text-slate-400">Random draw (none queued)</span>
                    ) : (
                      <>
                        {queued.map((n, idx) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              onQueueNumbers(
                                targetRoom.stakeBirr,
                                queued.filter((q) => q !== n)
                              )
                            }
                            className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[11px] font-bold cursor-pointer"
                          >
                            {idx + 1}. {getBallLetter(n)}-{n} ×
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => onQueueNumbers(targetRoom.stakeBirr, [])}
                          className="ml-auto text-[11px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>

                  {/* 1-75 Selector Grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {BINGO_LETTERS.map((letter, colIdx) => {
                      const [min] = getColumnRange(colIdx);
                      const nums = Array.from({ length: 15 }, (_, i) => min + i);
                      return (
                        <div key={letter} className="space-y-1">
                          <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 pb-1 border-b border-slate-200 dark:border-[#243152]">
                            {letter}
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {nums.map((n) => {
                              const isCalled = calledSet.has(n);
                              const qIdx = queued.indexOf(n);
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  disabled={isCalled}
                                  onClick={() => handleNumberTap(n)}
                                  className={`h-8 rounded font-mono text-[11px] font-bold tabular-nums cursor-pointer ${
                                    isCalled
                                      ? 'bg-slate-200 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                      : qIdx !== -1
                                        ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                                        : 'bg-white dark:bg-[#18223C] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#243152] hover:border-blue-500'
                                  }`}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === 'settings' && (
              <div className="space-y-5">
                {/* Online Counter Override */}
                <form
                  onSubmit={handleSetOnlineSubmit}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#243152] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-display text-sm font-bold">
                      <Users className="w-4 h-4 text-blue-600 dark:text-amber-400" />
                      Displayed Online Count
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {settings.onlineCountOverride === null ? 'Auto (Live)' : `Custom: ${settings.onlineCountOverride}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={999999}
                      value={onlineInput}
                      onChange={(e) => setOnlineInput(e.target.value)}
                      className="flex-1 h-11 px-3 rounded-xl bg-white dark:bg-[#18223C] border border-slate-200 dark:border-[#243152] font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="h-11 px-4 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 cursor-pointer whitespace-nowrap"
                    >
                      Set Online
                    </button>
                    {settings.onlineCountOverride !== null && (
                      <button
                        type="button"
                        onClick={() => onSetOnlineCount(null)}
                        className="h-11 px-3 rounded-xl bg-slate-200 dark:bg-[#18223C] text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
                      >
                        Reset Live
                      </button>
                    )}
                  </div>
                </form>

                {/* Commission & Interval */}
                <form
                  onSubmit={handleSaveSettings}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#243152] space-y-4"
                >
                  <div className="flex items-center gap-2 font-display text-sm font-bold">
                    <Sliders className="w-4 h-4 text-blue-600 dark:text-amber-400" />
                    House Commission & Calling Speed
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-600 dark:text-slate-300">House Commission (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={commissionInput}
                        onChange={(e) => setCommissionInput(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-white dark:bg-[#18223C] border border-slate-200 dark:border-[#243152] font-mono text-sm focus:outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs text-slate-600 dark:text-slate-300">Call Interval (seconds)</span>
                      <input
                        type="number"
                        step="0.5"
                        min={1.5}
                        max={60}
                        value={intervalInput}
                        onChange={(e) => setIntervalInput(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-white dark:bg-[#18223C] border border-slate-200 dark:border-[#243152] font-mono text-sm focus:outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="h-11 px-5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 cursor-pointer"
                  >
                    Save House Settings
                  </button>
                </form>

                {/* Stake Rooms */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#243152] space-y-4">
                  <div>
                    <h3 className="font-display text-sm font-bold">Entry Screen Stake Options (Birr)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add any custom Birr amount — appears immediately on the Select your stake screen.
                    </p>
                  </div>

                  <form onSubmit={handleAddStakeSubmit} className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={newStakeInput}
                      onChange={(e) => setNewStakeInput(e.target.value)}
                      placeholder="Type amount (e.g. 50)"
                      className="flex-1 h-11 px-3 rounded-xl bg-white dark:bg-[#18223C] border border-slate-200 dark:border-[#243152] font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Add Birr Option
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    {rooms.map((r) => (
                      <div
                        key={r.stakeBirr}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#18223C] border border-slate-200 dark:border-[#243152] text-xs font-mono font-bold"
                      >
                        <span>{r.stakeBirr} Birr</span>
                        {rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveStake(r.stakeBirr)}
                            aria-label={`Remove ${r.stakeBirr} Birr room`}
                            className="text-rose-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hosting / Telegram Bot Guide shortcut inside Admin */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHostGuide();
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Server className="w-4 h-4" />
                  Telegram Webhook & Free Hosting Setup
                </button>
              </div>
            )}

            {tab === 'wallets' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#243152] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-600 dark:text-amber-400" />
                      Player Deposit Top-Up
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Credit deposited Birr to connected players instantly.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Amount:</span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-24 h-9 px-2.5 rounded-lg bg-white dark:bg-[#18223C] border border-slate-200 dark:border-[#243152] font-mono text-xs"
                    />
                  </label>
                </div>

                {wallets.length === 0 ? (
                  <p className="text-xs text-slate-500">No players registered in this session yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-[#243152]">
                    {wallets.map((w) => (
                      <div key={w.playerId} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{w.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                            Dep: {w.wallet.depositedBalance} · Won: {w.wallet.wonBalance} Birr
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const amt = Number(topupAmount);
                            if (Number.isFinite(amt) && amt > 0) {
                              onTopupWallet(w.playerId, Math.round(amt));
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer whitespace-nowrap"
                        >
                          +{topupAmount || 0} Birr
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
