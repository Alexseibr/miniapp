export function formatUser(user) {
  if (!user) return null;

  return {
    _id: user._id,
    phone: user.phone,
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}
