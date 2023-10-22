import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import AGModel from '/node_modules/ag-model/ag-model.js';

const DEFAULT_DEBOUNCE_DELAY = 300;
const DEFAULT_RELOAD_DELAY = 0;

export function getSafeHTML(text) {
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

export function getSafeModelValue(value) {
  return Object.fromEntries(
    Object.entries(value || {}).map(
      ([key, value]) => [ key, getSafeHTML(value) ]
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

      collection.safeValue = collection.value.map(getSafeModelValue);

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

      model.safeValue = getSafeModelValue(model.value);
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
      collection.safeValue = collection.value.map(getSafeModelValue);
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
      model.safeValue = getSafeModelValue(model.value);
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
  }
};

export function renderTemplate(templateString, dataType, data) {
  for (let [ field, value ] of Object.entries(data)) {
    let safeValue = getSafeHTML(value);
    for (let [ formatName, formatFunction ] of Object.entries(templateFormatters)) {
      let formatRegExp = new RegExp(`{{${formatName}:${dataType}.${field}}}`, 'g');
      templateString = templateString.replace(formatRegExp, formatFunction(safeValue));
    }
    let regExp = new RegExp(`{{${dataType}.${field}}}`, 'g');
    templateString = templateString.replace(regExp, safeValue);
  }
  return templateString;
}

export function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
