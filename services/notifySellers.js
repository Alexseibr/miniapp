const escapeText = (value = '') => {
  if (!value) {
    return '';
  }

  return value
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/`/g, '\\`');
};

const buildBuyerInfo = (order) => {
  const parts = [];

  if (order.buyerName) {
    parts.push(`Имя: ${escapeText(order.buyerName)}`);
  }

  if (order.buyerUsername) {
    parts.push(`Username: @${escapeText(order.buyerUsername)}`);
  }

  if (order.buyerPhone) {
    parts.push(`Телефон: ${escapeText(order.buyerPhone)}`);
  }

  return parts.join('\n');
};

const formatItems = (items) => {
  return items
    .map((item) => {
      const total = item.price * item.quantity;
      const currency = item.currency || 'BYN';
      return `• ${escapeText(item.title)} — ${item.quantity} шт. × ${item.price} ${currency} = ${total} ${currency}`;
    })
    .join('\n');
};

async function notifySellers(order, bot) {
  if (!order || !bot || !bot.telegram || typeof bot.telegram.sendMessage !== 'function') {
    return [];
  }

  const grouped = new Map();

  for (const item of order.items || []) {
    if (!item.sellerTelegramId) {
      continue;
    }

    const sellerId = item.sellerTelegramId;
    if (!grouped.has(sellerId)) {
      grouped.set(sellerId, []);
    }
    grouped.get(sellerId).push(item);
  }

  const results = [];
  const buyerInfo = buildBuyerInfo(order);
  const commentBlock = order.comment ? `\n\n💬 Комментарий: ${escapeText(order.comment)}` : '';
  const seasonBlock = order.seasonCode ? `\n🌟 Сезон: ${escapeText(order.seasonCode)}` : '';

  for (const [sellerId, items] of grouped.entries()) {
    const itemsBlock = formatItems(items);
    const sellerTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const currency = items[0]?.currency || 'BYN';

    const message =
      `📦 *Новый заказ* #${order._id}\n\n` +
      (buyerInfo ? `${buyerInfo}\n\n` : '') +
      `Позиции:\n${itemsBlock}\n\n` +
      `💰 Сумма для вас: ${sellerTotal} ${currency}` +
      commentBlock +
      seasonBlock;

    try {
      await bot.telegram.sendMessage(sellerId, message, {
        parse_mode: 'Markdown',
      });
      results.push({ sellerTelegramId: sellerId, sent: true });
    } catch (error) {
      console.error('Не удалось отправить уведомление продавцу', sellerId, error);
      results.push({ sellerTelegramId: sellerId, sent: false, error: error.message });
    }
  }

  return results;
}

module.exports = notifySellers;
