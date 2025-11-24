export async function ensureNumericUserId(user) {
  if (typeof user.telegramId === 'number') {
    return user.telegramId;
  }

  if (typeof user.mobileNumericId === 'number') {
    return user.mobileNumericId;
  }

  user.mobileNumericId = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
  await user.save();
  return user.mobileNumericId;
}

export function formatUserProfile(user) {
  if (!user) return null;
  return {
    id: user._id,
    telegramId: user.telegramId || null,
    phone: user.phone || null,
    phoneVerified: !!user.phoneVerified,
    username: user.username || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    avatar: user.avatar || null,
    preferredCity: user.preferredCity || null,
    location: user.location || null,
    notificationSettings: user.notificationSettings || {
      push: true,
      email: false,
      telegram: true,
    },
    role: user.role,
  };
}
