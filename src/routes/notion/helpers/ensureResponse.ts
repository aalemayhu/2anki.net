import { Response } from 'express';

import sendError from './sendError';

export default async function ensureResponse(
  call: () => Promise<any>,
  res: Response
): Promise<void> {
  try {
    await call();
  } catch (error) {
    console.error(error);
    sendError(error, res);
  }
}
