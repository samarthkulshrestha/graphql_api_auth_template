import { InputType, Field } from "type-graphql";
import { Length, IsEmail } from "class-validator";
import { emailExists } from "./valConstraints/emailExists";
import { nametagExists } from "./valConstraints/nametagExists";

@InputType()
export class UserRegisterInput {
  @Field()
  @Length(1, 48)
  @nametagExists({ message: "nametag already in use" })
  nametag: string;

  @Field()
  @IsEmail()
  @emailExists({ message: "email already in use" })
  @Length(6, 128)
  email: string;

  @Field()
  password: string;
}

@InputType()
export class UserLoginInput {
  @Field()
  @Length(1, 48)
  identifier: string;

  @Field()
  password: string;
}

@InputType()
export class resetPasswordInput {
  @Field()
  token: string;

  @Field()
  password: string;
}
