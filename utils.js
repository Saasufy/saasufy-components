import AGCollection from '/node_modules/ag-collection/ag-collection.js';
import AGModel from '/node_modules/ag-model/ag-model.js';
import * as uuid from '/node_modules/uuid/dist/esm-browser/index.js';
import { sha256 } from './sha256.js';

const DEFAULT_DEBOUNCE_DELAY = 300;
const DEFAULT_RELOAD_DELAY = 0;

let expressionCharsRegExp = /\$\{(.*?)\}/g;
let backtickRegExp = /`/g;
let templateMultiStartBracesRegExp = /{{{*/g
let templateMultiEndBracesRegExp = /}}}*/g

export function toSafeString(value) {
  return value.replace(expressionCharsRegExp, '$!{$1}')
    .replace(backtickRegExp, `'`)
    .replace(templateMultiStartBracesRegExp, '[[')
    .replace(templateMultiEndBracesRegExp, ']]');
}

export function toSafeHTML(value) {
  if (typeof value === 'string') {
    return toSafeString(value)
      .replace(/&(?!(amp|lt|gt|quot|#039|#123|#125);)/g, '&amp;')
      .replace(/<(?!br ?\/?>)/g, '&lt;')
      .replace(/(?<!br ?\/?)>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\{/g, '&#123;')
      .replace(/\}/g, '&#125;')
      .replace(/\n/g, '<br>');
  } else if (value != null && typeof value.toString !== 'function') {
    return '[invalid]';
  }
  return value;
}

export function toExpression(value) {
  return value.replace(/&amp;/g, '&')
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
    for await (let event of collection.listener('change')) {
      if (!collection.isLoaded) continue;
      collection.safeValue = collection.value.map(toSafeModelValue);
      callback();
    }
  })();

  (async () => {
    for await (let event of collection.listener('load')) {
      if (collection.isLoaded && !collection.value.length) {
        callback();
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
    for await (let event of model.listener('change')) {
      model.safeValue = toSafeModelValue(model.value);
      callback();
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

function execExpression(expression, options) {
  let keys = Object.keys(options);
  let args = [
    ...keys,
    `return (function () {
      return (${expression});
    }).call(this);`
  ];
  return (new Function(...args)).call(this, ...keys.map(key => options[key]));
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
  let captureStartIndex = 0;
  for (let i = 1; i < charList.length; i++) {
    if (charList[i - 1] === '{' && charList[i] === '{') {
      captureList = [];
      captureList.push('{');
      isCapturing = true;
      captureStartIndex = i - 1;
      isTripleBracket = charList[i - 2] === '{';
      if (isTripleBracket) {
        captureList.push('{');
        captureStartIndex--;
      }
    }
    if (isCapturing) {
      captureList.push(charList[i]);
    } else if (captureList.length) {
      captureList.push('}');
      captureList.push('}');
      let closeBrackets = 2;
      if (isTripleBracket) {
        captureList.push('}');
        closeBrackets++;
      }
      yield {
        startIndex: captureStartIndex,
        length: (i + closeBrackets) - captureStartIndex,
        value: captureList.join('')
      };
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

function replaceExpressions(string, replaceFn) {
  let charList = string.split('');
  let matches = [ ...selectExpressions(string) ];
  let charSubs = matches.map(item => String(replaceFn(item.value) ?? '').split(''));
  for (let i = matches.length - 1; i >= 0; i--) {
    let match = matches[i];
    charList.splice(match.startIndex, match.length, ...charSubs[i]);
  }
  return charList.join('');
}

export function renderTemplate(templateString, data, socket, autoExecFunction) {
  let options = getRenderOptions(data, socket);
  return replaceExpressions(templateString, (expression) => {
    let expString;
    if (expression.startsWith('{{{') && expression.endsWith('}}}')) {
      expString = expression.slice(3, -3);
      try {
        let result = execExpression.call(
          this,
          toExpression(expString),
          options
        );
        if (typeof result === 'function') {
          if (!autoExecFunction) {
            return expression;
          }
          result = result();
        }
        return result;
      } catch (error) {
        return expression;
      }
    }
    expString = expression.slice(2, -2);
    try {
      let result = execExpression.call(
        this,
        toExpression(expString),
        options
      );
      if (typeof result === 'function') {
        if (!autoExecFunction) {
          return expression;
        }
        result = result();
      }
      return toSafeHTML(result);
    } catch (error) {
      return expression;
    }
  });
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
      value = renderTemplate.call(this, template, { value }, null, true);
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

export const unescapedEqualRegExp = /(?<!\\)=/;
export const escapedEqualRegExp = /\\=/g;

export function unescapeEqualSigns(value) {
  return value.replace(escapedEqualRegExp, '=');
}

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

export function convertStringToFieldTypeValues(string, allowEmpty, unescapeEqual) {
  let partsRegExp = allowEmpty ? fieldPartsRegExpWithEmpty : fieldPartsRegExp;
  let parts = ((string || '').match(partsRegExp) || []).map(field => field.trim());
  return parts.map((part) => {
    let subParts;
    if (unescapeEqual) {
      subParts = part.split(unescapedEqualRegExp).map(unescapeEqualSigns);
    } else {
      subParts = part.split(unescapedEqualRegExp);
    }
    let nameType = (subParts[0] || '').split(':');
    let field = nameType[0];
    let type = nameType[1] || 'text';
    let value = subParts.length > 1 ? subParts.slice(1).join('=').replace(quotedContentRegExp, '$1') : undefined;
    return {
      field,
      type,
      value
    }
  });
}

export function convertStringToFieldParams(string, allowEmpty, unescapeEqual) {
  let fieldTypeValues = convertStringToFieldTypeValues(string, allowEmpty, unescapeEqual);
  let fieldNames = fieldTypeValues.map(item => item.field);
  let fieldTypes = Object.fromEntries(
    fieldTypeValues.map(item => [ item.field, item.type ])
  );
  let fieldValues = Object.fromEntries(
    fieldTypeValues.map(
      (item) => {
        let type = fieldTypes[item.field];
        let Type = getTypeCastFunction(type);
        return [ item.field, Type(item.value) ];
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

export function getBatches(list, batchSize) {
  let batches = [];
  let currentBatch = [];
  for (let item of list) {
    if (currentBatch.length >= batchSize) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    currentBatch.push(item);
  }
  if (currentBatch.length) {
    batches.push(currentBatch);
  }
  return batches;
}

export async function getRecordIds({ socket, type, viewName, viewParams, startPage, maxPages, pageSize }) {
  if (startPage == null) startPage = 0;
  if (maxPages == null) maxPages = 10;
  if (pageSize == null) pageSize = 100;
  let currentPage = startPage;
  let lastPage = currentPage + maxPages;
  let isLastPage = false;
  let modelIds = [];
  while (!isLastPage && currentPage < lastPage) {
    let result = await socket.invoke('crud', {
      action: 'read',
      type,
      offset: currentPage * pageSize,
      view: viewName,
      viewParams,
      pageSize
    });
    isLastPage = result.isLastPage;
    modelIds.push(...result.data);
    currentPage++;
  }
  return modelIds;
}

export async function getRecord({ socket, type, id, fields }) {
  if (!fields) {
    return socket.invoke('crud', {
      action: 'read',
      type,
      id
    });
  }
  let data = await Promise.all(
    fields.map(async (field) => {
      return socket.invoke('crud', {
        action: 'read',
        type,
        id,
        field
      });
    })
  );
  let fieldCount = fields.length;
  let record = {};
  for (let i = 0; i < fieldCount; i++) {
    record[fields[i]] = data[i];
  }
  return record;
}

export async function getRecordCount({ socket, type, viewName, viewParams, offset }) {
  let result = await socket.invoke('crud', {
    action: 'read',
    type,
    offset: offset || 0,
    view: viewName,
    viewParams,
    pageSize: 0,
    getCount: true
  });
  return Math.max(result.count - offset, 0);
}

export async function* generateRecords({ socket, type, viewName, viewParams, fields, startPage, pageSize, maxAttempts }) {
  if (startPage == null) startPage = 0;
  if (pageSize == null) pageSize = 100;
  if (maxAttempts == null) maxAttempts = 10;
  
  let currentPage = startPage;
  let isLastPage = false;
  let failureCount = 0;

  while (!isLastPage) {
    try {
      let result = await socket.invoke('crud', {
        action: 'read',
        type,
        offset: currentPage * pageSize,
        view: viewName,
        viewParams,
        pageSize
      });
      let idList = result.data || [];
      for (let id of idList) {
        yield await getRecord({ socket, type, id, fields });
      }
      isLastPage = result.isLastPage;
      currentPage++;
      failureCount = 0;
    } catch (error) {
      if (++failureCount > maxAttempts) {
        throw new Error(`Record generation failed after max consecutive attempts because of error: ${error.message}`);
      }
    }
  }
}

export async function getRecords({ socket, type, viewName, viewParams, fields, startPage, maxPages, pageSize }) {
  let recordIds = await getRecordIds({ socket, type, viewName, viewParams, startPage, maxPages, pageSize });
  let recordIdBatches = getBatches(recordIds, pageSize);
  let records = [];
  for (let idBatch of recordIdBatches) {
    let recordBatch = await Promise.all(
      idBatch.map(async (id) => {
        return getRecord({ socket, type, id, fields });
      })
    );
    records.push(...recordBatch);
  }
  return records;
}

export function logAttributeChanges(...elementSelectors) {
  let domObserverCallback = (mutationList) => {
    for (let mutation of mutationList) {
      let matchingSelector = (elementSelectors || []).find(elementSelector => mutation.target?.matches(elementSelector));
      let isWatchingElement = !elementSelectors.length || !!matchingSelector;
      if (mutation.type === 'attributes' && isWatchingElement) {
        let identifier = mutation.target.id || matchingSelector || mutation.target.nodeName?.toLowerCase();
        console.log(
          `[${identifier}] Attribute ${
            mutation.attributeName
          } changed to: ${
            mutation.target.getAttribute(mutation.attributeName)
          }`
        );
      }
    }
  };

  let observer = new MutationObserver(domObserverCallback);

  let config = {
    attributes: true,
    subtree: true,
    attributeOldValue: true
  };

  observer.observe(document, config);
  return () => {
    observer.disconnect();
  };
}

export function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}