const Ad = require('../models/Ad');
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

async function initIndexes() {
  const models = [
    { name: 'Ad', model: Ad },
    { name: 'User', model: User },
    { name: 'Favorite', model: Favorite },
    { name: 'Conversation', model: Conversation },
    { name: 'Message', model: Message },
  ];

  await Promise.all(
    models.map(async ({ name, model }) => {
      try {
        await model.syncIndexes();
        console.log(`✅ Indexes synced for ${name}`);
      } catch (error) {
        console.warn(`⚠️  Failed to sync indexes for ${name}: ${error.message}`);
      }
    })
  );
}

module.exports = { initIndexes };
