import { connectDB } from './db';

// API routes에서 사용하는 dbConnect 함수
export default async function dbConnect() {
  return await connectDB();
}