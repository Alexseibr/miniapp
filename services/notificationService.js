const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || process.env.TELEGRAM_ADMIN_ID;

const escapeHtml = (value = '') => {
  if (value == null) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const formatBuyerLines = (order = {}) => {
  const name = order.buyerName ? escapeHtml(order.buyerName) : '—';
  const username = order.buyerUsername ? `@${escapeHtml(order.buyerUsername)}` : null;
  const phone = order.buyerPhone ? escapeHtml(order.buyerPhone) : '—';

  const lines = [`Покупатель: ${name}${username ? ` (${username})` : ''}`, `Телефон: ${phone}`];
  return lines.join('\n');
};

const formatItemsLines = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { text: '—', total: 0, currency: 'BYN' };
  }

  const currency = items[0]?.currency || 'BYN';
  const text = items
    .map((item) => {
      const title = escapeHtml(item.title || 'Товар');
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const total = quantity * price;
      return `• ${title} × ${quantity} = ${total} ${item.currency || currency}`;
    })
    .join('\n');

  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  return { text, total, currency };
};

async function notifyAdminAboutError(errorMessage, bot) {
  const text = `⚠️ Ошибка в системе уведомлений:\n${errorMessage}`;

  if (!ADMIN_TELEGRAM_ID) {
    console.error(text);
    return;
  }

  if (!bot || !bot.telegram || typeof bot.telegram.sendMessage !== 'function') {
    console.error(`${text}\n(Бот недоступен для отправки сообщения админу)`);
    return;
  }

  try {
    await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, text);
  } catch (error) {
    console.error('Не удалось отправить уведомление админу:', error);
  }
}

async function notifySellerAboutOrder(order, sellerTelegramId, bot) {
  if (!order || !sellerTelegramId) {
    return { sellerTelegramId, sent: false, reason: 'invalid_params' };
  }

  const sellerItems = (order.items || []).filter(
    (item) => Number(item.sellerTelegramId) === Number(sellerTelegramId)
  );

  if (sellerItems.length === 0) {
    return { sellerTelegramId, sent: false, reason: 'no_items' };
  }

  if (!bot || !bot.telegram || typeof bot.telegram.sendMessage !== 'function') {
    await notifyAdminAboutError(
      `Не удалось уведомить продавца ${sellerTelegramId}: бот недоступен`,
      bot
    );
    return { sellerTelegramId, sent: false, reason: 'bot_unavailable' };
  }

  const buyerBlock = formatBuyerLines(order);
  const { text: itemsBlock, total, currency } = formatItemsLines(sellerItems);
  const commentBlock = order.comment ? escapeHtml(order.comment) : '—';
  const seasonLine = order.seasonCode ? `\nСезон: ${escapeHtml(order.seasonCode)}` : '';
  const orderId = escapeHtml(order._id?.toString() || '—');

  const messageText =
    '🛒 Новый заказ!\n\n' +
    `${buyerBlock}\n\n` +
    'Ваши товары:\n' +
    `${itemsBlock}\n` +
    `\nСумма к оплате: ${total} ${currency}` +
    `${seasonLine}\n\n` +
    'Комментарий покупателя:\n' +
    `${commentBlock || '—'}\n\n` +
    `ID заказа: ${orderId}`;

  try {
    await bot.telegram.sendMessage(sellerTelegramId, messageText, {
      parse_mode: 'HTML',
    });
    return { sellerTelegramId, sent: true };
  } catch (error) {
    const reason = `Ошибка отправки продавцу ${sellerTelegramId}: ${error.message}`;
    console.error(reason);
    await notifyAdminAboutError(reason, bot);
    return { sellerTelegramId, sent: false, reason: error.message };
  }
}

module.exports = {
  notifySellerAboutOrder,
  notifyAdminAboutError,
};
