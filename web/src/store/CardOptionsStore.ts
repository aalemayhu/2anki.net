interface CardOption {
  key: string;
  label: string;
  value: boolean;
  description: string;
}

const loadOption = (key: string, defaultValue: boolean) => {
  const value = localStorage.getItem(key);
  if (value === null) {
    return defaultValue;
  }
  return value === 'true';
};

class CardOptionsStore {
  public options: CardOption[];

  constructor() {
    this.options = this.loadValues();
  }

  public get(key: string): CardOption | undefined {
    return this.options.find((o) => o.key === key);
  }

  public update(key: string, value: boolean) {
    const newOptions = this.options.map((o) => {
      if (o.key === key) {
        return { ...o, value };
      }
      return o;
    });
    localStorage.setItem(key, value.toString());
    this.options = newOptions;
  }

  loadValues(): CardOption[] {
    const v = [
      {
        key: 'add-notion-link',
        label: 'Add Notion Link',
        value: loadOption('add-notion-link', false),
        description:
          'Add a link to the Notion page where the toggle was created. Please this with the (Use Notion ID) to avoid duplicates.',
      },
      {
        key: 'use-notion-id',
        label: 'Use Notion ID',
        value: loadOption('use-notion-id', false),
        description:
          'By default we create a new id from your fields. This can cause duplicates and in those cases you want to enable the Notion ID which is more reliable and avoid duplicates.',
      },
      {
        key: 'all',
        label: 'Use All Toggle Lists',
        value: loadOption('all', false),
        description:
          'By default we only check for toggle lists in the first page. Use this option to retreive toggle lists from anywhere in the page.',
      },
      {
        key: 'paragraph',
        label: 'Use Plain Text for Back',
        value: loadOption('paragraph', false),
        description:
          'This option will remove formatting and get the text content only.',
      },
      {
        key: 'cherry',
        label: 'Enable Cherry Picking Using 🍒 Emoji',
        value: loadOption('cherry', false),
        description:
          'This will Only create flashcards from the toggle lists that include 🍒 in the toggle (header or body)',
      },
      {
        key: 'avocado',
        label:
          "Only Create Flashcards From Toggles That Don't Have The 🥑 Emoji",
        value: loadOption('avocado', false),
        description:
          "This option enables you to ignore certain toggles when creating flashcards from pages that you don't want to change too much.",
      },
      {
        key: 'tags',
        label: 'Treat Strikethrough as Tags',
        value: loadOption('tags', true),
        description:
          'This will go treat the strikethroughs in the page as global ones. The ones inside of a toggle will be treated as locally to the toggle.',
      },
      {
        key: 'cloze',
        label: 'Cloze Deletion',
        value: loadOption('cloze', true),
        description: 'Create cloze flashcards from code blocks.',
      },
      {
        key: 'enable-input',
        label: 'Treat Bold Text as Input',
        value: loadOption('enable-input', false),
        description:
          'Words marked as bold will be removed and you will have to enter them in when reviewing the card. This is useful when you need to type out the answer.',
      },
      {
        key: 'basic-reversed',
        label: 'Basic and Reversed',
        value: loadOption('basic-reversed', false),
        description:
          'Create the question and answer flashcards but also reversed ones. Where the answer and question change places.',
      },
      {
        key: 'reversed',
        label: 'Just the Reversed Flashcards',
        value: loadOption('reversed', false),
        description:
          'Only create flashcards from the reverse. This is useful when you want to say show an image first.',
      },
      {
        key: 'no-underline',
        label: 'Remove Underlines',
        value: loadOption('no-underline', false),
        description:
          'Disable underline. This is an option that was created due to changes in the way Notion handles underlines.',
      },
      {
        key: 'max-one-toggle-per-card',
        label: 'Maximum One Toggle Per Card',
        value: loadOption('max-one-toggle-per-card', false),
        description:
          "This will limit to 1 card so you don't see too many toggles in one card. When you combine this with 'Use all toggle lists' you can create flashcards from everything in your upload, regardless of how deeply nested they are.",
      },
      {
        key: 'remove-mp3-links',
        label: 'Remove the MP3 Links Created From Audio Files',
        value: loadOption('remove-mp3-links', false),
        description:
          "Due to backwards-compatability we leave links untouched but this option let's you remove mp3 links",
      },
      {
        key: 'perserve-newlines',
        label: 'Preserve Newlines in the Toggle Header and Body',
        value: loadOption('perserve-newlines', false),
        description:
          'This will allow you to use SHIFT-Enter in the toggles to create multiple lines for all card types (Basic, Cloze, etc.)',
      },
    ];

    return v.filter(Boolean);
  }

  clear() {
    /**
     * Delete the known options, the app might be storing other things we want.
     */
    const values = this.loadValues();
    for (const v of values) {
      localStorage.removeItem(v.key);
    }
    this.options = this.loadValues();
    this.syncLocalStorage();
  }

  syncLocalStorage() {
    for (const option of this.options) {
      const value = localStorage.getItem(option.key);
      if (value === null) {
        localStorage.setItem(option.key, option.value.toString());
      }
    }
  }
}

export default CardOptionsStore;
