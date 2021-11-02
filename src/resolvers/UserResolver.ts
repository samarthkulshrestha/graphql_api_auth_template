import { Resolver, Mutation, Arg, Query, Ctx } from "type-graphql";
import { User } from "../entity/User";
import { UserRegisterInput, UserLoginInput, resetPasswordInput } from "./util/validation";
import { TContext } from "./types/TContext";
import argon2 from "argon2";
import { redis } from "../redis";
import { v4 } from "uuid";

import { sendConfirmationEmail } from "./util/sendConfirmationEmail";
import { sendResetPasswordEmail } from "./util/sendResetPasswordEmail";
import { createConfirmationUrl } from "./util/createConfirmationUrl";
import { resetPasswordPrefix, confirmationPrefix } from "./util/constants/redisPrefixes";

@Resolver()
export class UserResolver {
  @Mutation(() => User)
  async registerUser(
    @Arg("opts", () => UserRegisterInput)
    { nametag, email, password }: UserRegisterInput
  ): Promise<User> {
    const hash = await argon2.hash(password);

    const user = await (User as any).create({ nametag, email, password: hash }).save();

    await sendConfirmationEmail(email, await createConfirmationUrl(user.id));

    return user;
  }

  @Mutation(() => User, { nullable: true })
  async loginUser(@Arg("opts", () => UserLoginInput) { identifier, password }: UserLoginInput, @Ctx() ctx: TContext): Promise<User | null> {
    const user = await (User as any).findOne({
      where: [{ email: identifier }, { nametag: identifier }],
    });

    if (!user) {
      return null;
    }

    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return null;
    }

    if (!user.emailConfirmed) {
      return null;
    }

    ctx.req.session!.userID = user.id;

    return user;
  }

  @Mutation(() => Boolean)
  async confirmEmailUser(@Arg("token", () => String) token: string): Promise<Boolean> {
    const userID = await redis.get(confirmationPrefix + token);

    if (!userID) {
      return false;
    }

    await (User as any).update({ id: userID }, { emailConfirmed: true });
    await redis.del(confirmationPrefix + token);

    return true;
  }

  @Mutation(() => Boolean)
  async sendResetPasswordEmailUser(@Arg("email", () => String) email: string): Promise<Boolean> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return false;
    }

    const token = v4();
    await redis.set(resetPasswordPrefix + token, user.id, "EX", 60 * 60 * 24 * 7); // Expires in a week

    await sendResetPasswordEmail(email, `http://localhost:3000/auth/confirm/${token}`);

    return true;
  }

  @Mutation(() => User, { nullable: true })
  async resetPasswordUser(@Arg("opts") { token, password }: resetPasswordInput, @Ctx() ctx: TContext): Promise<User | null> {
    const userID = await redis.get(resetPasswordPrefix + token);

    if (!userID) {
      return null;
    }

    const user = await User.findOne(userID);

    if (!user) {
      return null;
    }

    redis.del(resetPasswordPrefix + token);

    user.password = await argon2.hash(password);
    user.save();

    ctx.req.session!.userID = user.id;

    return user;
  }

  @Mutation(() => Boolean)
  async logoutUser(@Ctx() ctx: TContext): Promise<Boolean> {
    return new Promise((res, rej) =>
      ctx.req.session!.destroy((err) => {
        if (err) {
          console.log(err);
          return rej(false);
        }

        ctx.res.clearCookie("qid");
        return res(true);
      })
    );
  }

  @Query(() => [User])
  allUsers() {
    return (User as any).find();
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: TContext): Promise<User | null | undefined> {
    if (!ctx.req.session!.userID) {
      return null;
    }

    return await (User as any).findOne({ id: ctx.req.session.userID });
  }
}
