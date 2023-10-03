import path from 'path';

import express, {Request, Response, NextFunction} from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import 'dotenv/config';
import session from 'express-session';
import * as sessionNameSpace from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

import authRouter from './routes/auth';
import userRouter from './routes/user';
import {createGoogleUserIfNotExist, getUser} from './repo';

const app = express();
const port = process.env.PORT || 3000;
const viewsDir = path.join(__dirname, '../views');
const MySQLStore = MySQLStoreFactory(sessionNameSpace);
const options = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT as string, 10),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
};

const sessionMySQLStore = new MySQLStore(options);
sessionMySQLStore
  .onReady()
  .then(() => {
    console.log('MySQLStore ready');
  })
  .catch(error => {
    // Something went wrong.
    console.error(error);
  });

// session
declare module 'express-session' {
  // type for req.session
  interface SessionData {
    email: string;
  }
}

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    store: sessionMySQLStore,
    resave: false,
    saveUninitialized: false,
  })
);

// passport
passport.use(
  new GoogleStrategy.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${process.env.HOST}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile: GoogleStrategy.Profile, cb) => {
      if (!profile.emails) {
        return cb(new Error('There is no email'), profile);
      } else {
        await createGoogleUserIfNotExist(
          profile.displayName,
          profile.emails[0].value
        );
        return cb(null, profile);
      }
    }
  )
);
app.use(passport.initialize());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/user', userRouter);

async function auth(req: Request, res: Response, next: NextFunction) {
  if (req.session.email) {
    const user = await getUser(req.session.email);
    if (user) {
      if (user.isVerified) {
        next();
      } else {
        res.send('Check verification in your email box');
      }
    } else {
      res.sendFile('login.html', {root: viewsDir});
    }
  } else {
    res.sendFile('login.html', {root: viewsDir});
  }
}

app.post('/logout', auth, (req: Request, res: Response) => {
  req.session.destroy(() => {
    console.log('session destroyed');
  });
  res.send('Logout successful');
});

app.get('/', auth, (req: Request, res: Response) => {
  return res.sendFile('dashboard.html', {root: viewsDir});
});

app.listen(port, () => {
  console.log(`Server is listening at prot:${port}`);
});
