import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import AGModel from '/node_modules/ag-model/ag-model.js';
import * as uuid from '/node_modules/uuid/dist/esm-browser/index.js';
import { sha256 } from './sha256.js';

const DEFAULT_DEBOUNCE_DELAY = 300;
const DEFAULT_RELOAD_DELAY = 0;

export function toSafeHTML(text) {
  if (typeof text === 'string') {
    return text.replace(/&(?!(amp|lt|gt|quot|#039|#123|#125);)/g, '&amp;')
      .replace(/<(?!br ?\/?>)/g, '&lt;')
      .replace(/(?<!br ?\/?)>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\{/g, '&#123;')
      .replace(/\}/g, '&#125;')
      .replace(/\n/g, '<br>');
  } else if (text != null && typeof text.toString !== 'function') {
    return '[invalid]';
  }
  return text;
}

export function toExpression(html) {
  return html.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
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
      // Ignore change events which originate from this collection instance.
      if (!event.isRemote) continue;

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

  if (collection.isLoaded) {
    collection.safeValue = collection.value.map(toSafeModelValue);
  }

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

  if (model.isLoaded) {
    model.safeValue = toSafeModelValue(model.value);
  }

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

  if (collection.isLoaded) {
    collection.safeValue = collection.value.map(toSafeModelValue);
  }

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

  if (model.isLoaded) {
    model.safeValue = toSafeModelValue(model.value);
  }

  return model;
}

export { uuid };

export function computeId(...parts) {
  let encoder = new TextEncoder();
  let data = encoder.encode(parts.join('-'));
  let hashBuffer = sha256(data);
  let hashArray = Array.from(new Uint8Array(hashBuffer));
  let hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  let idHex = hashHex.slice(0, 32);

  let third = (
    (parseInt(idHex.slice(12, 16), 16) & 0x0fff) | 0x4000
  ).toString(16);

  let fourth = (
    (parseInt(idHex.slice(16, 20), 16) & 0x3fff) | 0x8000
  ).toString(16);

  return `${idHex.slice(0, 8)}-${idHex.slice(8, 12)}-${third}-${fourth}-${idHex.slice(20, 32)}`;
}

export function toDate(timestamp) {
  let date = new Date(timestamp);
  let year = date.getFullYear();
  let month = date.toLocaleString('default', { month: 'long' });
  let day = date.getDate();
  let hour = date.getHours();
  let minutes = date.getMinutes();
  return `${month} ${day}, ${year} at ${hour}:${minutes.toString().padStart(2, '0')}`;
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
  },
  date: (timestamp) => toDate(timestamp),
  joinFields: (list, field, sep) => {
    return list.map(item => item[field]).join(sep);
  },
  combineFilters: (filterMap, useOr) => {
    return Object.values(filterMap || {}).join(useOr ? ' ~OR~ ' : ' ~AND~ ');
  },
  computeId,
  safeString: toSafeHTML
};

let templateTripleTagsRegExp = /{{{.*?}}}/gs;
let templateTagsRegExp = /{{.*?}}/gs;

function execExpression(expression, options) {
  let keys = Object.keys(options);
  let args = [
    ...keys,
    `return (function () {
      return (${expression});
    })();`
  ];
  return (new Function(...args))(...keys.map(key => options[key]));
}

function getRenderOptions(data, socket) {
  return {
    ...templateFormatters,
    uuid,
    socket: socket ? {
      state: socket.state,
      pendingReconnect: socket.pendingReconnect,
      connectAttempts: socket.connectAttempts,
      authState: socket.authState,
      authToken: socket.authToken
    } : undefined,
    ...data
  };
}

function* selectExpressions(string) {
  let charList = string.split('');
  let isCapturing = false;
  let isTripleBracket = false;
  let captureList = [];
  for (let i = 1; i < charList.length; i++) {
    if (charList[i - 1] === '{' && charList[i] === '{') {
      captureList = [];
      captureList.push('{');
      isCapturing = true;
      isTripleBracket = charList[i - 2] === '{';
      if (isTripleBracket) {
        captureList.push('{');
      }
    }
    if (isCapturing) {
      captureList.push(charList[i]);
    } else if (captureList.length) {
      captureList.push('}');
      captureList.push('}');
      if (isTripleBracket) {
        captureList.push('}');
      }
      yield captureList.join('');
      captureList = [];
    }
    if (
      charList[i + 1] === '}' && charList[i + 2] === '}' &&
      (!isTripleBracket || charList[i + 3] === '}')
    ) {
      isCapturing = false;
    }
  }
}

export function renderTemplate(templateString, data, socket) {
  let expressionIterator = selectExpressions(templateString);
  let options = getRenderOptions(data, socket);
  for (let expression of expressionIterator) {
    let computedValue;
    if (expression.match(templateTripleTagsRegExp)) {
      let expString = expression.slice(3, -3);
      try {
        computedValue = execExpression(
          toExpression(expString),
          options
        );
      } catch (error) {
        computedValue = expression;
      }
    } else {
      let expString = expression.slice(2, -2);
      try {
        computedValue = toSafeHTML(
          execExpression(
            toExpression(expString),
            options
          )
        );
      } catch (error) {
        computedValue = expression;
      }
    }
    templateString = templateString.replace(expression, computedValue);
  }
  return templateString;
}

export function updateConsumerElements(consumers, value, template, sourceElementName, outputType) {
  if (consumers) {
    let consumerParts = consumers.split(',')
      .filter(part => part)
      .map(part => {
        part = part.trim();
        return part.split(':').map(subPart => subPart.trim());
      })
      .filter(([ selector, attributeName ]) => selector);

    if (template) {
      value = renderTemplate(template, { value });
    }

    if (outputType === 'boolean') {
      value = value !== 'false' && value !== '';
    } else if (outputType === 'number') {
      value = Number(value);
    }

    for (let [ selector, attributeName ] of consumerParts) {
      let matchingElements = document.querySelectorAll(selector);
      if (attributeName) {
        for (let element of matchingElements) {
          if (typeof value === 'boolean') {
            if (value) {
              element.setAttribute(attributeName, '');
            } else {
              element.removeAttribute(attributeName);
            }
          } else {
            element.setAttribute(attributeName, value);
          }
        }
      } else {
        for (let element of matchingElements) {
          if (element.nodeName === 'INPUT') {
            if (element.type === 'checkbox') {
              if (value) {
                element.setAttribute('checked', '');
              } else {
                element.removeAttribute('checked');
              }
            } else {
              element.value = value;
            }
          } else if (element.nodeName === 'MODEL-INPUT') {
            element.value = value;
          } else if (
            element.nodeName === 'INPUT-TRANSFORMER' ||
            element.nodeName === 'INPUT-PROVIDER'
          ) {
            element.setAttribute('value', value);
          } else if (element.nodeName === 'INPUT-COMBINER') {
            element.setAttribute(
              'value',
              sourceElementName ? `${sourceElementName}:${value}` : value
            );
          } else {
            element.innerHTML = value;
          }
        }
      }
    }
  }
}

export function generateRandomHexString(byteLength) {
  let byteArray = new Uint8Array(byteLength);
  crypto.getRandomValues(byteArray);
  return Array.from(byteArray, byte => {
    let firstChar = byte >> 4;
    firstChar = firstChar < 10 ? String(firstChar) : String.fromCharCode(firstChar + 87);
    let secondChar = byte & 0x0f;
    secondChar = secondChar < 10 ? String(secondChar) : String.fromCharCode(secondChar + 87);
    return `${firstChar}${secondChar}`;
  }).join('');
}

export const fieldPartsRegExp = /("[^"]*"|'[^']*'|\([^)]*\)|[^,()"']+)+/g;
export const fieldPartsRegExpWithEmpty = /((^|(?<=,))((?=,)|$)|"[^"]*"|'[^']*'|\([^)]*\)|[^,()"']+)+/g

export const quotedContentRegExp = /^\s*["']?(.*?)["']?\s*$/;

export function toBoolean(value) {
  return !!value && value !== 'false' && value !== 'null' && value !== 'undefined';
}

export const typeCastFunctions = {
  text: String,
  textarea: String,
  checkbox: toBoolean,
  radio: String,
  select: String,
  'text-select': String,
  number: Number,
  string: String,
  boolean: toBoolean
};

export function getTypeCastFunction(type) {
  return typeCastFunctions[type] || ((value) => value);
}

export function convertStringToFieldParams(string, allowEmpty) {
  let partsRegExp = allowEmpty ? fieldPartsRegExpWithEmpty : fieldPartsRegExp;
  let parts = ((string || '').match(partsRegExp) || []).map(field => field.trim());
  let fieldTypeValues = parts.map((part) => {
    let subParts = part.split('=');
    let nameType = (subParts[0] || '').split(':');
    let name = nameType[0];
    let type = nameType[1] || 'text';
    let value = subParts.slice(1).join('=').replace(quotedContentRegExp, '$1');
    return {
      name,
      type,
      value
    }
  });
  let fieldNames = fieldTypeValues.map(item => item.name);
  let fieldTypes = Object.fromEntries(
    fieldTypeValues.map(item => [ item.name, item.type ])
  );
  let fieldValues = Object.fromEntries(
    fieldTypeValues.map(
      (item) => {
        let type = fieldTypes[item.name];
        let Type = getTypeCastFunction(type);
        return [ item.name, Type(item.value) ];
      }
    )
  );
  return {
    fieldNames,
    fieldTypes,
    fieldValues
  };
}

export function formatError(error) {
  return error.code === 1009 ? 'Resource exceeded the maximum size' : error.message;
}

export function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
