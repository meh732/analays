export interface BotSendResult {
  platform: 'telegram' | 'bale';
  success: boolean;
  messageId?: number | string;
  error?: string;
}

export interface BotInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  style?: 'primary' | 'danger' | 'success';
}

export interface BotReplyButton {
  text: string;
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  options?: {
    inlineKeyboard?: BotInlineButton[][];
    replyKeyboard?: BotReplyButton[][];
    resizeKeyboard?: boolean;
  }
): Promise<BotSendResult> {
  if (!token || !chatId) {
    return { platform: 'telegram', success: false, error: 'Telegram Bot Token or Chat ID is missing' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    };

    if (options?.inlineKeyboard && options.inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: options.inlineKeyboard,
      };
    } else if (options?.replyKeyboard && options.replyKeyboard.length > 0) {
      payload.reply_markup = {
        keyboard: options.replyKeyboard,
        resize_keyboard: options.resizeKeyboard ?? true,
        is_persistent: true,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    if (data.ok) {
      return { platform: 'telegram', success: true, messageId: data.result?.message_id };
    } else {
      return { platform: 'telegram', success: false, error: data.description || 'Telegram API Error' };
    }
  } catch (err: any) {
    return { platform: 'telegram', success: false, error: err?.message || 'Network timeout connecting to Telegram' };
  }
}

export async function sendTelegramDocument(
  token: string,
  chatId: string,
  fileBuffer: Buffer | Uint8Array | string,
  fileName: string,
  caption?: string
): Promise<BotSendResult> {
  if (!token || !chatId) {
    return { platform: 'telegram', success: false, error: 'Telegram Bot Token or Chat ID is missing' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
    }

    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    formData.append('document', blob, fileName);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(25000),
    });

    const data = await response.json();
    if (data.ok) {
      return { platform: 'telegram', success: true, messageId: data.result?.message_id };
    } else {
      return { platform: 'telegram', success: false, error: data.description || 'Telegram sendDocument Error' };
    }
  } catch (err: any) {
    return { platform: 'telegram', success: false, error: err?.message || 'Error sending document to Telegram' };
  }
}

export async function sendBaleMessage(
  token: string,
  chatId: string,
  text: string,
  options?: {
    inlineKeyboard?: BotInlineButton[][];
    replyKeyboard?: BotReplyButton[][];
  }
): Promise<BotSendResult> {
  if (!token || !chatId) {
    return { platform: 'bale', success: false, error: 'Bale Bot Token or Chat ID is missing' };
  }

  try {
    const cleanToken = token.startsWith('bot') ? token : token;
    const url = `https://tapi.bale.ai/bot${cleanToken}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
    };

    if (options?.inlineKeyboard && options.inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: options.inlineKeyboard,
      };
    } else if (options?.replyKeyboard && options.replyKeyboard.length > 0) {
      payload.reply_markup = {
        keyboard: options.replyKeyboard,
        resize_keyboard: true,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    if (data.ok) {
      return { platform: 'bale', success: true, messageId: data.result?.message_id };
    } else {
      return { platform: 'bale', success: false, error: data.description || 'Bale API Error' };
    }
  } catch (err: any) {
    return { platform: 'bale', success: false, error: err?.message || 'Network timeout connecting to Bale' };
  }
}

