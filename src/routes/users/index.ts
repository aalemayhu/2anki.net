import * as Sentry from '@sentry/node';
import express from 'express';

import DB from '../../lib/storage/db';

import EmailHandler from '../../lib/email/EmailHandler';
import TokenHandler from '../../lib/misc/TokenHandler';
import RequireAuthentication from '../../middleware/RequireAuthentication';
import updatePassword from '../../lib/User/updatePassword';
import comparePassword from '../../lib/User/comparePassword';
import hashPassword from '../../lib/User/hashPassword';
import { INDEX_FILE } from '../../lib/constants';
import { sendError } from '../../lib/error/sendError';

const router = express.Router();

const isValidUser = (password: string, name: string, email: string) => {
  if (!password || !name || !email) {
    return false;
  }
  return true;
};

router.post('/new-password', async (req, res, next) => {
  const resetToken = req.body.reset_token;
  const { password } = req.body;
  if (
    !resetToken ||
    resetToken.length < 128 ||
    !password ||
    password.length < 8
  ) {
    return res.status(400).send({ message: 'invalid' });
  }

  try {
    await updatePassword(DB, password, resetToken);
    res.status(200).send({ message: 'ok' });
  } catch (error) {
    sendError(error);
    next(new Error('Failed to create new password.'));
  }
});

router.post('/forgot-password', async (req, res, next) => {
  console.debug('forgot password');
  if (!req.body.email) {
    console.debug('no email provided');
    return res.status(400).json({ message: 'Email is required' });
  }
  const user = await DB('users')
    .where({ email: req.body.email })
    .returning(['reset_token', 'id'])
    .first();
  if (!user || !user.id) {
    console.debug('no user found');
    return res.status(200).json({ message: 'ok' });
  }
  console.debug('user found');
  if (user.reset_token) {
    console.debug('has active reset token, so resending');
    await EmailHandler.SendResetEmail(req.body.email, user.reset_token);
    return res.status(200).json({ message: 'ok' });
  }
  console.debug('no active reset token, so creating');
  const resetToken = TokenHandler.NewResetToken();
  try {
    console.debug('updating user reset token');
    await DB('users')
      .where({ email: req.body.email })
      .update({ reset_token: resetToken });
    console.debug('sending reset email');
    await EmailHandler.SendResetEmail(req.body.email, resetToken);
    return res.status(200).json({ message: 'ok' });
  } catch (error) {
    sendError(error);
    return next(error);
  }
});

router.get('/logout', RequireAuthentication, async (req, res, next) => {
  const { token } = req.cookies;
  res.clearCookie('token');
  DB('access_tokens')
    .where({ token })
    .del()
    .then(() => {
      Sentry.setUser(null);
      res.status(200).end();
    })
    .catch((err) => {
      sendError(err);
      next(err);
    });
});

router.post('/login', async (req, res, next) => {
  console.debug('Login attempt');
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({
      message: 'Invalid user data. Required  email and password!',
    });
  }

  try {
    const user = await DB('users')
      .where({ email: email.toLowerCase() })
      .first();
    if (!user) {
      console.debug(`No user matching email ${email}`);
      return res.status(400).json({
        message: 'Unknown error. Please try again or register a new account.',
      });
    }

    const isMatch = comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password.' });
    }
    const token = await TokenHandler.NewJWTToken(user);
    if (token) {
      res.cookie('token', token);
      DB('access_tokens')
        .insert({
          token,
          owner: user.id,
        })
        .onConflict('owner')
        .merge()
        .then(() => res.status(200).json({ token }))
        .catch((err) => {
          sendError(err);
          next(err);
        });
    }
  } catch (error) {
    sendError(error);
    next(
      new Error('Failed to login, please try again or register your account.')
    );
  }
});

router.post('/register', async (req, res, next) => {
  if (
    !req.body ||
    !isValidUser(req.body.password, req.body.name, req.body.email)
  ) {
    res.status(400).json({
      message: 'Invalid user data. Required name, email and password!',
    });
    return;
  }

  const password = hashPassword(req.body.password);
  const { name } = req.body;
  const email = req.body.email.toLowerCase();
  try {
    await DB('users')
      .insert({
        name,
        password,
        email,
      })
      .returning(['id']);
    res.status(200).json({ message: 'ok' });
  } catch (error) {
    sendError(error);
    return next(error);
  }
});

router.get('/r/:id', async (req, res, next) => {
  try {
    const token = req.params.id;
    const isValid = await TokenHandler.IsValidResetToken(token);
    if (isValid) {
      return res.sendFile(INDEX_FILE);
    }
    return res.redirect('/login#login');
  } catch (err) {
    sendError(err);
    next(err);
  }
});

router.get('/debug/locals', RequireAuthentication, (_req, res) => {
  const { locals } = res;
  return res.json({ locals });
});

router.post('/delete-account', RequireAuthentication, async (req, res) => {
  const { owner } = res.locals;
  if (!owner && req.body.confirmed === true) {
    return res.status(400).json({});
  }
  const ownerTables = [
    'access_tokens',
    'favorites',
    'jobs',
    'notion_tokens',
    'patreon_tokens',
    'settings',
    'templates',
    'uploads',
    'blocks',
  ];
  await Promise.all(
    ownerTables.map((tableName) => DB(tableName).where({ owner }).del())
  );
  await DB('users').where({ id: owner }).del();
  res.status(200).json({});
});

export default router;
