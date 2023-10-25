import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import AGModel from '/node_modules/ag-model/ag-model.js';
import { Parser } from '/node_modules/expr-eval/dist/index.mjs';

const DEFAULT_DEBOUNCE_DELAY = 300;
const DEFAULT_RELOAD_DELAY = 0;

export function toSafeHTML(text) {
  if (typeof text === 'string') {
    return text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } else if (text != null && typeof text.toString !== 'function') {
    return '[invalid]';
  }
  return text;
}

export function debouncer() {
  let debounceTimeout = null;
  return function (callback, duration) {
    if (duration == null) duration = DEFAULT_DEBOUNCE_DELAY;
    debounceTimeout && clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      debounceTimeout = null;
      callback.call(this);
    }, duration);
  };
}

export function toSafeModelValue(value) {
  return Object.fromEntries(
    Object.entries(value || {}).map(
      ([key, value]) => [ key, toSafeHTML(value) ]
    )
  );
}

export function createReactiveCollection(collectionOptions, callback) {
  let collection = new AGCollection({
    changeReloadDelay: DEFAULT_RELOAD_DELAY,
    ...collectionOptions
  });

  (async () => {
    for await (let { error } of collection.listener('error')) {
      console.error(error);
    }
  })();

  collection.safeValue = [];

  (async () => {
    let changes = {};
    for await (let event of collection.listener('change')) {
      if (event.resourceId != null && changes[event.resourceId] !== false) {
        changes[event.resourceId] = event.isRemote;
      }

      if (!collection.isLoaded) continue;

      collection.safeValue = collection.value.map(toSafeModelValue);

      callback({
        changes
      });
      changes = {};
    }
  })();

  (async () => {
    for await (let event of collection.listener('load')) {
      if (collection.isLoaded && !collection.value.length) {
        callback({
          changes: {}
        });
      }
    }
  })();

  return collection;
}

export function createReactiveModel(modelOptions, callback) {
  let model = new AGModel({
    ...modelOptions
  });

  model.safeValue = {};

  (async () => {
    for await (let { error } of model.listener('error')) {
      console.error(error);
    }
  })();

  (async () => {
    let changes = {};
    for await (let event of model.listener('change')) {
      if (changes[event.resourceField] !== false) {
        changes[event.resourceField] = event.isRemote;
      }

      model.safeValue = toSafeModelValue(model.value);
      callback({
        changes
      });
      changes = {};
    }
  })();

  return model;
}

export function createCollection(collectionOptions) {
  let collection = new AGCollection({
    changeReloadDelay: DEFAULT_RELOAD_DELAY,
    ...collectionOptions
  });

  (async () => {
    for await (let { error } of collection.listener('error')) {
      console.error(error);
    }
  })();

  (async () => {
    for await (let event of collection.listener('change')) {
      if (!collection.isLoaded) continue;
      collection.safeValue = collection.value.map(toSafeModelValue);
    }
  })();

  return collection;
}

export function createModel(modelOptions) {
  let model = new AGModel({
    ...modelOptions
  });

  (async () => {
    for await (let { error } of model.listener('error')) {
      console.error(error);
    }
  })();

  (async () => {
    for await (let event of model.listener('change')) {
      model.safeValue = toSafeModelValue(model.value);
    }
  })();

  return model;
}

let templateFormatters = {
  url: (value) => String(value).toLowerCase().replace(/ /g, '-'),
  lowerCase: (value) => String(value).toLowerCase(),
  upperCase: (value) => String(value).toUpperCase(),
  capitalize: (value) => {
    let valueString = String(value);
    return `${valueString.slice(0, 1).toUpperCase()}${valueString.slice(1)}`;
  },
  trim: (value) => String(value).trim(),
  fallback: (...args) => {
    return args.filter(arg => arg)[0];
  }
};

let templateTagsRegExp = /{{[^}]+}}/g;

export function renderTemplate(templateString, data) {
  return templateString.replace(templateTagsRegExp, (match) => {
    let expString = match.slice(2, -2);
    let options = {
      ...templateFormatters,
      ...data
    };
    try {
      return toSafeHTML(
        Parser.evaluate(
          expString,
          options
        )
      );
    } catch (error) {
      return match;
    }
  });
}

export function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
