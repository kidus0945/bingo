export interface PaymentButton {
  id: string;
  flow_type: 'deposit' | 'withdraw';
  bank_key: string | null;
  label: string;
  response_text: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PlayerRecord {
  id: string;
  name: string;
  username: string | null;
  language: 'en' | 'am' | 'om';
  deposited_birr: number;
  won_birr: number;
  created_at: string;
  updated_at: string;
}

export interface RoundWinnerRecord {
  playerId: string;
  playerName: string;
  cartelaNumber: number;
  prizeAmount: number;
  patternName: string;
}

export interface RoundRecord {
  id: string;
  stake_birr: number;
  round_number: number;
  players_count: number;
  entries_count: number;
  total_pot_birr: number;
  commission_percent: number;
  commission_birr: number;
  prize_pool_birr: number;
  winners: RoundWinnerRecord[];
  called_numbers: number[];
  started_at: string | null;
  ended_at: string;
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
  admin_group_id: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface DashboardSettings {
  id: number;
  admin_group_id: string;
  deposit_intro_text: string;
  withdraw_intro_text: string;
  withdraw_prompt_text: string;
  commission_percent: number;
  call_interval_ms: number;
  updated_at: string;
}

export interface DashboardStats {
  totalRounds: number;
  totalCommissionBirr: number;
  totalPotBirr: number;
  totalPlayers: number;
  totalDepositedBalance: number;
  totalWonBalance: number;
  acceptedDepositsBirr: number;
  completedWithdrawalsBirr: number;
  pendingRequests: number;
}

export interface DashboardSnapshot {
  settings: DashboardSettings;
  payment_buttons: PaymentButton[];
  players: PlayerRecord[];
  rounds: RoundRecord[];
  transactions: TransactionRecord[];
  stats: DashboardStats;
}
