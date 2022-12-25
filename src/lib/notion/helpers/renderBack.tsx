import { isFullBlock } from '@notionhq/client';
import { captureMessage } from '@sentry/node';
import { getImageUrl } from './getImageUrl';
import BlockParagraph from '../blocks/BlockParagraph';
import BlockCode from '../blocks/BlockCode';
import { BlockHeading } from '../blocks/BlockHeadings';
import { BlockQuote } from '../blocks/BlockQuote';
import { BlockDivider } from '../blocks/BlockDivider';
import { BlockChildPage } from '../blocks/BlockChildPage';
import { BlockTodoList } from '../blocks/lists/BlockTodoList';
import { BlockCallout } from '../blocks/BlockCallout';
import { BlockBulletList } from '../blocks/lists/BlockBulletList';
import { BlockNumberedList } from '../blocks/lists/BlockNumberedList';
import { BlockToggleList } from '../blocks/lists/BlockToggleList';
import BlockBookmark from '../blocks/media/BlockBookmark';
import { BlockVideo } from '../blocks/media/BlockVideo';
import { BlockEmbed } from '../blocks/media/BlockEmbed';
import BlockColumn from '../blocks/lists/BlockColumn';
import BlockEquation from '../blocks/BlockEquation';
import LinkToPage from '../blocks/LinkToPage';
import BlockHandler from '../BlockHandler';
import {
  BlockObjectResponse,
  EquationBlockObjectResponse,
  ListBlockChildrenResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export const renderBack = async (
  handler: BlockHandler,
  requestChildren: Array<PartialBlockObjectResponse | BlockObjectResponse>,
  response: ListBlockChildrenResponse,
  handleChildren: boolean | undefined
) => {
  let back = '';
  for (const c of requestChildren) {
    // If the block has been handled before, skip it.
    // This can be true due to nesting
    if (handler.skip.includes(c.id)) {
      continue;
    }

    if (!isFullBlock(c)) {
      captureMessage('Block is not full', {
        extra: c,
        level: 'warning',
      });
      continue;
    }

    switch (c.type) {
      case 'image':
        if (!handler.settings.learnMode) {
          const image = await handler.embedImage(c);
          back += image;
        } else {
          back += `<img src='${getImageUrl(c)}' />`;
        }
        break;
      case 'audio':
        const audio = await handler.embedAudioFile(c);
        back += audio;
        break;
      case 'file':
        const file = await handler.embedFile(c);
        back += file;
        break;
      case 'paragraph':
        back += await BlockParagraph(c, handler);
        break;
      case 'code':
        back += BlockCode(c, handler);
        break;
      case 'heading_1':
        back += await BlockHeading('heading_1', c, handler);
        break;
      case 'heading_2':
        back += await BlockHeading('heading_2', c, handler);
        break;
      case 'heading_3':
        back += await BlockHeading('heading_3', c, handler);
        break;
      case 'quote':
        back += BlockQuote(c, handler);
        break;
      case 'divider':
        back += BlockDivider();
        break;
      case 'child_page':
        back += await BlockChildPage(c, handler);
        break;
      case 'to_do':
        back += await BlockTodoList(c, response, handler);
        break;
      case 'callout':
        back += BlockCallout(c, handler);
        break;
      case 'bulleted_list_item':
        back += await BlockBulletList(c, response, handler);
        break;
      case 'numbered_list_item':
        back += await BlockNumberedList(c, response, handler);
        break;
      case 'toggle':
        back += await BlockToggleList(c, handler);
        break;
      case 'bookmark':
        back += await BlockBookmark(c, handler);
        break;
      case 'video':
        back += BlockVideo(c, handler);
        break;
      case 'embed':
        back += BlockEmbed(c, handler);
        break;
      case 'column':
        back += await BlockColumn(c, handler);
        break;
      case 'equation':
        back += BlockEquation(c as EquationBlockObjectResponse);
        break;
      case 'link_to_page':
        back += await LinkToPage(c, handler);
        break;
      default:
        back += `unsupported: ${c.type}`;
        back += BlockDivider();
        back += `
          <pre>
          ${JSON.stringify(c, null, 4)}
          </pre>`;
        console.debug(`unsupported ${c.type}`);
    }

    // Nesting applies to all not just toggles
    if (
      handleChildren ||
      (c.has_children && c.type !== 'toggle' && c.type !== 'bulleted_list_item')
    ) {
      back += await handler.getBackSide(c);
    }
  }
  return back;
};