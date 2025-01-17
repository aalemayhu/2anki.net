import express from 'express';

import StorageHandler from '../../../lib/storage/StorageHandler';
import { PrepareDeck } from '../../../lib/parser/DeckParser';
import Settings from '../../../lib/parser/Settings';
import ErrorHandler, {
  NO_PACKAGE_ERROR,
  UNSUPPORTED_FORMAT_MD,
} from '../../../lib/misc/ErrorHandler';
import Package from '../../../lib/parser/Package';
import cleanDeckName from './cleanDeckname';
import { registerUploadSize } from './registerUploadSize';
import { sendBundle } from './sendBundle';
import { getPackagesFromZip } from './getPackagesFromZip';
import { DECK_NAME_SUFFIX } from '../../../lib/anki/format';
import { UploadedFile } from '../../../lib/storage/types';
import { sendError } from '../../../lib/error/sendError';

export default async function handleUpload(
  storage: StorageHandler,
  req: express.Request,
  res: express.Response
) {
  try {
    const files = req.files as UploadedFile[];
    let packages: Package[] = [];
    let hasMarkdown = false;
    for (const file of files) {
      const filename = file.originalname;
      const settings = new Settings(req.body || {});
      await registerUploadSize(file, res);
      const key = file.key;
      const fileContents = await storage.getFileContents(key);

      if (filename.match(/.html$/)) {
        const d = await PrepareDeck(
          filename,
          [{ name: filename, contents: fileContents.Body }],
          settings
        );
        if (d) {
          const pkg = new Package(d.name, d.apkg);
          packages = packages.concat(pkg);
        }
      } else if (filename.match(/.md$/)) {
        hasMarkdown = true;
      } else if (filename.match(/.zip$/) || key.match(/.zip$/)) {
        const [extraPackages, md] = await getPackagesFromZip(
          fileContents.Body,
          settings
        );
        packages = packages.concat(extraPackages as Package[]);
        if (md) {
          hasMarkdown = true;
        }
      }
    }
    let payload;
    let plen;

    const first = packages[0];
    if (packages.length === 1) {
      if (!first.apkg) {
        const name = first ? first.name : 'untitled';
        throw new Error(`Could not produce APKG for ${name}`);
      }
      payload = first.apkg;
      plen = Buffer.byteLength(first.apkg);
      res.set('Content-Type', 'application/apkg');
      res.set('Content-Length', plen.toString());
      first.name = cleanDeckName(first.name);
      try {
        res.set('File-Name', encodeURIComponent(first.name));
      } catch (err) {
        sendError(err);
        console.info(`failed to set name ${first.name}`);
      }

      // Persisting the deck to spaces
      try {
        await storage.uploadFile(
          storage.uniqify(first.name, DECK_NAME_SUFFIX, 255, DECK_NAME_SUFFIX),
          first.apkg
        );
      } catch (err) {
        sendError(err);
      }

      res.attachment(`/${first.name}`);
      res.status(200).send(payload);
    } else if (packages.length > 1) {
      sendBundle(packages, storage, res);
    } else {
      if (hasMarkdown) {
        ErrorHandler(res, UNSUPPORTED_FORMAT_MD);
      } else {
        ErrorHandler(res, NO_PACKAGE_ERROR);
      }
    }
  } catch (err) {
    sendError(err);
    ErrorHandler(res, err as Error);
  }
}
