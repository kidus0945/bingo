import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PRESET_BANKS,
  type AppLanguage,
  type PlayerWallet,
  type PresetBankKey,
  type RoundWinner,
} from './shared/bingo.ts';

export interface PaymentButtonRecord {
  id: string;
  flow_type: 'deposit' | 'withdraw';
  bank_key: PresetBankKey;
  label: string;
  response_text: string;
  sort_order: number;
  is_active: boolean;
}

export interface BotAppConfig {
  adminGroupId: string;
  depositIntroText: string;
  withdrawIntroText: string;
  withdrawPromptText: string;
  commissionPercent: number;
  callIntervalMs: number;
  adminPin: string;
}

export interface BotSessionRecord {
  telegram_user_id: string;
  language: AppLanguage;
  pending_action: 'awaiting_deposit_proof' | 'awaiting_withdraw_info' | null;
  selected_button_id: string | null;
  selected_button_label: string | null;
  selected_bank_key: PresetBankKey | null;
}

export interface TransactionRecord {
  id: string;
  player_id: string;
  player_name: string;
  player_username: string | null;
  tx_type: 'deposit' | 'withdraw';
  bank_key: string | null;
  button_id: string | null;
  button_label: string | null;
  user_message: string | null;
  user_photo_file_id: string | null;
  amount_birr: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'done' | 'incorrect';
  resolved_by: string | null;
  admin_group_id: string | null;
  admin_group_message_id: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface StoredPlayerRow {
  id: string;
  name: string;
  username: string | null;
  language: AppLanguage;
  deposited_birr: number;
  won_birr: number;
  updated_at: string;
}

function buildDefaultPresetButtons(): PaymentButtonRecord[] {
  const rows: PaymentButtonRecord[] = [];
  for (const b of PRESET_BANKS) {
    rows.push({
      id: `preset_dep_${b.key}`,
      flow_type: 'deposit',
      bank_key: b.key,
      label: b.names.en,
      response_text: `Send your deposit via ${b.names.en}, then reply here with a screenshot or confirmation message.`,
      sort_order: b.sortOrder,
      is_active: true,
    });
  }
  for (const b of PRESET_BANKS) {
    rows.push({
      id: `preset_wd_${b.key}`,
      flow_type: 'withdraw',
      bank_key: b.key,
      label: b.names.en,
      response_text: '',
      sort_order: b.sortOrder,
      is_active: true,
    });
  }
  return rows;
}

class SupabaseStore {
  private client: SupabaseClient | null = null;
  public readonly isEnabled: boolean = false;

  private memConfig: BotAppConfig = {
    adminGroupId: (process.env.ADMIN_GROUP_ID || '').trim(),
    depositIntroText: 'Choose a bank or wallet below to deposit:',
    withdrawIntroText: 'Choose your withdrawal bank or wallet below:',
    withdrawPromptText: 'Send your full name, account number, and the Birr amount you want to withdraw:',
    commissionPercent: Math.min(80, Math.max(0, Number(process.env.COMMISSION_PERCENT) || 20)),
    callIntervalMs: Math.max(1500, Math.round((Number(process.env.CALL_INTERVAL_SECONDS) || 3.5) * 1000)),
    adminPin: (process.env.ADMIN_PIN || '1234').trim(),
  };

  private memButtons: PaymentButtonRecord[] = buildDefaultPresetButtons();
  private memSessions = new Map<string, BotSessionRecord>();
  private memTransactions = new Map<string, TransactionRecord>();

  constructor() {
    const url = (process.env.SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (url && key) {
      this.client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.isEnabled = true;
      console.log('[Supabase] Connected via HTTPS API.');
    } else {
      console.log(
        '[Supabase] Not configured yet (running with in-memory fallback until SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY are set).'
      );
    }
  }

  public async loadInitialSnapshot(): Promise<{
    config: BotAppConfig;
    players: StoredPlayerRow[];
    recentRounds: Array<{ winners: RoundWinner[]; ended_at: string }>;
  }> {
    if (!this.client) {
      return { config: { ...this.memConfig }, players: [], recentRounds: [] };
    }
    try {
      const [settingsRes, playersRes, roundsRes] = await Promise.all([
        this.client.from('app_settings').select('*').eq('id', 1).maybeSingle(),
        this.client.from('players').select('id, name, username, language, deposited_birr, won_birr, updated_at').limit(1000),
        this.client.from('rounds').select('winners, ended_at').order('ended_at', { ascending: false }).limit(30),
      ]);

      if (settingsRes.data) {
        const s = settingsRes.data;
        const envGroup = (process.env.ADMIN_GROUP_ID || '').trim();
        this.memConfig = {
          adminGroupId: String(s.admin_group_id || envGroup || '').trim(),
          depositIntroText: String(s.deposit_intro_text || this.memConfig.depositIntroText),
          withdrawIntroText: String(s.withdraw_intro_text || this.memConfig.withdrawIntroText),
          withdrawPromptText: String(s.withdraw_prompt_text || this.memConfig.withdrawPromptText),
          commissionPercent: Number.isFinite(Number(s.commission_percent))
            ? Number(s.commission_percent)
            : this.memConfig.commissionPercent,
          callIntervalMs: Number.isFinite(Number(s.call_interval_ms))
            ? Number(s.call_interval_ms)
            : this.memConfig.callIntervalMs,
          adminPin: String(s.admin_pin || this.memConfig.adminPin),
        };
      }

      const players: StoredPlayerRow[] = (playersRes.data || []).map((p) => ({
        id: String(p.id),
        name: String(p.name || 'Player'),
        username: p.username ? String(p.username) : null,
        language: p.language === 'am' || p.language === 'om' ? p.language : 'en',
        deposited_birr: Number(p.deposited_birr) || 0,
        won_birr: Number(p.won_birr) || 0,
        updated_at: String(p.updated_at || new Date().toISOString()),
      }));

      const recentRounds = (roundsRes.data || []).map((r) => ({
        winners: Array.isArray(r.winners) ? (r.winners as RoundWinner[]) : [],
        ended_at: String(r.ended_at),
      }));

      return { config: { ...this.memConfig }, players, recentRounds };
    } catch (err) {
      console.error('[Supabase] Initial load error:', err);
      return { config: { ...this.memConfig }, players: [], recentRounds: [] };
    }
  }

  public async getBotConfigAndButtons(): Promise<{
    config: BotAppConfig;
    buttons: PaymentButtonRecord[];
  }> {
    if (!this.client) {
      return {
        config: { ...this.memConfig },
        buttons: this.memButtons.filter((b) => b.is_active),
      };
    }

    try {
      const [settingsRes, buttonsRes] = await Promise.all([
        this.client.from('app_settings').select('*').eq('id', 1).maybeSingle(),
        this.client
          .from('payment_buttons')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (settingsRes.data) {
        const s = settingsRes.data;
        const envGroup = (process.env.ADMIN_GROUP_ID || '').trim();
        this.memConfig = {
          adminGroupId: String(s.admin_group_id || envGroup || '').trim(),
          depositIntroText: String(s.deposit_intro_text || this.memConfig.depositIntroText),
          withdrawIntroText: String(s.withdraw_intro_text || this.memConfig.withdrawIntroText),
          withdrawPromptText: String(s.withdraw_prompt_text || this.memConfig.withdrawPromptText),
          commissionPercent: Number(s.commission_percent ?? this.memConfig.commissionPercent),
          callIntervalMs: Number(s.call_interval_ms ?? this.memConfig.callIntervalMs),
          adminPin: String(s.admin_pin || this.memConfig.adminPin),
        };
      }

      const rawButtons = buttonsRes.data || [];
      const buttons: PaymentButtonRecord[] = [];
      for (const b of rawButtons) {
        const bankKey = b.bank_key as PresetBankKey;
        if (!bankKey || !PRESET_BANKS.some((p) => p.key === bankKey)) continue;
        buttons.push({
          id: String(b.id),
          flow_type: b.flow_type === 'withdraw' ? 'withdraw' : 'deposit',
          bank_key: bankKey,
          label: String(b.label),
          response_text: String(b.response_text || ''),
          sort_order: Number(b.sort_order) || 0,
          is_active: Boolean(b.is_active),
        });
      }

      if (buttons.length === 0) {
        return { config: { ...this.memConfig }, buttons: this.memButtons.filter((b) => b.is_active) };
      }

      return { config: { ...this.memConfig }, buttons };
    } catch (err) {
      console.error('[Supabase] getBotConfigAndButtons error:', err);
      return {
        config: { ...this.memConfig },
        buttons: this.memButtons.filter((b) => b.is_active),
      };
    }
  }

  public async setAdminGroupId(groupId: string) {
    this.memConfig.adminGroupId = groupId;
    if (!this.client) return;
    try {
      await this.client
        .from('app_settings')
        .update({ admin_group_id: groupId, updated_at: new Date().toISOString() })
        .eq('id', 1);
    } catch (err) {
      console.error('[Supabase] setAdminGroupId error:', err);
    }
  }

  public async updateHouseSettings(commissionPercent: number, callIntervalSeconds: number) {
    this.memConfig.commissionPercent = commissionPercent;
    this.memConfig.callIntervalMs = Math.round(callIntervalSeconds * 1000);
    if (!this.client) return;
    try {
      await this.client
        .from('app_settings')
        .update({
          commission_percent: commissionPercent,
          call_interval_ms: Math.round(callIntervalSeconds * 1000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    } catch (err) {
      console.error('[Supabase] updateHouseSettings error:', err);
    }
  }

  public async upsertPlayer(
    playerId: string,
    name: string,
    wallet: PlayerWallet,
    language?: AppLanguage,
    username?: string
  ) {
    if (!this.client) return;
    try {
      const payload: Record<string, unknown> = {
        id: playerId,
        name: name.slice(0, 64),
        deposited_birr: wallet.depositedBalance,
        won_birr: wallet.wonBalance,
        updated_at: new Date().toISOString(),
      };
      if (language) payload.language = language;
      if (username !== undefined) payload.username = username || null;
      await this.client.from('players').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.error('[Supabase] upsertPlayer error:', err);
    }
  }

  public async setPlayerLanguage(playerId: string, language: AppLanguage) {
    if (!this.client) return;
    try {
      await this.client
        .from('players')
        .update({ language, updated_at: new Date().toISOString() })
        .eq('id', playerId);
    } catch (err) {
      console.error('[Supabase] setPlayerLanguage error:', err);
    }
  }

  public async fetchRecentlyUpdatedPlayers(sinceIso: string): Promise<StoredPlayerRow[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('players')
        .select('id, name, username, language, deposited_birr, won_birr, updated_at')
        .gt('updated_at', sinceIso)
        .limit(100);
      if (error || !data) return [];
      return data.map((p) => ({
        id: String(p.id),
        name: String(p.name || 'Player'),
        username: p.username ? String(p.username) : null,
        language: p.language === 'am' || p.language === 'om' ? p.language : 'en',
        deposited_birr: Number(p.deposited_birr) || 0,
        won_birr: Number(p.won_birr) || 0,
        updated_at: String(p.updated_at),
      }));
    } catch {
      return [];
    }
  }

  public async recordRound(params: {
    stakeBirr: number;
    roundNumber: number;
    playersCount: number;
    entriesCount: number;
    totalPotBirr: number;
    commissionPercent: number;
    commissionBirr: number;
    prizePoolBirr: number;
    winners: RoundWinner[];
    calledNumbers: number[];
    startedAtMs: number;
    endedAtMs: number;
  }) {
    if (!this.client) return;
    try {
      await this.client.from('rounds').insert({
        stake_birr: params.stakeBirr,
        round_number: params.roundNumber,
        players_count: params.playersCount,
        entries_count: params.entriesCount,
        total_pot_birr: params.totalPotBirr,
        commission_percent: params.commissionPercent,
        commission_birr: params.commissionBirr,
        prize_pool_birr: params.prizePoolBirr,
        winners: params.winners,
        called_numbers: params.calledNumbers,
        started_at: new Date(params.startedAtMs).toISOString(),
        ended_at: new Date(params.endedAtMs).toISOString(),
      });
    } catch (err) {
      console.error('[Supabase] recordRound error:', err);
    }
  }

  public async getBotSession(tgUserId: string): Promise<BotSessionRecord> {
    const fallback = this.memSessions.get(tgUserId) || {
      telegram_user_id: tgUserId,
      language: 'en' as AppLanguage,
      pending_action: null,
      selected_button_id: null,
      selected_button_label: null,
      selected_bank_key: null,
    };
    if (!this.client) return fallback;
    try {
      const { data } = await this.client
        .from('bot_sessions')
        .select('*')
        .eq('telegram_user_id', tgUserId)
        .maybeSingle();
      if (!data) return fallback;
      const rec: BotSessionRecord = {
        telegram_user_id: tgUserId,
        language: data.language === 'am' || data.language === 'om' ? data.language : 'en',
        pending_action:
          data.pending_action === 'awaiting_deposit_proof' ||
          data.pending_action === 'awaiting_withdraw_info'
            ? data.pending_action
            : null,
        selected_button_id: data.selected_button_id ? String(data.selected_button_id) : null,
        selected_button_label: data.selected_button_label ? String(data.selected_button_label) : null,
        selected_bank_key: (data.selected_bank_key as PresetBankKey) || null,
      };
      this.memSessions.set(tgUserId, rec);
      return rec;
    } catch {
      return fallback;
    }
  }

  public async saveBotSession(session: BotSessionRecord) {
    this.memSessions.set(session.telegram_user_id, session);
    if (!this.client) return;
    try {
      await this.client.from('bot_sessions').upsert(
        {
          telegram_user_id: session.telegram_user_id,
          language: session.language,
          pending_action: session.pending_action,
          selected_button_id: this.isUuid(session.selected_button_id) ? session.selected_button_id : null,
          selected_button_label: session.selected_button_label,
          selected_bank_key: session.selected_bank_key,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'telegram_user_id' }
      );
    } catch (err) {
      console.error('[Supabase] saveBotSession error:', err);
    }
  }

  private isUuid(val: string | null): boolean {
    return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
  }

  public async createTransaction(input: {
    playerId: string;
    playerName: string;
    playerUsername: string | null;
    txType: 'deposit' | 'withdraw';
    bankKey: string | null;
    buttonId: string | null;
    buttonLabel: string | null;
    userMessage: string | null;
    userPhotoFileId: string | null;
    adminGroupId: string | null;
  }): Promise<TransactionRecord> {
    const fallback: TransactionRecord = {
      id: crypto.randomUUID(),
      player_id: input.playerId,
      player_name: input.playerName,
      player_username: input.playerUsername,
      tx_type: input.txType,
      bank_key: input.bankKey,
      button_id: input.buttonId,
      button_label: input.buttonLabel,
      user_message: input.userMessage,
      user_photo_file_id: input.userPhotoFileId,
      amount_birr: null,
      status: 'pending',
      resolved_by: null,
      admin_group_id: input.adminGroupId,
      admin_group_message_id: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    this.memTransactions.set(fallback.id, fallback);

    if (!this.client) return fallback;
    try {
      const { data, error } = await this.client
        .from('transactions')
        .insert({
          player_id: input.playerId,
          player_name: input.playerName,
          player_username: input.playerUsername,
          tx_type: input.txType,
          bank_key: input.bankKey,
          button_id: this.isUuid(input.buttonId) ? input.buttonId : null,
          button_label: input.buttonLabel,
          user_message: input.userMessage,
          user_photo_file_id: input.userPhotoFileId,
          status: 'pending',
          admin_group_id: input.adminGroupId,
        })
        .select('*')
        .single();

      if (!error && data) {
        const rec = data as TransactionRecord;
        this.memTransactions.set(rec.id, rec);
        return rec;
      }
    } catch (err) {
      console.error('[Supabase] createTransaction error:', err);
    }
    return fallback;
  }

  public async getTransaction(id: string): Promise<TransactionRecord | null> {
    if (this.client) {
      try {
        const { data } = await this.client.from('transactions').select('*').eq('id', id).maybeSingle();
        if (data) return data as TransactionRecord;
      } catch {
        // fallback to memory
      }
    }
    return this.memTransactions.get(id) || null;
  }

  public async updateTransaction(
    id: string,
    patch: Partial<{
      status: TransactionRecord['status'];
      amount_birr: number | null;
      resolved_by: string | null;
      admin_group_message_id: number | null;
      resolved_at: string | null;
    }>
  ) {
    const existing = this.memTransactions.get(id);
    if (existing) {
      this.memTransactions.set(id, { ...existing, ...patch });
    }
    if (!this.client) return;
    try {
      await this.client.from('transactions').update(patch).eq('id', id);
    } catch (err) {
      console.error('[Supabase] updateTransaction error:', err);
    }
  }
}

export const supabaseStore = new SupabaseStore();
