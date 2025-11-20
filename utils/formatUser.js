function formatUser(user) {
  if (!user) return null;

  return {
    _id: user._id,
    id: user._id,
    phone: user.phone || null,
    telegramId: user.telegramId || null,
    telegramUsername: user.telegramUsername || user.username || null,
    firstName: user.firstName || user.name || null,
    lastName: user.lastName || null,
    email: user.email || null,
    avatar: user.avatar || null,
    role: user.role || 'user',
  };
}

module.exports = { formatUser };
