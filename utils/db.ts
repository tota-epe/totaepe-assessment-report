import mongoose from 'mongoose';

const connectToDatabase = async () => mongoose.connect(process.env.MONGODB_URI);

export default connectToDatabase;
