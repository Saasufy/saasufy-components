# WebSocket API

## Overview

Saasufy exposes a powerful WebSocket API which allows you to integrate with your Saasufy service in complex ways; it supports CRUD operations and subscriptions for data changes. This API can be used to build custom components which interact with Saasufy data or to integrate with third-party services.

The Saasufy WebSocket CRUD API and Subscribe API are implemented on top of the SocketCluster protocol.
It is recommended to use the `socketcluster-client` library: http://npmjs.org/socketcluster-client

You can connect a SocketCluster client socket to your Saasufy service like this:
```js
// The the script URL/path may differ depending on your setup
import {
  create as createSocket
} from 'https://saasufy.com/node_modules/socketcluster-client/socketcluster-client.min.js';

// Change the path with that of your own service
let clientSocket = createSocket({
  hostname: 'saasufy.com',
  port: 443,
  secure: true,
  path: '/sid8001/socketcluster/'
});
```

## CRUD API

All CRUD operations can be invoked on a client socket like this:

```js
await clientSocket.invoke('crud', queryObject);
```

The format of the `queryObject` for various operations is shown below.

### Read collection view
```json
{
    "action": "read",
    "type": "Product",
    "offset": 0,
    "view": "categoryView",
    "viewParams": {
        "categoryName": "Electronics"
    },
    "pageSize": 10
}
```
This API returns a response object with `data` and `isLastPage` properties. The `data` property holds an array of IDs - The recommended approach is to load the list of IDs and then fetch individual properties on demand. The Saasufy service uses lightweight WebSocket frames and caches resources on the back end so it's acceptable to make a relatively large number of requests for individual fields.

If `getCount` is true, the operation will return the total number of records which exist in the specified view via a `count` property. Note that this can become computationally expensive if the view has a large number of records.

### Create model instance
```json
{
    "action": "create",
    "type": "Product",
    "value": {
        "name": "Pixel 7",
        "brand": "Google",
        "categoryName": "Electronics"
    }
}
```
An optional `id` field can be specified as part of the `value` object. If it is not specified, then the `id` will be created automatically by Saasufy.

### Update model instance
```json
{
    "action": "update",
    "type": "Product",
    "id": "2201ec45-1c7c-4a5f-8432-1015b7fc4b92",
    "value": {
        "name": "Pixel 7"
    }
}
```
By default, for efficiency reasons, change notifications related to a specific CRUD action are not sent to the socket which initiated the action. In order to receive such notifications, you should add a top level `publisherId` property to the object. It should be a string of length between 1 and 50 characters. The `publisherId` will be sent to the origin client socket alongside the change notification. It can be used to identify where the action originated.

### Delete model instance
```json
{
    "action": "delete",
    "type": "Product",
    "id": "2201ec45-1c7c-4a5f-8432-1015b7fc4b92"
}
```
In order to receive change notifications back from the client socket which initiated an action, you should add a top level `publisherId` property to the object above. It should be a string of length between 1 and 50 characters. The `publisherId` will be sent to the origin client socket alongside the change notification.

### Read model field
```json
{
    "action": "read",
    "type": "Product",
    "id": "2201ec45-1c7c-4a5f-8432-1015b7fc4b92",
    "field": "name"
}
```
The `field` property can be omitted to read the entire resource object with all available fields.

### Update model field
```json
{
    "action": "update",
    "type": "Product",
    "id": "2201ec45-1c7c-4a5f-8432-1015b7fc4b92",
    "field": "name",
    "value": "Pixel 7"
}
```
In order to receive change notifications back from the client socket which initiated an action, you should add a top level `publisherId` property to the object above. It should be a string of length between 1 and 50 characters. The `publisherId` will be sent to the origin client socket alongside the change notification.

### Update multiple model fields
```json
{
    "action": "update",
    "type": "Product",
    "id": "2201ec45-1c7c-4a5f-8432-1015b7fc4b92",
    "value": {
      "name": "Pixel 7",
      "qty": 3
    }
}
```

### Delete model field
```json
{
    "action": "delete",
    "type": "Product",
    "id": "2201ec45-1c7c-4a5f-8432-1015b7fc4b92",
    "field": "qty"
}
```

## Subscribe API

All subscribe operations can be invoked on a client socket like this:

```js
let channel = clientSocket.subscribe(channelName);
```

Changes can be consumed like this:

```js
for await (let data of channel) {
  // data represents the change object.
}
```

### View changes

The format of the `channelName` is this:

```js
`crud>${viewName}(${viewPrimaryParamsString}):${modelType}`
```

For example, to subscribe to changes to the `categoryView` of the `Product` collection, with the view params `{ categoryName: 'Electronics' }`, the `channelName` to use would be:

```js
'crud>categoryView({"categoryName":"Electronics"}):Product'
```

If there are multiple view params, they must be specified in alphabetical order based on the property name.

### Field changes

The format of the `channelName` is this:

```js
`crud>${modelType}/${modelId}/${modelField}`
```

For example, to subscribe to changes to the `name` field of a `Product` with ID `a3647d32-1aa2-4332-b8bb-8f3c84648cfa`, the `channelName` to use would be:

```js
'crud>Product/a3647d32-1aa2-4332-b8bb-8f3c84648cfa/name'
```

