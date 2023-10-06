import express, {Request, Response} from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import 'dotenv/config';
import {
  registerEmailValidator,
  registerPasswordValidator,
  loginEmailValidator,
  loginPasswordValidator,
  acceptDataValidator,
} from '../validators/auth-validator';
import {acceptRegistration, getRegistrationToken} from '../repo/user-repo';
import {checkValidatorResult} from './util';
import {sendVerificationEmail} from '../emailer';
import {loginUser, registerUser} from '../services/auth-service';
import {StatusCodes} from 'http-status-codes';
import {
  getEmailFromSession,
  setEmailToSession,
} from '../services/session-service';

const router = express.Router();

router.get(
  '/google',
  passport.authenticate('google', {scope: ['profile', 'email']})
);

router.get(
  '/google/callback',
  passport.authenticate('google', {failureRedirect: '/', session: false}),
  (req, res) => {
    const user = req.user as GoogleStrategy.Profile;
    if (user.emails) {
      req.session.email = user.emails[0].value;
    }
    res.redirect('/');
  }
);

interface RegisterPostData {
  email: string;
  password: string;
}

router.post(
  '/register',
  registerEmailValidator(),
  registerPasswordValidator(),
  checkValidatorResult,
  async (req: Request<{}, {}, RegisterPostData>, res) => {
    const postData: RegisterPostData = req.body;

    await registerUser(postData.email, postData.password);
    await setEmailToSession(req, postData.email);

    return res
      .status(StatusCodes.CREATED)
      .json({message: 'Register successful'});
  }
);

interface LoginPostData {
  email: string;
  password: string;
}

router.post(
  '/login',
  loginEmailValidator(),
  loginPasswordValidator(),
  checkValidatorResult,
  async (req: Request, res: Response) => {
    const postData: LoginPostData = req.body as LoginPostData;

    const user = await loginUser(postData.email, postData.password);
    await setEmailToSession(req, postData.email);

    return res.json({data: {isVerified: user.isVerified}});
  }
);

interface AcceptQueryData {
  token?: string;
}

router.get(
  '/accept',
  acceptDataValidator(),
  checkValidatorResult,
  async (req: Request, res: Response) => {
    const queryData: AcceptQueryData = req.query as AcceptQueryData;
    if (queryData.token) {
      const user = await acceptRegistration(queryData.token);
      if (user) {
        await increaseUserLoginCount(user.email);
        await setEmailToSession(req, user.email);

        return res.redirect('/');
      }
    }
    return res.json({error: 'Email verification has expired'});
  }
);

router.post('/resend-email', async (req: Request, res: Response) => {
  const email = getEmailFromSession(req);
  if (email) {
    const token = await getRegistrationToken(email);
    if (token) {
      sendVerificationEmail(email, token);
    }
    res.json({message: 'Resend email successful'});
  }
});

export default router;
