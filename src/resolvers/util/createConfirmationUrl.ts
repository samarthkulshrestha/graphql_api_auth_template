import { redis } from "../../redis";
import { v4 } from "uuid";
import { confirmationPrefix } from "./constants/redisPrefixes";

export const createConfirmationUrl = async (userID: string) => {
  const token = v4();
  await redis.set(confirmationPrefix + token, userID, "EX", 60 * 60 * 24 * 7); // Expires in a week

  return `http://localhost:3000/auth/confirm/${token}`;
};
