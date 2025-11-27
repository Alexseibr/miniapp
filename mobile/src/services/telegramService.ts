import { Linking } from 'react-native';

const BOT_USERNAME = 'KetmarM_bot';
const BOT_URL = `https://t.me/${BOT_USERNAME}`;

export async function openTelegramBot() {
  const deepLink = `tg://resolve?domain=${BOT_USERNAME}`;
  const supported = await Linking.canOpenURL(deepLink);
  await Linking.openURL(supported ? deepLink : BOT_URL);
}

export async function openMiniApp(miniAppUrl?: string) {
  if (!miniAppUrl) {
    await openTelegramBot();
    return;
  }
  const supported = await Linking.canOpenURL(miniAppUrl);
  await Linking.openURL(supported ? miniAppUrl : BOT_URL);
}
