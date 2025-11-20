import mongoose from 'mongoose';

const connectDB = async (uri?: string) => {
  const mongoUri = uri || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }

  mongoose.set('strictQuery', false);

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    dbName: process.env.MONGO_DB_NAME || undefined,
  });

  return mongoose.connection;
};

export default connectDB;
