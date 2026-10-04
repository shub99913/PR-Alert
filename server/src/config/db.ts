import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pralert';
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log(`[Database] MongoDB Connected to cluster...`);
    } catch (err) {
        console.warn(`[Database] Standard MongoDB daemon unavailable. Booting zero-config in-memory cluster replica...`);
        const mongoServer = await MongoMemoryServer.create();
        const memUri = mongoServer.getUri();
        await mongoose.connect(memUri);
        console.log(`[Database] Ephemeral MongoDB Online at Memory Server.`);
    }
};
