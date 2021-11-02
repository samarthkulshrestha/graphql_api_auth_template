import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { User } from "../../../entity/User";

@ValidatorConstraint({ async: true })
export class nametagExistsConstraint implements ValidatorConstraintInterface {
  validate(nametag: string) {
    return (User as any).findOne({ where: { nametag } }).then((user: User) => {
      if (user) return false;
      return true;
    });
  }
}

export function nametagExists(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: nametagExistsConstraint,
    });
  };
}
