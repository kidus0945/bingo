import { PRESET_BANKS, type AppLanguage, type PlayerWallet, type PresetBankKey } from './shared/bingo.ts';
import { PaymentButtonRecord, supabaseStore } from './server-db.ts';

export interface BotHubBridge {
  getWalletSnapshot: (playerId: string, name?: string, username?: string) => PlayerWallet;
  creditDepositFromBot: (playerId: string, name: string, amountBirr: number) => Promise<PlayerWallet>;
  deductWithdrawFromBot: (playerId: string, name: string, amountBirr: number) => Promise<PlayerWallet>;
  setPlayerLanguage: (playerId: string, language: AppLanguage) => void;
  getPlayerLanguage: (playerId: string) => AppLanguage | undefined;
  isTelegramAdminId: (tgIdWithPrefix: string) => boolean;
}

interface PendingAdminAmountInput {
  mode: 'deposit_accept' | 'withdraw_done';
  txId: string;
  groupChatId: string;
  adminUserId: string;
  adminName: string;
  promptMessageId: number | null;
  originalGroupMsgId: number | null;
  hasPhoto: boolean;
  originalTextOrCaption: string;
}

const BOT_STRINGS: Record<
  AppLanguage,
  {
    welcomeGreeting: (name: string) => string;
    balanceLine: (dep: number, won: number) => string;
    menuPrompt: string;
    btnPlay: string;
    btnDeposit: string;
    btnWithdraw: string;
    btnLanguage: string;
    btnBack: string;
    btnCancel: string;
    chooseLang: string;
    cancelled: string;
    noButtonsConfigured: string;
    depositFallbackReply: (bankName: string) => string;
    depositReceived: string;
    withdrawReceived: string;
    depositAcceptedUser: (amt: number, bankName: string) => string;
    depositRejectedUser: string;
    withdrawDoneUser: string;
    withdrawIncorrectUser: string;
    adminGroupNotConfigured: string;
  }
> = {
  en: {
    welcomeGreeting: (name) => `👋 Welcome, <b>${name}</b>!`,
    balanceLine: (dep, won) => `Deposited: ${dep} Birr · Won: ${won} Birr`,
    menuPrompt: 'Choose an option below or open the game directly:',
    btnPlay: 'Play Zemen Bingo',
    btnDeposit: 'Deposit',
    btnWithdraw: 'Withdraw',
    btnLanguage: 'Language',
    btnBack: 'Back',
    btnCancel: 'Cancel',
    chooseLang: 'Choose your language (updates both bot and game):',
    cancelled: 'Cancelled. Back to main menu.',
    noButtonsConfigured: 'No banks are currently enabled. Please contact the admin.',
    depositFallbackReply: (bankName) =>
      `Selected ${bankName}. Send your deposit receipt photo or confirmation message here.`,
    depositReceived: 'Your deposit proof has been sent to the admin team. You will be notified once reviewed.',
    withdrawReceived: 'Your withdrawal request has been sent to the admin team.',
    depositAcceptedUser: (amt, bankName) =>
      `${amt} Birr (${bankName}) has been deposited to your account!`,
    depositRejectedUser: 'Your deposit request was rejected. Please check your details and try again.',
    withdrawDoneUser: 'Money has been sent to your account!',
    withdrawIncorrectUser: 'Your withdrawal info was incorrect. Please tap Withdraw and send valid details.',
    adminGroupNotConfigured: 'Admin group is not linked yet. An admin should run /setgroup inside the admin group.',
  },
  am: {
    welcomeGreeting: (name) => `👋 እንኳን ደህና መጡ፣ <b>${name}</b>!`,
    balanceLine: (dep, won) => `ተቀማጭ: ${dep} ብር · አሸናፊ: ${won} ብር`,
    menuPrompt: 'ከታች ካሉት አማራጮች አንዱን ይምረጡ ወይም ጨዋታውን ይክፈቱ:',
    btnPlay: 'ዘመን ቢንጎ ይጫወቱ',
    btnDeposit: 'ገንዘብ አስገባ (Deposit)',
    btnWithdraw: 'ገንዘብ አውጣ (Withdraw)',
    btnLanguage: 'ቋንቋ (Language)',
    btnBack: 'ተመለስ',
    btnCancel: 'ሰርዝ',
    chooseLang: 'ቋንቋ ይምረጡ (ቦቱን እና ጨዋታውን ይቀይራል):',
    cancelled: 'ተሰርዟል። ወደ ዋናው ማውጫ ተመልሰዋል።',
    noButtonsConfigured: 'ምንም የባንክ አማራጭ አልተከፈተም። እባክዎ አስተዳዳሪውን ያግኙ።',
    depositFallbackReply: (bankName) =>
      `${bankName} ተመርጧል። የክፍያ ደረሰኝ ፎቶ ወይም መልእክት እዚህ ይላኩ።`,
    depositReceived: 'የገንዘብ ማስገቢያ መረጃዎ ለአስተዳዳሪዎች ተልኳል። ሲረጋገጥ መልእክት ይደርስዎታል።',
    withdrawReceived: 'የገንዘብ ማውጫ ጥያቄዎ ለአስተዳዳሪዎች ተልኳል።',
    depositAcceptedUser: (amt, bankName) =>
      `${amt} ብር (${bankName}) ወደ አካውንትዎ ገብቷል!`,
    depositRejectedUser: 'የገንዘብ ማስገቢያ ጥያቄዎ ውድቅ ተደርጓል። እባክዎ ትክክለኛ መረጃ ይላኩ።',
    withdrawDoneUser: 'ገንዘቡ ወደ አካውንትዎ ተልኳል!',
    withdrawIncorrectUser: 'የላኩት የገንዘብ ማውጫ መረጃ ትክክል አይደለም። እባክዎ ትክክለኛ መረጃ ይላኩ።',
    adminGroupNotConfigured: 'የአስተዳዳሪ ግሩፕ አልተገናኘም። አስተዳዳሪው በግሩፑ ውስጥ /setgroup ይጻፍ።',
  },
  om: {
    welcomeGreeting: (name) => `👋 Baga nagaan dhuftan, <b>${name}</b>!`,
    balanceLine: (dep, won) => `Kuufama: ${dep} Birrii · Moo'ame: ${won} Birrii`,
    menuPrompt: 'Filannoo armaan gadii keessaa tokko filadhu ykn tapha bani:',
    btnPlay: 'Zemen Bingo Taphadhu',
    btnDeposit: 'Maallaqa Galchi (Deposit)',
    btnWithdraw: 'Maallaqa Baasi (Withdraw)',
    btnLanguage: 'Afaan (Language)',
    btnBack: 'Deebi’i',
    btnCancel: 'Haqi',
    chooseLang: 'Afaan kee filadhu (bootii fi tapha ni jijjiira):',
    cancelled: 'Haqameera. Gara menu jalqabaatti deebiteetta.',
    noButtonsConfigured: 'Baankiin baname hin jiru. Maaloo bulchaa qunnamaa.',
    depositFallbackReply: (bankName) =>
      `${bankName} filatameera. Suuraa nagahee ykn ergaa mirkaneessaa asitti ergi.`,
    depositReceived: 'Ragaan galchii keessanii gara bulchitootaatti ergameera. Yeroo mirkanaa’u isin beeksisna.',
    withdrawReceived: 'Gaaffiin baasii keessanii gara bulchitootaatti ergameera.',
    depositAcceptedUser: (amt, bankName) =>
      `Birrii ${amt} (${bankName}) gara herrega keessaniitti galeera!`,
    depositRejectedUser: 'Gaaffiin galchii keessanii fudhatama hin arganne. Maaloo irra deebi’aa yaalaa.',
    withdrawDoneUser: 'Maallaqni gara herrega keessaniitti ergameera!',
    withdrawIncorrectUser: 'Odeeffannoon baasii ergitan sirrii miti. Maaloo odeeffannoo sirrii ergaa.',
    adminGroupNotConfigured: 'Gareen bulchaa hin hidhamne. Bulchaan garee keessatti /setgroup haa barreessu.',
  },
};

function getLocalizedBankName(bankKey: PresetBankKey, lang: AppLanguage, fallback?: string): string {
  const found = PRESET_BANKS.find((b) => b.key === bankKey);
  if (found) return found.names[lang] || found.names.en;
  return fallback || bankKey;
}

function getCanonicalBankName(bankKey: PresetBankKey | string | null, fallback?: string | null): string {
  const found = PRESET_BANKS.find((b) => b.key === bankKey);
  return found ? found.names.en : fallback || 'Bank';
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chunkButtons<T>(items: T[], perRow = 2): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }
  return rows;
}

export class TelegramBotHandler {
  private pendingAdminAmounts = new Map<string, PendingAdminAmountInput>();

  constructor(
    private readonly botToken: string,
    private readonly hub: BotHubBridge,
    private readonly resolveMiniAppUrl: (fallbackUrl: string) => string
  ) {}

  public async callApi(method: string, body: Record<string, unknown>) {
    if (!this.botToken) return null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; description?: string; result?: any };
      if (!data.ok) {
        console.error(`[Telegram API Error] ${method}:`, data.description || data);
      }
      return data;
    } catch (err) {
      console.error(`[Telegram API Network Error] ${method}:`, err);
      return null;
    }
  }

  private async isTelegramGroupAdmin(chatId: string | number, userId: number): Promise<boolean> {
    if (this.hub.isTelegramAdminId(`tg_${userId}`)) return true;
    const member = await this.callApi('getChatMember', { chat_id: chatId, user_id: userId });
    const status = member?.result?.status;
    return status === 'creator' || status === 'administrator';
  }

  private buildMiniAppUrlWithLang(baseMiniAppUrl: string, lang: AppLanguage): string {
    const sep = baseMiniAppUrl.includes('?') ? '&' : '?';
    return `${baseMiniAppUrl}${sep}lang=${lang}`;
  }

  private async sendHomeMenu(
    chatId: number | string,
    tgUserId: string,
    displayName: string,
    username: string | undefined,
    lang: AppLanguage,
    miniAppBaseUrl: string,
    editMessageId?: number
  ) {
    const t = BOT_STRINGS[lang];
    const wallet = this.hub.getWalletSnapshot(`tg_${tgUserId}`, displayName, username);
    const playUrl = this.buildMiniAppUrlWithLang(miniAppBaseUrl, lang);
    const text =
      `${t.welcomeGreeting(escapeHtml(displayName))}\n` +
      `🎱 <b>Zemen Bingo</b>\n` +
      `${escapeHtml(t.balanceLine(wallet.depositedBalance, wallet.wonBalance))}\n\n` +
      `${escapeHtml(t.menuPrompt)}`;

    const reply_markup = {
      inline_keyboard: [
        [{ text: `🎮 ${t.btnPlay}`, web_app: { url: playUrl } }],
        [
          { text: `💰 ${t.btnDeposit}`, callback_data: 'menu:deposit' },
          { text: `💸 ${t.btnWithdraw}`, callback_data: 'menu:withdraw' },
        ],
        [{ text: `🌐 ${t.btnLanguage}`, callback_data: 'menu:language' }],
      ],
    };

    if (editMessageId) {
      await this.callApi('editMessageText', {
        chat_id: chatId,
        message_id: editMessageId,
        text,
        parse_mode: 'HTML',
        reply_markup,
      });
    } else {
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup,
      });
    }
  }

  private async sendDepositMenu(chatId: number | string, lang: AppLanguage, editMessageId?: number) {
    const t = BOT_STRINGS[lang];
    const { config, buttons } = await supabaseStore.getBotConfigAndButtons();
    const depButtons = buttons.filter((b) => b.flow_type === 'deposit');

    if (depButtons.length === 0) {
      const payload = {
        chat_id: chatId,
        text: escapeHtml(t.noButtonsConfigured),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: `⬅️ ${t.btnBack}`, callback_data: 'menu:home' }]] },
      };
      if (editMessageId) {
        await this.callApi('editMessageText', { ...payload, message_id: editMessageId });
      } else {
        await this.callApi('sendMessage', payload);
      }
      return;
    }

    const rows = chunkButtons(
      depButtons.map((b) => ({
        text: getLocalizedBankName(b.bank_key, lang, b.label),
        callback_data: `dep:${b.bank_key}`,
      })),
      2
    );
    rows.push([{ text: `⬅️ ${t.btnBack}`, callback_data: 'menu:home' }]);

    const text = `💰 <b>${escapeHtml(t.btnDeposit)}</b>\n\n${escapeHtml(config.depositIntroText)}`;
    if (editMessageId) {
      await this.callApi('editMessageText', {
        chat_id: chatId,
        message_id: editMessageId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: rows },
      });
    } else {
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: rows },
      });
    }
  }

  private async sendWithdrawMenu(chatId: number | string, lang: AppLanguage, editMessageId?: number) {
    const t = BOT_STRINGS[lang];
    const { config, buttons } = await supabaseStore.getBotConfigAndButtons();
    const wdButtons = buttons.filter((b) => b.flow_type === 'withdraw');

    if (wdButtons.length === 0) {
      const payload = {
        chat_id: chatId,
        text: escapeHtml(t.noButtonsConfigured),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: `⬅️ ${t.btnBack}`, callback_data: 'menu:home' }]] },
      };
      if (editMessageId) {
        await this.callApi('editMessageText', { ...payload, message_id: editMessageId });
      } else {
        await this.callApi('sendMessage', payload);
      }
      return;
    }

    const rows = chunkButtons(
      wdButtons.map((b) => ({
        text: getLocalizedBankName(b.bank_key, lang, b.label),
        callback_data: `wd:${b.bank_key}`,
      })),
      2
    );
    rows.push([{ text: `⬅️ ${t.btnBack}`, callback_data: 'menu:home' }]);

    const text = `💸 <b>${escapeHtml(t.btnWithdraw)}</b>\n\n${escapeHtml(config.withdrawIntroText)}`;
    if (editMessageId) {
      await this.callApi('editMessageText', {
        chat_id: chatId,
        message_id: editMessageId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: rows },
      });
    } else {
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: rows },
      });
    }
  }

  private async sendLanguageMenu(chatId: number | string, lang: AppLanguage, editMessageId?: number) {
    const t = BOT_STRINGS[lang];
    const rows = [
      [{ text: '🇪🇹 አማርኛ (Amharic)', callback_data: 'lang:am' }],
      [{ text: '🇬🇧 English', callback_data: 'lang:en' }],
      [{ text: '🇪🇹 Afaan Oromoo', callback_data: 'lang:om' }],
      [{ text: `⬅️ ${t.btnBack}`, callback_data: 'menu:home' }],
    ];
    const payload = {
      chat_id: chatId,
      text: `🌐 ${escapeHtml(t.chooseLang)}`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: rows },
    };
    if (editMessageId) {
      await this.callApi('editMessageText', { ...payload, message_id: editMessageId });
    } else {
      await this.callApi('sendMessage', payload);
    }
  }

  private getPendingAdminKey(groupChatId: string, adminUserId: string): string {
    return `${groupChatId}::${adminUserId}`;
  }

  public async handleUpdate(update: Record<string, any>, fallbackAppUrl: string) {
    const miniAppBaseUrl = this.resolveMiniAppUrl(fallbackAppUrl);

    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query, miniAppBaseUrl);
      return;
    }

    const message = update.message;
    if (!message || !message.chat || !message.from) return;

    const chatId = String(message.chat.id);
    const chatType = String(message.chat.type || 'private');
    const from = message.from as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      is_bot?: boolean;
    };
    if (from.is_bot) return;

    const tgUserId = String(from.id);
    const fullName =
      [from.first_name, from.last_name].filter(Boolean).join(' ').trim() ||
      from.username ||
      `Player ${from.id}`;
    const text = typeof message.text === 'string' ? message.text.trim() : '';

    // Group / Supergroup messages (Admin Group commands & Deposit/Withdrawal amount input)
    if (chatType === 'group' || chatType === 'supergroup') {
      if (text.startsWith('/setgroup')) {
        const isAllowed = await this.isTelegramGroupAdmin(chatId, from.id);
        if (!isAllowed) {
          await this.callApi('sendMessage', {
            chat_id: chatId,
            text: 'Only a group admin can link this Admin Group.',
          });
          return;
        }
        await supabaseStore.setAdminGroupId(chatId);
        await this.callApi('sendMessage', {
          chat_id: chatId,
          text: `✅ <b>Admin Group Linked!</b>\nGroup ID: <code>${escapeHtml(chatId)}</code>\nAll player Deposit and Withdrawal requests will be sent here.`,
          parse_mode: 'HTML',
        });
        return;
      }

      const pendingKey = this.getPendingAdminKey(chatId, tgUserId);
      const replyToId = message.reply_to_message?.message_id ? Number(message.reply_to_message.message_id) : null;
      let pending = this.pendingAdminAmounts.get(pendingKey);
      if (!pending && replyToId) {
        for (const item of this.pendingAdminAmounts.values()) {
          if (item.groupChatId === chatId && item.promptMessageId === replyToId) {
            pending = item;
            break;
          }
        }
      }

      if (pending && text && !text.startsWith('/')) {
        const cleaned = text.replace(/[, ]+/g, '').replace(/birr|br|etb/gi, '');
        const amount = Number(cleaned);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
          await this.callApi('sendMessage', {
            chat_id: chatId,
            reply_to_message_id: message.message_id,
            text: 'Please type a valid positive Birr number (for example: 100).',
          });
          return;
        }

        const roundedAmt = Math.round(amount * 100) / 100;
        const tx = await supabaseStore.getTransaction(pending.txId);
        this.pendingAdminAmounts.delete(this.getPendingAdminKey(pending.groupChatId, pending.adminUserId));

        if (!tx) {
          await this.callApi('sendMessage', { chat_id: chatId, text: 'Transaction record not found.' });
          return;
        }

        const bankLabel = getCanonicalBankName(tx.bank_key, tx.button_label);
        const playerRawId = tx.player_id.replace(/^tg_/, '');
        const playerFullId = tx.player_id.startsWith('tg_') ? tx.player_id : `tg_${tx.player_id}`;

        if (pending.mode === 'deposit_accept') {
          if (tx.status !== 'pending') {
            await this.callApi('sendMessage', { chat_id: chatId, text: 'This deposit was already processed.' });
            return;
          }

          await this.hub.creditDepositFromBot(playerFullId, tx.player_name, roundedAmt);
          await supabaseStore.updateTransaction(tx.id, {
            status: 'accepted',
            amount_birr: roundedAmt,
            resolved_by: pending.adminName,
            resolved_at: new Date().toISOString(),
          });

          if (pending.originalGroupMsgId) {
            const suffix = `\n\n✅ <b>ACCEPTED (${escapeHtml(bankLabel)}): +${roundedAmt} Birr</b> · by ${escapeHtml(pending.adminName)}`;
            if (pending.hasPhoto) {
              await this.callApi('editMessageCaption', {
                chat_id: chatId,
                message_id: pending.originalGroupMsgId,
                caption: `${pending.originalTextOrCaption}${suffix}`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] },
              });
            } else {
              await this.callApi('editMessageText', {
                chat_id: chatId,
                message_id: pending.originalGroupMsgId,
                text: `${pending.originalTextOrCaption}${suffix}`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] },
              });
            }
          }

          await this.callApi('sendMessage', {
            chat_id: chatId,
            reply_to_message_id: message.message_id,
            text: `✅ Credited <b>${roundedAmt} Birr</b> via <b>${escapeHtml(bankLabel)}</b> to ${escapeHtml(tx.player_name)}.`,
            parse_mode: 'HTML',
          });

          const playerSession = await supabaseStore.getBotSession(playerRawId);
          const playerLang = this.hub.getPlayerLanguage(playerFullId) || playerSession.language || 'en';
          await this.callApi('sendMessage', {
            chat_id: playerRawId,
            text: `✅ ${BOT_STRINGS[playerLang].depositAcceptedUser(roundedAmt, getLocalizedBankName((tx.bank_key as PresetBankKey) || 'telebirr', playerLang, bankLabel))}`,
          });
          return;
        }

        if (pending.mode === 'withdraw_done') {
          const updatedWallet = await this.hub.deductWithdrawFromBot(playerFullId, tx.player_name, roundedAmt);
          await supabaseStore.updateTransaction(tx.id, {
            status: 'done',
            amount_birr: roundedAmt,
            resolved_by: pending.adminName,
            resolved_at: tx.resolved_at || new Date().toISOString(),
          });

          if (pending.originalGroupMsgId) {
            const suffix = `\n\n✅ <b>DONE (${escapeHtml(bankLabel)}): -${roundedAmt} Birr sent</b> · by ${escapeHtml(pending.adminName)}`;
            if (pending.hasPhoto) {
              await this.callApi('editMessageCaption', {
                chat_id: chatId,
                message_id: pending.originalGroupMsgId,
                caption: `${pending.originalTextOrCaption}${suffix}`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] },
              });
            } else {
              await this.callApi('editMessageText', {
                chat_id: chatId,
                message_id: pending.originalGroupMsgId,
                text: `${pending.originalTextOrCaption}${suffix}`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] },
              });
            }
          }

          await this.callApi('sendMessage', {
            chat_id: chatId,
            reply_to_message_id: message.message_id,
            text: `✅ Logged <b>${roundedAmt} Birr</b> withdrawal via <b>${escapeHtml(bankLabel)}</b> for ${escapeHtml(tx.player_name)} (Remaining balance: ${updatedWallet.depositedBalance + updatedWallet.wonBalance} Birr).`,
            parse_mode: 'HTML',
          });
          return;
        }
      }
      return;
    }

    // Private Chat Messages
    if (chatType !== 'private') return;

    const session = await supabaseStore.getBotSession(tgUserId);
    const lang: AppLanguage = this.hub.getPlayerLanguage(`tg_${tgUserId}`) || session.language || 'en';
    const t = BOT_STRINGS[lang];

    // Ensure Telegram account name & username are always synced into Hub & Supabase
    this.hub.getWalletSnapshot(`tg_${tgUserId}`, fullName, from.username);

    if (text.startsWith('/start') || text.startsWith('/play')) {
      session.pending_action = null;
      session.selected_button_id = null;
      session.selected_button_label = null;
      session.selected_bank_key = null;
      session.language = lang;
      await supabaseStore.saveBotSession(session);
      await this.sendHomeMenu(chatId, tgUserId, fullName, from.username, lang, miniAppBaseUrl);
      return;
    }

    if (text.startsWith('/deposit')) {
      session.pending_action = null;
      await supabaseStore.saveBotSession(session);
      await this.sendDepositMenu(chatId, lang);
      return;
    }

    if (text.startsWith('/withdraw')) {
      session.pending_action = null;
      await supabaseStore.saveBotSession(session);
      await this.sendWithdrawMenu(chatId, lang);
      return;
    }

    if (text.startsWith('/language')) {
      await this.sendLanguageMenu(chatId, lang);
      return;
    }

    if (
      session.pending_action === 'awaiting_deposit_proof' ||
      session.pending_action === 'awaiting_withdraw_info'
    ) {
      const photos = Array.isArray(message.photo) ? message.photo : [];
      const largestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
      const photoFileId: string | null = largestPhoto?.file_id ? String(largestPhoto.file_id) : null;
      const userMessageText: string | null =
        (typeof message.text === 'string' && message.text.trim()) ||
        (typeof message.caption === 'string' && message.caption.trim()) ||
        null;

      if (!photoFileId && !userMessageText) return;

      const { config } = await supabaseStore.getBotConfigAndButtons();
      const adminGroupId = config.adminGroupId || (process.env.ADMIN_GROUP_ID || '').trim();
      if (!adminGroupId) {
        await this.callApi('sendMessage', {
          chat_id: chatId,
          text: t.adminGroupNotConfigured,
        });
        return;
      }

      const txType = session.pending_action === 'awaiting_deposit_proof' ? 'deposit' : 'withdraw';
      const canonicalBank = getCanonicalBankName(session.selected_bank_key, session.selected_button_label);

      const tx = await supabaseStore.createTransaction({
        playerId: `tg_${tgUserId}`,
        playerName: fullName,
        playerUsername: from.username || null,
        txType,
        bankKey: session.selected_bank_key,
        buttonId: session.selected_button_id,
        buttonLabel: canonicalBank,
        userMessage: userMessageText,
        userPhotoFileId: photoFileId,
        adminGroupId,
      });

      session.pending_action = null;
      session.selected_button_id = null;
      session.selected_button_label = null;
      session.selected_bank_key = null;
      await supabaseStore.saveBotSession(session);

      const wallet = this.hub.getWalletSnapshot(`tg_${tgUserId}`, fullName, from.username);
      const userHandle = from.username ? `@${from.username}` : 'No username';
      const headerLabel = txType === 'deposit' ? '💰 <b>NEW DEPOSIT REQUEST</b>' : '💸 <b>NEW WITHDRAWAL REQUEST</b>';
      const detailsBlock =
        `${headerLabel}\n` +
        `Player: <b>${escapeHtml(fullName)}</b> (${escapeHtml(userHandle)})\n` +
        `Telegram ID: <code>${escapeHtml(tgUserId)}</code>\n` +
        `Bank: <b>${escapeHtml(canonicalBank)}</b>\n` +
        `Balance: <b>${wallet.depositedBalance + wallet.wonBalance} Birr</b> (Dep: ${wallet.depositedBalance} · Won: ${wallet.wonBalance})` +
        (userMessageText ? `\nMessage: ${escapeHtml(userMessageText)}` : '');

      const adminKeyboard =
        txType === 'deposit'
          ? [
              [
                { text: '✅ Accept', callback_data: `adm_da:${tx.id}` },
                { text: '❌ Reject', callback_data: `adm_dr:${tx.id}` },
              ],
            ]
          : [
              [
                { text: '✅ Done', callback_data: `adm_wd:${tx.id}` },
                { text: '⚠️ Incorrect Info', callback_data: `adm_wb:${tx.id}` },
              ],
            ];

      let sentRes: any = null;
      if (photoFileId) {
        sentRes = await this.callApi('sendPhoto', {
          chat_id: adminGroupId,
          photo: photoFileId,
          caption: detailsBlock,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: adminKeyboard },
        });
      } else {
        sentRes = await this.callApi('sendMessage', {
          chat_id: adminGroupId,
          text: detailsBlock,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: adminKeyboard },
        });
      }

      if (sentRes?.result?.message_id) {
        await supabaseStore.updateTransaction(tx.id, {
          admin_group_message_id: Number(sentRes.result.message_id),
        });
      }

      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: txType === 'deposit' ? t.depositReceived : t.withdrawReceived,
      });
      return;
    }

    await this.sendHomeMenu(chatId, tgUserId, fullName, from.username, lang, miniAppBaseUrl);
  }

  private async handleCallbackQuery(cq: Record<string, any>, miniAppBaseUrl: string) {
    const cqId = String(cq.id);
    const data = String(cq.data || '');
    const msg = cq.message;
    const from = cq.from as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };

    if (!msg || !msg.chat || !from) {
      await this.callApi('answerCallbackQuery', { callback_query_id: cqId });
      return;
    }

    const chatId = String(msg.chat.id);
    const chatType = String(msg.chat.type || 'private');
    const msgId = Number(msg.message_id);
    const tgUserId = String(from.id);
    const fullName =
      [from.first_name, from.last_name].filter(Boolean).join(' ').trim() ||
      from.username ||
      `Player ${from.id}`;

    // Admin Group Button Actions
    if (data.startsWith('adm_')) {
      if (chatType !== 'group' && chatType !== 'supergroup') {
        await this.callApi('answerCallbackQuery', { callback_query_id: cqId });
        return;
      }

      const isAllowed = await this.isTelegramGroupAdmin(chatId, from.id);
      if (!isAllowed) {
        await this.callApi('answerCallbackQuery', {
          callback_query_id: cqId,
          text: 'Only admins can approve or reject requests.',
          show_alert: true,
        });
        return;
      }

      const [action, txId] = data.split(':');
      const tx = await supabaseStore.getTransaction(txId);
      if (!tx) {
        await this.callApi('answerCallbackQuery', {
          callback_query_id: cqId,
          text: 'Request record not found.',
          show_alert: true,
        });
        return;
      }
      if (tx.status !== 'pending') {
        await this.callApi('answerCallbackQuery', {
          callback_query_id: cqId,
          text: `Already marked as ${tx.status}.`,
        });
        return;
      }

      const hasPhoto = Boolean(msg.photo && msg.photo.length > 0);
      const origContent = escapeHtml(String(hasPhoto ? msg.caption || '' : msg.text || ''));
      const bankLabel = getCanonicalBankName(tx.bank_key, tx.button_label);
      const playerRawId = tx.player_id.replace(/^tg_/, '');
      const playerFullId = tx.player_id.startsWith('tg_') ? tx.player_id : `tg_${tx.player_id}`;
      const playerSession = await supabaseStore.getBotSession(playerRawId);
      const playerLang = this.hub.getPlayerLanguage(playerFullId) || playerSession.language || 'en';
      const pt = BOT_STRINGS[playerLang];

      if (action === 'adm_da') {
        await this.callApi('answerCallbackQuery', { callback_query_id: cqId });
        const promptRes = await this.callApi('sendMessage', {
          chat_id: chatId,
          reply_to_message_id: msgId,
          text: `💵 How much Birr was deposited via <b>${escapeHtml(bankLabel)}</b> for <b>${escapeHtml(tx.player_name)}</b>?\nType the number below:`,
          parse_mode: 'HTML',
          reply_markup: { force_reply: true, selective: true },
        });
        this.pendingAdminAmounts.set(this.getPendingAdminKey(chatId, tgUserId), {
          mode: 'deposit_accept',
          txId: tx.id,
          groupChatId: chatId,
          adminUserId: tgUserId,
          adminName: fullName,
          promptMessageId: promptRes?.result?.message_id ? Number(promptRes.result.message_id) : null,
          originalGroupMsgId: msgId,
          hasPhoto,
          originalTextOrCaption: origContent,
        });
        return;
      }

      if (action === 'adm_dr') {
        await this.callApi('answerCallbackQuery', { callback_query_id: cqId, text: 'Rejected' });
        await supabaseStore.updateTransaction(tx.id, {
          status: 'rejected',
          resolved_by: fullName,
          resolved_at: new Date().toISOString(),
        });
        const suffix = `\n\n❌ <b>REJECTED (${escapeHtml(bankLabel)})</b> · by ${escapeHtml(fullName)}`;
        if (hasPhoto) {
          await this.callApi('editMessageCaption', {
            chat_id: chatId,
            message_id: msgId,
            caption: `${origContent}${suffix}`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          });
        } else {
          await this.callApi('editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: `${origContent}${suffix}`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          });
        }
        await this.callApi('sendMessage', {
          chat_id: playerRawId,
          text: `❌ ${pt.depositRejectedUser}`,
        });
        return;
      }

      if (action === 'adm_wd') {
        // Withdrawal Done -> notify player IMMEDIATELY + ask admin how much Birr was sent via that Bank
        await this.callApi('answerCallbackQuery', { callback_query_id: cqId, text: 'Marked Done' });
        await supabaseStore.updateTransaction(tx.id, {
          status: 'done',
          resolved_by: fullName,
          resolved_at: new Date().toISOString(),
        });

        await this.callApi('sendMessage', {
          chat_id: playerRawId,
          text: `✅ ${pt.withdrawDoneUser}`,
        });

        const promptRes = await this.callApi('sendMessage', {
          chat_id: chatId,
          reply_to_message_id: msgId,
          text: `💵 Marked Done & notified ${escapeHtml(tx.player_name)}!\nHow much Birr did you send via <b>${escapeHtml(bankLabel)}</b>? Type the number below to record & deduct:`,
          parse_mode: 'HTML',
          reply_markup: { force_reply: true, selective: true },
        });
        this.pendingAdminAmounts.set(this.getPendingAdminKey(chatId, tgUserId), {
          mode: 'withdraw_done',
          txId: tx.id,
          groupChatId: chatId,
          adminUserId: tgUserId,
          adminName: fullName,
          promptMessageId: promptRes?.result?.message_id ? Number(promptRes.result.message_id) : null,
          originalGroupMsgId: msgId,
          hasPhoto,
          originalTextOrCaption: origContent,
        });
        return;
      }

      if (action === 'adm_wb') {
        await this.callApi('answerCallbackQuery', { callback_query_id: cqId, text: 'Marked Incorrect Info' });
        await supabaseStore.updateTransaction(tx.id, {
          status: 'incorrect',
          resolved_by: fullName,
          resolved_at: new Date().toISOString(),
        });
        const suffix = `\n\n⚠️ <b>INCORRECT INFO (${escapeHtml(bankLabel)})</b> · by ${escapeHtml(fullName)}`;
        if (hasPhoto) {
          await this.callApi('editMessageCaption', {
            chat_id: chatId,
            message_id: msgId,
            caption: `${origContent}${suffix}`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          });
        } else {
          await this.callApi('editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: `${origContent}${suffix}`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          });
        }
        await this.callApi('sendMessage', {
          chat_id: playerRawId,
          text: `⚠️ ${pt.withdrawIncorrectUser}`,
        });
        return;
      }

      await this.callApi('answerCallbackQuery', { callback_query_id: cqId });
      return;
    }

    // Player Private Bot Menu Callbacks
    await this.callApi('answerCallbackQuery', { callback_query_id: cqId });

    const session = await supabaseStore.getBotSession(tgUserId);
    const lang: AppLanguage = this.hub.getPlayerLanguage(`tg_${tgUserId}`) || session.language || 'en';
    const t = BOT_STRINGS[lang];
    this.hub.getWalletSnapshot(`tg_${tgUserId}`, fullName, from.username);

    if (data === 'menu:home' || data === 'menu:cancel') {
      session.pending_action = null;
      session.selected_button_id = null;
      session.selected_button_label = null;
      session.selected_bank_key = null;
      await supabaseStore.saveBotSession(session);
      await this.sendHomeMenu(chatId, tgUserId, fullName, from.username, lang, miniAppBaseUrl, msgId);
      return;
    }

    if (data === 'menu:deposit') {
      await this.sendDepositMenu(chatId, lang, msgId);
      return;
    }

    if (data === 'menu:withdraw') {
      await this.sendWithdrawMenu(chatId, lang, msgId);
      return;
    }

    if (data === 'menu:language') {
      await this.sendLanguageMenu(chatId, lang, msgId);
      return;
    }

    if (data.startsWith('lang:')) {
      const nextLang = data.slice(5) as AppLanguage;
      if (nextLang === 'en' || nextLang === 'am' || nextLang === 'om') {
        session.language = nextLang;
        session.pending_action = null;
        await supabaseStore.saveBotSession(session);
        this.hub.setPlayerLanguage(`tg_${tgUserId}`, nextLang);
        await supabaseStore.setPlayerLanguage(`tg_${tgUserId}`, nextLang);
        await this.sendHomeMenu(chatId, tgUserId, fullName, from.username, nextLang, miniAppBaseUrl, msgId);
      }
      return;
    }

    if (data.startsWith('dep:')) {
      const bankKey = data.slice(4) as PresetBankKey;
      const { buttons } = await supabaseStore.getBotConfigAndButtons();
      const btn: PaymentButtonRecord | undefined = buttons.find(
        (b) => b.flow_type === 'deposit' && b.bank_key === bankKey
      );
      if (!btn) {
        await this.sendDepositMenu(chatId, lang, msgId);
        return;
      }
      const displayBank = getLocalizedBankName(btn.bank_key, lang, btn.label);
      session.pending_action = 'awaiting_deposit_proof';
      session.selected_button_id = btn.id;
      session.selected_button_label = getCanonicalBankName(btn.bank_key, btn.label);
      session.selected_bank_key = btn.bank_key;
      await supabaseStore.saveBotSession(session);

      const replyText = btn.response_text.trim() || t.depositFallbackReply(displayBank);
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: `<b>${escapeHtml(displayBank)}</b>\n\n${escapeHtml(replyText)}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: `❌ ${t.btnCancel}`, callback_data: 'menu:cancel' }]],
        },
      });
      return;
    }

    if (data.startsWith('wd:')) {
      const bankKey = data.slice(3) as PresetBankKey;
      const { config, buttons } = await supabaseStore.getBotConfigAndButtons();
      const btn: PaymentButtonRecord | undefined = buttons.find(
        (b) => b.flow_type === 'withdraw' && b.bank_key === bankKey
      );
      if (!btn) {
        await this.sendWithdrawMenu(chatId, lang, msgId);
        return;
      }
      const displayBank = getLocalizedBankName(btn.bank_key, lang, btn.label);
      session.pending_action = 'awaiting_withdraw_info';
      session.selected_button_id = btn.id;
      session.selected_button_label = getCanonicalBankName(btn.bank_key, btn.label);
      session.selected_bank_key = btn.bank_key;
      await supabaseStore.saveBotSession(session);

      // Uses per-bank custom message if set in Cloudflare dashboard, otherwise falls back to shared prompt
      const replyText = btn.response_text.trim() || config.withdrawPromptText;
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: `<b>${escapeHtml(displayBank)}</b>\n\n${escapeHtml(replyText)}`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: `❌ ${t.btnCancel}`, callback_data: 'menu:cancel' }]],
        },
      });
    }
  }
}
