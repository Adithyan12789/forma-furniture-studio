import mongoose from 'mongoose';

/**
 * Connect to MongoDB. The API stays up without a database (health endpoint
 * reports the state) so the frontend and 3D studio remain reviewable;
 * auth/project persistence needs a reachable MongoDB.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[db] MONGO_URI not set — running without a database.');
    return false;
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log('[db] MongoDB connected');
    return true;
  } catch (err) {
    console.warn(`[db] MongoDB unavailable (${err.message}) — running without a database.`);
    return false;
  }
}

export const dbState = () =>
  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
