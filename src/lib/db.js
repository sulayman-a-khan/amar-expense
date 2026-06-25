import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global cache to reuse the mongoose connection across hot reloads in
 * development. In production the module scope is sufficient.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000, // generous — raw TCP can succeed while TLS/replica-set discovery still needs more time
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    // MongoServerSelectionError's `.reason` is a TopologyDescription object
    // (type + a Map of per-host ServerDescriptions), not a string. Each
    // server entry usually carries the *actual* underlying error (auth
    // failure, ECONNREFUSED, etc). Walk that structure to surface it,
    // since the top-level message only ever says "timed out".
    let detail = '';
    try {
      const topologyType = e?.reason?.type;
      const serverErrors = [];
      if (e?.reason?.servers && typeof e.reason.servers.forEach === 'function') {
        e.reason.servers.forEach((serverDesc, address) => {
          const err = serverDesc?.error;
          if (err) {
            serverErrors.push(`${address}: ${err.message || err.codeName || err}`);
          }
        });
      }
      const parts = [];
      if (topologyType) parts.push(`topology=${topologyType}`);
      if (serverErrors.length) parts.push(serverErrors.join(' | '));
      detail = parts.length ? ` (${parts.join(' — ')})` : '';
    } catch {
      // best-effort only — never let detail-extraction itself throw
    }
    const enriched = new Error(`${e.message}${detail}`);
    enriched.name = e.name;
    throw enriched;
  }

  return cached.conn;
}

// Named export used by dashboard, bikes, and incomes routes
export { dbConnect as connectToDatabase };

// Default export used by expenses, transactions, and loans-transfers routes
export default dbConnect;