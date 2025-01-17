import express from 'express';

import RequireAuthentication from '../../../middleware/RequireAuthentication';
import DB from '../../../lib/storage/db';
import StorageHandler from '../../../lib/storage/StorageHandler';
import { sendError } from '../../../lib/error/sendError';

const router = express.Router();

const storage = new StorageHandler();
router.get('/u/:key', RequireAuthentication, async (req, res) => {
  const { key } = req.params;
  console.debug(`download ${key}`);
  if (!key) {
    return res.status(400).send();
  }
  const { owner } = res.locals;
  const query = { key, owner };
  try {
    const match = await DB('uploads').where(query).returning(['key']).first();
    if (match) {
      const file = await storage.getFileContents(match.key);
      res.send(file.Body);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    console.error(error);
    console.info('unknown error');
    res.status(404).send();
    sendError(error);
  }
});

export default router;
