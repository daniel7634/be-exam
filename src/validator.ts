import {Request} from 'express';
import {body, validationResult} from 'express-validator';

export const registerEmailValidator = () =>
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .bail()
    .isEmail()
    .withMessage('Not a valid email address');

export const registerPasswordValidator = () =>
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password address is required')
    .bail()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage('Password does not meet the requirements');

export const loginEmailValidator = () =>
  body('email').trim().notEmpty().withMessage('Email address is required');

export const loginPasswordValidator = () =>
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password address is required');

export function getValidateErrorMsg(req: Request): string {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return result.array()[0].msg; // now only return the first error message immediately
  }
  return '';
}
