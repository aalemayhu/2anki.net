import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';

import Switch from '../../../components/input/Switch';
import SettingsModal from '../../../components/modals/SettingsModal';
import TemplateSelect from '../../../components/TemplateSelect';
import Backend from '../../../lib/Backend';
import NotionObject from '../../../lib/interfaces/NotionObject';
import StoreContext from '../../../store/StoreContext';
import RuleDefinition from './RuleDefinition';

interface Props {
  type: string;
  id: string;
  setDone: () => void;
  parent: string;
  isFavorite: boolean;
  setFavorites: Dispatch<SetStateAction<NotionObject[]>>;
}

const flashCardOptions = [
  'toggle',
  'bulleted_list_item',
  'numbered_list_item',
  'heading',
  'column_list',
];
const tagOptions = ['heading', 'strikethrough'];
const subDeckOptions = ['child_page', ...flashCardOptions];

const backend = new Backend();
function DefineRules(props: Props) {
  const {
    type, id, setDone, parent, isFavorite, setFavorites,
  } = props;
  const [rules, setRules] = useState({
    flashcard_is: ['toggle'],
    sub_deck_is: ['child_page'],
    tags_is: 'strikethrough',
    deck_is: 'page',
    email_notification: false,
  });

  const [isLoading, setIsloading] = useState(true);
  const [, setFlashcard] = useState(rules.flashcard_is);
  const [, setSubDeck] = useState(rules.sub_deck_is);
  const [tags, setTags] = useState(rules.tags_is);
  const [sendEmail, setSendEmail] = useState(rules.email_notification);
  const [more, setMore] = useState(false);
  const [favorite, setFavorite] = useState(isFavorite);

  const store = useContext(StoreContext);

  useEffect(() => {
    backend
      .getRules(id)
      .then((response) => {
        if (response.data) {
          const newRules = response.data;
          newRules.flashcard_is = newRules.flashcard_is.split(',');
          newRules.sub_deck_is = newRules.sub_deck_is.split(',');
          setRules(newRules);
          setSendEmail(newRules.email_notification);
        }
        setIsloading(false);
      })
      .catch((error) => {
        store.error = error;
      });
  }, [id]);

  const saveRules = async (event) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }
    setIsloading(true);

    try {
      await backend.saveRules(
        id,
        rules.flashcard_is,
        'page',
        rules.sub_deck_is,
        tags,
      );
      setDone();
    } catch (error) {
      store.error = error;
    }
  };

  const onSelectedFlashcardTypes = (fco: string) => {
    const included = rules.flashcard_is.includes(fco);
    if (!included) {
      rules.flashcard_is.push(fco);
    } else if (included) {
      rules.flashcard_is = rules.flashcard_is.filter((f) => f !== fco);
    }
    setFlashcard((prevState) => Array.from(new Set([...prevState, ...rules.flashcard_is])));
  };

  const onSelectedSubDeckTypes = (fco: string) => {
    const included = rules.sub_deck_is.includes(fco);
    if (!included) {
      rules.sub_deck_is.push(fco);
    } else {
      rules.sub_deck_is = rules.sub_deck_is.filter((f) => f !== fco);
    }
    setSubDeck((prevState) => Array.from(new Set([...prevState, ...rules.sub_deck_is])));
  };

  const toggleFavorite = async () => {
    if (favorite) {
      await backend.deleteFavorite(id);
    } else {
      await backend.addFavorite(id, type);
    }
    const favorites = await backend.getFavorites();
    setFavorites(favorites);
    setFavorite(!favorite);
  };

  return (
    <div className="modal is-active">
      <div className="modal-background" />
      <div className="modal-card">
        <div className="card" style={{ maxWidth: '480px' }}>
          <header className="card-header">
            <p className="card-header-title">
              Settings for
              {' '}
              {parent}
            </p>
            {isLoading && (
              <button
                aria-label="loading"
                type="button"
                className="m-2 card-header-icon button is-loading"
              />
            )}
            <div className="card-header-icon">
              <button
                onClick={() => setDone()}
                aria-label="delete"
                type="button"
                className="delete"
              />
            </div>
          </header>
          {!isLoading && (
            <>
              {more && (
                <SettingsModal
                  pageId={id}
                  pageTitle={parent}
                  isActive={more}
                  onClickClose={() => {
                    setMore(false);
                  }}
                />
              )}
              <div className="card-content">
                <RuleDefinition
                  title="Children types - What is a sub deck?"
                  description="You can organise the way you want it to be"
                  value={rules.sub_deck_is}
                  options={subDeckOptions}
                  onSelected={onSelectedSubDeckTypes}
                />
                <RuleDefinition
                  title="Flashcard Types - What is a flashcard?"
                  description="Select the types of flashcards you want to enable"
                  value={rules.flashcard_is}
                  options={flashCardOptions}
                  onSelected={onSelectedFlashcardTypes}
                />
                <div className="my-4">
                  <h2 className="subtitle">Card fields</h2>
                  <TemplateSelect
                    pickedTemplate={(name: string) => setTags(name)}
                    values={tagOptions.map((fco) => ({
                      label: `Tags are ${fco}`,
                      value: fco,
                    }))}
                    name="Tags"
                    value={rules.tags_is}
                  />
                </div>
                <h2 className="subtitle">Miscallenous</h2>
                <Switch
                  key="email-notification"
                  id="email-notification"
                  title="Receive email notifications when deck(s) are ready"
                  checked={sendEmail}
                  onSwitched={() => {
                    rules.email_notification = !rules.email_notification;
                    setSendEmail(rules.email_notification);
                  }}
                />
                <Switch
                  key="is-favorite"
                  id="is-favorite"
                  title="Mark this as a favorite"
                  checked={favorite}
                  onSwitched={toggleFavorite}
                />
                <div className="has-text-centered">
                  <hr />
                  <button
                    type="button"
                    className="button is-small"
                    onClick={() => setMore(!more)}
                  >
                    More!
                  </button>
                </div>
              </div>
              <footer className="card-footer">
                <a
                  href="/save-rules"
                  className="card-footer-item"
                  onClick={(event) => {
                    event.preventDefault();
                    saveRules(event);
                  }}
                >
                  Save
                </a>
                <a
                  href="/cancel-rules"
                  className="card-footer-item"
                  onClick={(event) => {
                    event.preventDefault();
                    setDone();
                  }}
                >
                  Cancel
                </a>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DefineRules;
