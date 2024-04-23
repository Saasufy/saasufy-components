# Saasufy Components
Components for Saasufy

### Application state
- [app-router](#app-router)
- [socket-provider](#socket-provider)

### Collections of resources
- [collection-browser](#collection-browser)
- [collection-adder](#collection-adder)
- [collection-adder-form](#collection-adder-form)
- [collection-deleter](#collection-deleter)
- [collection-reducer](#collection-reducer)

### Single resources
- [model-input](#model-input)
- [model-text](#model-text)
- [model-viewer](#model-viewer)

### User input
- [input-provider](#input-provider)
- [input-combiner](#input-combiner)
- [input-transformer](#input-transformer)

### Authentication
- [log-in-form](#log-in-form)
- [log-out](#log-out)
- [oauth-link](#oauth-link)
- [oauth-handler](#oauth-handler)

### Display groups
- [render-group](#render-group)
- [if-group](#if-group)
- [switch-group](#switch-group)
- [collection-adder-group](#collection-adder-group)

### Modal windows
- [confirm-modal](#confirm-modal)
- [overlay-modal](#overlay-modal)

## Overview

Many Saasufy components use a combination of `<template slot="item">` and `<div slot="viewport">`. Both of these are known as `slotted` elements.

A `<template slot="item">` is an inert/hidden element which the component uses to format its output. The `<div slot="viewport">` is an element which will contain the rendered output of the component.

Components which follow this pattern take templates as input and render them inside the specified `<div slot="viewport">` element. Note that the viewport can be any element and not necessarily a `div`.

The most important thing to remember is that the element marked with the `slot="item"` attribute serves as a template for your component and the element marked with `slot="viewport"` serves as a container for its output. Although the `item` slot is commonly used, components may require different slot names for input templates so it's important to read the documentation carefully.

A component's output consists of instances of your template after they've been populated with data from the component.
You can apply custom CSS/styling to elements that are rendered inside a viewport - It may be useful to add a custom `class` attribute to your viewport element to allow targeting using CSS selectors.

## How to use

### Components

To use a component, you just need to include the relevant `<script>` tag into the `<head>` tag of your `.html` file.
You can simply copy-paste the script tag provided under the `Import` section of the relevant component's documentation.
Make sure that you read the documentation carefully; especially the list of available attributes and acceptable values for each component.

You should only add the script tags for the components which your page uses to avoid wasting bandwidth and unnecessarily delaying page load for your users.
You should always include the `socket.js` script and create a top-level `socket-provider` component if you intend to use components which depend on data from Saasufy.

Linking the scripts directly from `saasufy.com` is the simplest way to get started as it doesn't require loading anything or hosting the scripts yourself.
An alternative approach is to download Saasufy components using `npm install saasufy-components` and self-host them.

### Styling

This project does not impose any specific approach to styling components, however, it comes with an optional `styles.css` stylesheet which can be added inside your `<head>` tag like this:

```html
<link href="https://saasufy.com/node_modules/saasufy-components/styles.css" rel="stylesheet" />
```

### Utility functions

The following utility functions can be used anywhere inside template `{{expression}}` placeholders:

- Generate a unique random ID in UUID format: `{{uuid.v4()}}`
- Generate a deterministic ID in UUID-compatible format derived from one or more values: `{{computeId('value1', 'value2')}}`
- Convert text to a format suitable for use inside a URL: `{{url('This is a test')}}`
- Convert text to lower case: `{{lowerCase('TEST')}}`
- Convert text to upper case: `{{upperCase('test')}}`
- Convert first letter of text to upper case: `{{capitalize('test')}}`
- Remove leading and trailing spaces from text: `{{trim('   test   ')}}`
- Specify one or more fallback values in case values are null or undefined: `{{fallback(Product.imageSrc, 'path/to/default-image.png')}}`
- Format UNIX timestamp as a human-readable date: `{{date(Product.updatedAt)}}`
- Make a string safe by escaping HTML characters: `{{safeString(Product.name)}}`
- Given an array of objects, extract the values from the specified field and join them together into a single comma-separated string: `{{joinFields(Product, 'name')}}`

### Special fields

Saasufy supports a number of special metadata fields which are automatically created and updated on each model record.
Those fields are hidden by default but may be exposed via the Saasufy control panel and used within your application.
The fields are:

- `id`: String, UUID v4 format; the ID of the resource.
- `createdBy`: String, UUID v4 format; if the socket was authenticated, this will hold the ID of the account which created the resource.
- `updatedBy`: String, UUID v4 format; if the socket was authenticated, this will hold the ID of the account which last modified the resource.
- `createdByIp`: String, IP address format; the IP address of the client which last modified the resource.
- `createdAt`: Number, UNIX timestamp format; the timestamp for when the resource was created.
- `updatedAt`: Number, UNIX timestamp format; the timestamp for when the resource was last modified.

All of the above fields except for the `id` field are hidden by default and must be exposed via the Saasufy control panel in order to be accessible within your front end application.
To expose a special field on a specific model, you just need to create a field with the same name under the `fields` section of the relevant model.
You will need to make sure that the type you specify (`String` or `Number`) matches the type of the special field described above.
You will need to deploy your Saasufy service from the dashboard for the changes to take effect.

The `id` field in Saasufy is extra special; you can optionally specify it when you create a new resource, however, if it is not specified, Saasufy will create one for you.
Saasufy offers utility functions for creating IDs (random and deterministic). See the previous `Utility functions` section.

### File hosting

Saasufy provides basic HTTP/HTTPS file hosting functionality with support for client-side caching (with `ETag`).
This is especially useful for hosting images.

To upload files to Saasufy, you first need to create a field of type `string` on a model of your choice.
You will then need to check/enable the `blob` constraint to tell Saasufy to treat this field as a base64 file.

After you've deployed your schema from the Saasufy dashboard, you will be able to manually add new records into your model via its `data` section.
Saasufy will show you a file picker next to the relevant field name which you can use to upload a file/image to Saasufy.

After adding a record to Saasufy which holds a file in one of its fields, that file can be accessed over HTTP/HTTPS via your Saasufy service's `/files` HTTP endpoint.
The format of the URL to link directly to a specific file/image is:

```
https://saasufy.com/:serviceId/files/:modelName/:modelId/:fieldName
```
For example, if the URL for your Saasufy service (which you get after deploying your service) is `wss://saasufy.com/sid7999/socketcluster/`
and your file is stored inside an `Image` model with ID `58f2051c-14bc-4518-8816-ff387cfdd57e` inside a `data` field, you will be able to link to your image directly using this URL:

```
https://saasufy.com/sid7999/files/Image/58f2051c-14bc-4518-8816-ff387cfdd57e/data
```

You can use it to embed images into your application using the `<img>` tag like this:

```html
<img src="https://saasufy.com/sid7999/files/Image/58f2051c-14bc-4518-8816-ff387cfdd57e/data" alt="My image" />
```

Saasufy enforces access controls for HTTP in the same way as it does for its WebSocket protocol.
It's possible to block or restrict access to specific files stored on specific fields via the `Access` page under the relevant model.

If your model field's access is set to `restrict`, only authenticated users with matching permissions will be able to view/download the image/file.
In this case, you will need to add your user's JWT token to a cookie with the name `socketcluster.saasufyService.authToken` and it will be passed along with the request.

## Components

### app-router

A component which allows you build apps which have multiple pages. Inside it, you should specify a template for each page in your app along with the route/path to bind each page to.
This component also supports simple redirects as well as redirects based on the user's current authentication state. Redirects can be soft or hard; a soft redirect does not change the current URL/path, a hard redirect does.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/app-router.js" type="module" defer></script>
```

**Example usage**

```html
<app-router>
  <template slot="page" route-path="/:productName">
    <div class="product-title">Product: {{capitalize(productName)}}</div>
  </template>
  <div slot="viewport"></div>
</app-router>
```

This example shows how an infinite number of pages can be represented with a single route template.
In this case, the `/:productName` inside the `route-path` attribute of the slotted `<template slot="page">` element serves as a placeholder variable which can match any text.
You can then use such route variables inside the page template itself as shown with `<div class="product-title">Product: {{capitalize(productName)}}</div>` - In this case, the `productName` variable which comes from the route path is first capitalized using the `capitalize` utility function before it is rendered into the template.
Note that the `app-router` can contain any number of pages/routes so the `slot="page"` attribute can be re-used multiple times, e.g:

```html
<app-router>
  <template slot="page" route-path="/home">
    <div>This is the home page</div>
  </template>
  <template slot="page" route-path="/about-us">
    <div>This is the about-us page</div>
  </template>
  <template slot="page" route-path="/products">
    <div>This is the products page</div>
  </template>
  <div slot="viewport"></div>
</app-router>
```

This example shows how to redirect based on the user's authentication status:

```html
<app-router default-page="/home">
  <template slot="page" route-path="/log-in" auth-redirect="/home" hard-redirect>
    <log-in-form
      hostname="sas.saasufy.com"
      port="443"
      network-symbol="sas"
      chain-module-name="sas_chain"
      secure="true"
    ></log-in-form>
  </template>
  <template slot="page" route-path="/home" no-auth-redirect="/log-in">
    <div>This is the home page</div>
  </template>
  <div slot="viewport"></div>
</app-router>
```

Note that the app router path is based on `location.hash` so the path section in your browser's address bar needs to start with the `#` character.
So for example, if your `index.html` file is served up from the URL `http://mywebsite.com`, then, to activate the `/products` route as in the example above, you would need to type the URL `http://mywebsite.com#/products`.

**Attributes of app-router**

- `default-page`: The path/route of the default page to send the user to in case no routes are matched. Commonly used to point to a `/page-not-found` page. For the home page, it's typically recommended to create a page template with `route-path=""` instead.
- `debounce-delay`: The number of milliseconds to wait before changing the route. This can help to avoid multiple renders if the route changes rapidly (e.g. when doing hard redirects). Defaults to 100ms.
- `target-page`: A convenience attribute which can be used to programmatically change the `location.hash` in the address bar.
- `force-render-paths`: An optional list of comma-separated paths to force a page render/re-render, regardless of whether or not the page has changed.

**Attributes of slotted page templates**

- `route-path`: The path of the page. Supports custom URL parameters in the format `/org/:orgId/user/:userId`.
- `partial-route`: An optional attribute which, if specified, will allow the `route-path` to be matched partially from the start. This can be used to ignore the ending of a path which is not relevant to the page in order to avoid unnecessary re-renders.
- `redirect`: An optional path/route which this page should redirect to. Note that the content of this page will not be shown so it should always be empty.
- `no-auth-redirect`: An optional alternative path/route to redirect to if the user is on this page but they are not authenticated. If the user is authenticated, then the content of the template will be displayed as normal.
- `auth-redirect`: An optional alternative path/route to redirect to if the user is on this page but they are already authenticated. If the user is not authenticated, then the content of the template will be displayed as normal.
- `hard-redirect`: An optional, additional attribute which can be specified alongside a `redirect`, `no-auth-redirect` or `auth-redirect` attribute to ensure that any redirect will change the URL in the address bar. Redirects are `soft` redirects by default; this means that they redirect the user to the target page but keep the current URL path unchanged.

### socket-provider

A top level component which connects to your Saasufy service and inside which you can place other components which depends on Saasufy data.
A Saasufy component which integrates with data from Saasufy is known as a `socket-consumer` and must always be placed inside a `socket-provider` element (although it does not have to be a direct child).

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/socket.js" type="module" defer></script>
```

**Example usage**

```html
<socket-provider url="wss://saasufy.com/sid7890/socketcluster/">
  <!-- Elements which rely on Saasufy data go here. -->
</socket-provider>
```

**Attributes**

- `url` (required): Specifies the URL for the Saasufy service to use as the data store for all components which are placed inside it.
- `auth-token-name`: Allows you to specify a custom key for your token - This will be used as the key in localStorage. You generally do not need to set this attribute. It is intended for situations were an app has multiple `socket-provider` elements connecting different services with different/separate authentication flows.
- `disable-tab-sync`: By default, the socket provider synchronizes socket auth state across multiple tabs via localStorage. If this attribute is set, then the socket auth state will not sync automatically and a manual page refresh may be necessary to update to the latest auth state.
- `socket-options`: Can be used to set options on the inner `socket`. Must be in the format `option1:type1=value1,option2:type2=value2`; the type of each option can be string, boolean or number. If not specified, the default type is string.
- `disconnect-on-deauth`: If this attribute is set, the underlying socket will be disconnected if the socket becomes unauthenticated. This means that components will not receive real-time updates until the user's next interaction (which will cause the socket to reconnect). If this attribute is not set, the socket will attempt to reconnect immediately after losing authentication.

### collection-browser

Used for rendering collections as lists, tables or other sequences based on a specific view using a template.
Supports pagination by allowing you to specify custom buttons or links to navigate between pages.
Can also perform basic CRUD operations such as deleting or creating records by listening for events from child components.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/collection-browser.js" type="module" defer></script>
```

**Example usage**

```html
<collection-browser
  collection-type="Chat"
  collection-fields="username,message,createdAt"
  collection-view="recentView"
  collection-view-params=""
  collection-page-size="50"
>
  <template slot="item">
    <div>
      <div class="chat-username">
        <b>{{Chat.username}}</b>
      </div>
      <div class="chat-message">{{Chat.message}}</div>
      <div class="chat-created-at">{{date(Chat.createdAt)}}</div>
    </div>
  </template>

  <template slot="loader">
    <div class="loading-spinner-container">
      <div class="spinning">&#8635;</div>
    </div>
  </template>

  <div slot="viewport" class="chat-viewport"></div>
</collection-browser>
```

**Attributes**

- `collection-type` (required): Specifies the type of collection to display. This should match a `Model` available in your Saasufy service.
- `collection-fields` (required): A comma-separated list of fields from the `Model` that you want to display or use. This lets you pick specific pieces of data from your collection to work with.
- `collection-view` (required): Determines the view of the collection. This should match one of the `Views` defined in your Saasufy service under that specific `Model`.
- `collection-view-params` (required): Parameters for the view, specified as comma-separated key-value pairs (e.g., key1=value1,key2=value2). These parameters can customize the behavior of the collection view. The keys must match `paramFields` specified in your Saasufy service under the relevant `View`.
- `collection-page-size`: Sets how many items from the collection are displayed at once. This is useful for pagination, allowing users to navigate through large sets of data in chunks.
- `collection-page-offset`: Indicates the current page offset in the collection's data. It’s like telling the browser which page of data you want to display initially.
- `collection-get-count`: If this attribute is present, the component will get the record count of the target view. The count can be rendered into the template by prefixing the model name with a dollar sign and accessing the `count` property like this: `{{$MyModelName.count}}`.
- `collection-view-primary-fields`: An optional list of field names to specify which specific `collection-view-params` to watch for real time updates. Fewer primary fields means that the view will be exposed to a broader range of real time updates but at the cost of performance. It is generally recommended to have just one primary field.
- `auto-reset-page-offset`: If this attribute is present, the `collection-page-offset` will be reset to zero whenever the view params change.
- `type-alias`: Allows you to provide an alternative name for your `Model` to use when injecting values inside the template. This is useful for situations where you may have multiple `collection-browser` elements and/or `model-viewer` elements of the same type nested inside each other and want to avoid `Model` name clashes in the nested template definitions. For example, if the `type-alias` in the snippet above was set to `SubChat`, then `{{Chat.message}}` would become `{{SubChat.message}}`.
- `hide-error-logs`: A flag which, when present, suppresses error logs from being printed to the console.
- `max-show-loader`: If this attribute is present, your slotted `loader` element will be shown as often as possible; this includes situations where the collection is merely refreshing itself. It is disabled by default.

### collection-adder

A basic form component for inserting data into collections.
This component is a simplified version of the `collection-adder-form` component as it doesn't require input elements to be slotted into it.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/collection-adder.js" type="module" defer></script>
```

**Example usage**

```html
<collection-adder
  collection-type="Product"
  collection-fields="name,brand,qty"
  model-values="categoryName=electronics,isNew:boolean=true"
  submit-button-label="Create"
  trim-spaces
></collection-adder>
```

**Attributes**

- `collection-type` (required): Specifies the type of collection to add the resource to when the form is submitted. This should match a `Model` available in your Saasufy service.
- `collection-fields`: A comma-separated list of fields from the `Model` to display as input elements inside the form for the user to fill in. Each field name in this list can optionally be followed by an input element type after a `:` character. For example `collection-fields="qty:number, size:select(small,medium,large)` will create one input element with `type="number"` and one with `type=select` with options `small`, `medium` or `large`. To make a select field optional, you can prefix the list of options with a comma; e.g. `size:select(,small,medium,large)`. Supported input types include: `text`, `select`, `number`, `checkbox`, `radio`, `textarea`, `file` and `text-select`.
- `model-values`: An optional list of key-value pairs in the format `field1=value1,field2=value2` to add to the newly created resource alongside the values collected from the user via the form. For non-string values, the type should be provided in the format `fieldName:type=value`; supported types are `string`, `number` and `boolean`. Unlike `collection-fields` which are rendered as input elements in the form, `model-values` are not shown to the user.
- `field-labels`: Allows you to specify custom input labels by mapping field names to more user-friendly labels in the format `fieldName1='Field Name 1',fieldName2='Field Name 2'`.
- `submit-button-label`: Text to display on the submit button. If not specified, defaults to `Submit`.
- `hide-submit-button`: Adding this attribute will hide the submit button from the form.
- `success-message`: A message to show the user if the resource has been successfully added to the collection after submitting the form.
- `autocapitalize`: Can be set to `off` to disable auto-capitalization of the first input character on mobile devices.
- `autocorrect`: Can be set to `off` to disable auto-correction of input on mobile devices.
- `trim-spaces`: If this attribute exists on the element, then leading and trailing spaces will be trimmed from each input element's value before submitting the form.

### collection-adder-form

A flexible form component for inserting data into collections.
This component is similar to the `collection-adder` component except that it requires input elements (and others) to be slotted into it.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/collection-adder-form.js" type="module" defer></script>
```

**Example usage**

```html
<collection-adder-form
  collection-type="Product"
  model-values="categoryName=electronics,isNew:boolean=true"
  trim-spaces
>
  <div slot="message"></div>
  <input type="text" name="name" placeholder="Name">
  <input type="text" name="brand" placeholder="Brand">
  <input type="number" name="qty" placeholder="Quantity">
  <input type="submit" value="Add new product">
</collection-adder-form>
```

**Attributes of collection-adder-form**

- `collection-type` (required): Specifies the type of collection to add the resource to when the form is submitted. This should match a `Model` available in your Saasufy service.
- `model-values`: An optional list of key-value pairs in the format `field1=value1,field2=value2` to add to the newly created resource alongside the values collected from the user via the form. For non-string values, the type should be provided in the format `fieldName:type=value`; supported types are `string`, `number` and `boolean`. Unlike `collection-fields` which are rendered as input elements in the form, `model-values` are not shown to the user.
- `success-message`: A message to show the user if the resource has been successfully added to the collection after submitting the form.
- `trim-spaces`: If this attribute exists on the element, then leading and trailing spaces will be trimmed from each input element's value before submitting the form.

**Attributes of slotted input, select, textarea... elements**

- `name` (required): This must correspond to a field name on the model specified via the `collection-type` attribute of the `collection-adder-form`.

### collection-deleter

A component which can be placed anywhere inside a `collection-browser` component to delete a specific item from a collection as a result of a user action (e.g. on click).
It supports either immediate deletion or deletion upon confirmation; in the latter case, the parent `collection-browser` must have a `confirm-modal` component slotted into its `modal` slot.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/collection-deleter.js" type="module" defer></script>
```

**Example usage**

```html
<!-- Must be placed somewhere inside a collection-browser component, typically inside the slotted item template. -->
<collection-deleter model-id="{{Product.id}}" onclick="deleteItem()">&#x2715;</collection-deleter>
```

OR (with confirmation step)

```html
<!-- Must be placed somewhere inside a collection-browser component, typically inside the slotted item template. -->
<collection-deleter model-id="{{Product.id}}" confirm-message="Are you sure you want to delete the {{Product.name}} product?" onclick="confirmDeleteItem()">&#x2715;</collection-deleter>
```

**Attributes**

- `model-id` (required): Specifies the ID of the resource to delete from the parent collection when this component is activated. This can be achieved by invoking either the `deleteItem()` or `confirmDeleteItem()` function from inside an event handler. The example above shows how to achieve deletion via the `onclick` event. You can either invoke `deleteItem()` to delete the resource immediately or you can invoke `confirmDeleteItem()` to require additional confirmation prior to deletion.
- `onclick` (required): The logic to execute to delete the item. Should be either `deleteItem()` or `confirmDeleteItem()`.
- `confirm-message`: The confirmation message to show the user when this component's `confirmDeleteItem()` function is invoked.

If `confirmDeleteItem()` is used, then the parent `collection-browser` must have a `confirm-modal` element slotted into it as shown here:

```html
<collection-browser
  collection-type="Product"
  collection-fields="name,qty"
  collection-view="alphabeticalView"
  collection-view-params=""
  collection-page-size="50"
>
  <template slot="item">
    <div>
      <div class="chat-message">{{Product.name}}</div>
      <collection-deleter model-id="{{Product.id}}" confirm-message="Are you sure you want to delete the {{Product.name}} product?" onclick="confirmDeleteItem()">&#x2715;</collection-deleter>
    </div>
  </template>

  <div slot="viewport" class="chat-viewport"></div>

  <!-- The confirm-modal element must be specified here with slot="modal" to prompt the user for confirmation -->
  <confirm-modal slot="modal" title="Delete confirmation" message="" confirm-button-label="Delete"></confirm-modal>
</collection-browser>
```

### collection-reducer

Similar to the `collection-browser` component but designed to render collections in combined format. For example, to combine values from multiple records into a single item.
A common use case is to extract and join values to pass to other child components via their attributes.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/collection-reducer.js" type="module" defer></script>
```

**Example usage**

```html
<!--
  Here, the collection-reducer fetches all available categories and joins their name fields
  to use as options for a model-input select element.
  This allows the user to choose among available category names to update the
  current product's categoryName field.
  You should assume that {{productId}} comes from a parent component (e.g. app-router).
-->
<collection-reducer
  collection-type="Category"
  collection-fields="name"
  collection-view="alphabeticalView"
  collection-page-size="100"
  collection-view-params=""
>
  <template slot="item">
    <div class="form">
      <label class="label-container">
        <div>Product category</div>
        <model-input
          type="select"
          options="{{joinFields(Category, 'name')}}"
          model-type="Product"
          default-value="accountId"
          model-id="{{productId}}"
          model-field="categoryName"
        ></model-input>
      </label>
    </div>
  </template>
  <div slot="viewport"></div>
</collection-reducer>
```

Unlike with `collection-browser` or `model-viewer`, the template variable references not a single model instance but an array of model instances.
In the example above, the name of the first element can be accessed with `{{Category[0].name}}`.

**Attributes**

- `collection-type` (required): Specifies the type of collection to use. This should match a `Model` available in your Saasufy service.
- `collection-fields` (required): A comma-separated list of fields from the `Model` that you want to use. This lets you pick specific pieces of data from your collection to work with.
- `collection-view` (required): Determines the view of the collection. This should match one of the `Views` defined in your Saasufy service under that specific `Model`.
- `collection-view-params` (required): Parameters for the view, specified as comma-separated key-value pairs (e.g., key1=value1,key2=value2). These parameters can customize the behavior of the collection view. The keys must match `paramFields` specified in your Saasufy service under the relevant `View`.
- `collection-page-size`: Sets how many items from the collection are displayed at once. This is useful for pagination, allowing users to navigate through large sets of data in chunks.
- `collection-page-offset`: Indicates the current page offset in the collection's data. It’s like telling the browser which page of data you want to display initially.
- `collection-get-count`: If this attribute is present, the component will get the record count of the target view. The count can be rendered into the template by prefixing the model name with a dollar sign and accessing the `count` property like this: `{{$MyModelName.count}}`.
- `type-alias`: Allows you to provide an alternative name for your `Model` to use when injecting values inside the template. This is useful for situations where you may have multiple `collection-browser` elements and/or `model-viewer` elements of the same type nested inside each other and want to avoid `Model` name clashes in the nested template definitions. For example, if the `type-alias` in the snippet above was set to `SubChat`, then `{{Chat.message}}` would become `{{SubChat.message}}`.
- `hide-error-logs`: A flag which, when present, suppresses error logs from being printed to the console.

### model-input

Used for displaying and editing a single field of a model instance in real time.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/model-input.js" type="module" defer></script>
```

**Example usage**

```html
<model-input
  type="text"
  model-type="Product"
  model-id="{{productId}}"
  model-field="name"
  placeholder="Product name"
></model-input>
```

**Attributes**

- `model-type` (required): Specifies the type of model to bind to. This should match a `Model` available in your Saasufy service.
- `model-id` (required): The id of the model instance/record to bind to.
- `model-field` (required): The field of the model instance/record to bind to for reading and updating.
- `debounce-delay`: The delay in milliseconds to wait before sending an update to the server. This is useful to batch multiple updates together (as is common when user is typing). Default is 300ms.
- `list`: If specified, this sets the list attribute of the inner `input` element to provide input suggestions (only works with standard input elements).
- `type`: The type of the input component; can be `text`, `number`, `select`, `textarea`, `checkbox` or `file`.
- `placeholder`: Can be used to set the placeholder text on the inner input element.
- `consumers`: This allows you to connect this `model-input` to other elements on your page. It takes a list of selectors with optional attributes to target in the format `element-selector:attribute-name`. For example `.my-input:value` will find all elements with a `my-input` class and update their `value` attributes with the value of the `model-input` component in real-time. You can specify multiple selectors separated by commas such as `.my-input,my-div`; in this case, because attribute names are not specified, values will be injected into the `value` attribute (for input elements) or into the `innerHTML` property (for other kinds of elements). The default attribute/property depends on the element type. Note that `model-input` elements of the `file` type are treated as write-only unless the `consumers` attribute is present.
- `provider-template`: A template string within which the `{{value}}` can be injected before passing to consumers.
- `show-error-message`: If this attribute is present, an error message will be displayed above the input if it fails to update the value.
- `options`: A comma-separated list of options to provide - This only works if the input type is `select`.
- `height`: Allows you to set the height of the inner `input` element programmatically.
- `default-value`: A default value to show the user if the underlying model field's value is null or undefined. Note that setting a default value will not affect the underlying model's value.
- `value`: Used to set the model's value.
- `computable-value`: If this attribute is present, it will be possible to execute expressions using the `{{expression}}` syntax inside the `value` attribute.
- `slice-to`: Optional attribute which can be set to a number to trim strings down to a maximum number of characters. This is useful when dealing with potentially very long field values. Extra care should be taken when using this attribute on a `model-input` element as it will cause values to be overwritten with shortened values if the user edits the input box. Note also that it may affect caching if the same field is being referenced in multiple parts of the application at the same time within the same `socket-provider`.
- `hide-error-logs`: By default, this component will log errors to the console. If set, this attribute will suppress such errors from showing up on the console.
- `autocapitalize`: Can be `on` or `off` - It will set the auto-capitalize attribute on the inner input element. This is useful for mobile devices to enable or disable auto-capitalization of the first character which is typed into the input element.
- `autocorrect`: Can be `on` or `off` - It will set the auto-correct attribute on the inner input element. This is useful for mobile devices to enable or disable auto-correct.
- `enable-rebound`: By default, for efficiency reasons, real-time updates performed via `model-input` components are not sent back to the publishing client; it is usually unnecessary because state changes are shared locally between all components which are bound to the same `socket-provider`. You can add the `enable-rebound` attribute to the `model-input` component to force real-time updates to rebound back to the publisher to support more advanced scenarios. Note that enabling rebound comes with additional performance overheads.
- `accept`: This attribute should only be used if the `type` is set to `file`; it serves to constrain the types of files which can be selected by the user.
- `input-id`: Can be used to set an `id` attribute on the inner `input` element.
- `input-props`: Can be used to set additional attributes on the inner `input` element. Must be in the format `attr1=value1,attr2=value2`.
- `ignore-invalid-selection`: Can be used with a `model-input` component of type `select` to prevent the `error` class from being added if the selected value is not among the available options.

### model-text

Used to displaying a field of a model instance in real time.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/model-text.js" type="module" defer></script>
```

**Example usage**

```html
<model-text
  type="text"
  model-type="Product"
  model-id="{{productId}}"
  model-field="name"
></model-text>
```

**Attributes**

- `model-type` (required): Specifies the type of model to bind to. This should match a `Model` available in your Saasufy service.
- `model-id` (required): The id of the model instance/record to bind to.
- `model-field` (required): The field of the model instance/record to bind to for reading.
- `slice-to`: Optional attribute which can be set to a number to trim strings down to a maximum number of characters when reading. This is useful when dealing with potentially very long field values. Note that it may affect caching if the same field is being referenced in multiple parts of the application at the same time within the same `socket-provider`.
- `hide-error-logs`: By default, this component will log errors to the console. If set, this attribute will suppress such errors from showing up on the console.

### model-viewer

Used for rendering a single model resource using a template. This is the single-model alternative to the `collection-browser` which works with collections of models.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/model-viewer.js" type="module" defer></script>
```

**Example usage**

```html
<model-viewer
  model-type="Product"
  model-id="{{modelId}}"
  model-fields="name,desc,qty"
>
  <template slot="item">
    <div>
      <div>Name: {{Product.name}}</div>
      <div>Description: {{Product.desc}}</div>
      <div>Quantity: {{Product.qty}}</div>
    </div>
  </template>

  <div slot="viewport"></div>
</model-viewer>
```

**Attributes**

- `model-type` (required): Specifies the type of model to bind to. This should match a `Model` available in your Saasufy service.
- `model-id` (required): The id of the model instance/record to bind to.
- `model-fields` (required): A comma-separated list of fields to bind to. Note that unlike with `model-input` and `model-text`, the attribute name is plural and can bind to multiple fields.
- `type-alias`: Allows you to provide an alternative name for your `Model` to use when injecting values inside the template. This is useful for situations where you may have multiple `model-browser` elements and/or `model-viewer` elements of the same type nested inside each other and want to avoid `Model` name clashes in the nested template definitions. For example, if the `type-alias` in the snippet above was set to `MyProduct`, then `{{Product.name}}` would become `{{MyProduct.name}}`.
- `fields-slice-to`: Optional attribute which can be used to trim strings down to a maximum number of characters when reading. The format is `fieldName1=number1,fieldName2=number2`. This is useful when dealing with potentially very long field values. Note that it may affect caching if the same field is being referenced in multiple parts of the application at the same time within the same `socket-provider`.
- `hide-error-logs`: A flag which, when present, suppresses error logs from being printed to the console.

### input-provider

An input component which can pass data to other components (or HTML elements) via custom attributes.
A common use case for it is to pass user input to `collection-browser` or `model-viewer` components to then fetch data from Saasufy.
This component can be configured to provide its data to multiple components (consumers) via custom attributes.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/input-provider.js" type="module" defer></script>
```

**Example usage**

```html
<input-provider
  type="text"
  consumers=".my-input"
  value="Hello world!"
  placeholder="Message"
></input-provider>
```

**Attributes**

- `input-id`: Can be used to set an `id` attribute on the inner `input` element.
- `list`: If specified, this sets the list attribute of the inner `input` element to provide input suggestions (only works with standard input elements).
- `type`: The type of the input component; can be `text`, `number`, `select`, `textarea` or `checkbox`.
- `placeholder`: Can be used to set the placeholder text on the inner input element.
- `consumers`: This allows you to connect this `input-provider` to other elements on your page. It takes a list of selectors with optional attributes to target in the format `element-selector:attribute-name`. For example `.my-input:value` will find all elements with a `my-input` class and update their `value` attributes with the value of the `input-provider` component in real-time. You can specify multiple selectors separated by commas such as `.my-input,my-div`; in this case, because attribute names are not specified, values will be injected into the `value` attribute (for input elements) or into the `innerHTML` property (for other kinds of elements). The default attribute/property depends on the element type.
- `provider-template`: A template string within which the `{{value}}` can be injected before passing to consumers.
- `debounce-delay`: The delay in milliseconds to wait before triggering a change event. This is useful to batch multiple updates together (as is common when user is typing). Default is 800ms.
- `options`: A comma-separated list of options to provide - This only works if the input type is `select`.
- `height`: Allows you to set the height of the inner `input` element programmatically.
- `value`: Used to set the input's value.
- `computable-value`: If this attribute is present, it will be possible to execute expressions using the `{{expression}}` syntax inside the `value` attribute.
- `autocapitalize`: Can be `on` or `off` - It will set the auto-capitalize attribute on the inner input element. This is useful for mobile devices to enable or disable auto-capitalization of the first character which is typed into the input element.
- `autocorrect`: Can be `on` or `off` - It will set the auto-correct attribute on the inner input element. This is useful for mobile devices to enable or disable auto-correct.
- `input-props`: Can be used to set additional attributes on the inner `input` element. Must be in the format `attr1=value1,attr2=value2`.

### input-combiner

A component which can be used to combine data from multiple `input-provider` components and pass the combined data to other components (or HTML elements) via custom attributes.
A common use case for it is to pass user input to `collection-browser` or `model-viewer` components to then fetch data from Saasufy.
This component can be configured to provide its data to multiple components (consumers) via custom attributes.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/input-combiner.js" type="module" defer></script>
```

**Example usage**

The following example shows how to bind multiple `input-provider` components to an `input-combiner`.
In this example, the `input-combiner` component forwards the combined, formatted values to the `collection-view-params` attribute of a `company-browser` component.

Note that the `value` inside the `provider-template` attribute of the `input-combiner` is an object with keys that represent the `name` attribute of the different source `input-provider` components.
The `combineFilters` function produces a combined query string (joined with `%AND%`) by iterating over the `value` object which holds different parts of the query as provided by different `input-provider` components.

```html
<input-provider
  class="desc-input"
  name="desc"
  type="text"
  consumers=".search-combiner"
  provider-template="description contains (?i){{value}}"
  value=""
  placeholder="Description filter"
></input-provider>

<input-provider
  class="city-input"
  name="city"
  type="text"
  consumers=".search-combiner"
  provider-template="city contains (?i){{value}}"
  value=""
  placeholder="City filter"
></input-provider>

<input-combiner
  class="search-combiner"
  consumers=".company-browser:collection-view-params"
  provider-template="query='{{combineFilters(value)}}'"
></input-combiner>
```

**Attributes**

- `consumers`: This allows you to connect this `input-combiner` to other elements on your page. It takes a list of selectors with optional attributes to target in the format `element-selector:attribute-name`. For example `.my-input:value` will find all elements with a `my-input` class and update their `value` attributes with the value of the `input-provider` component in real-time. You can specify multiple selectors separated by commas such as `.my-input,my-div`; in this case, because attribute names are not specified, values will be injected into the `value` attribute (for input elements) or into the `innerHTML` property (for other kinds of elements). The default attribute/property depends on the element type.
- `provider-template`: A template string within which the `{{value}}` can be injected before passing to consumers. In the case of the `input-combiner`, the value is an object wherein each key represents the unique label associated with different `input-provider` components.
- `debounce-delay`: The delay in milliseconds to wait before triggering a change event. This is useful to batch multiple updates together. Default is 0ms.

### input-transformer

A component which can be used to transform data from an `input-provider` component and pass the transformed data to other components (or HTML elements) via custom attributes.
This component can be configured to provide its data to multiple components (consumers) via custom attributes.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/input-transformer.js" type="module" defer></script>
```

**Example usage**

The following example shows how to bind an `input-provider` component to an `input-transformer`.

```html
<input-provider
  class="dollar-input"
  name="count"
  type="text"
  consumers=".cents-transformer"
  value=""
  placeholder="Dollars"
></input-provider>

<input-transformer
  class="cents-transformer"
  consumers=".cents-container"
  provider-template="{{Number(value) * 100}}"
></input-transformer>

<div class="cents-container"></div>
```

**Attributes**

- `consumers`: This allows you to connect this `input-transformer` to other elements on your page. It takes a list of selectors with optional attributes to target in the format `element-selector:attribute-name`. For example `.my-input:value` will find all elements with a `my-input` class and update their `value` attributes with the value of the `input-provider` component in real-time. You can specify multiple selectors separated by commas such as `.my-input,my-div`; in this case, because attribute names are not specified, values will be injected into the `value` attribute (for input elements) or into the `innerHTML` property (for other kinds of elements). The default attribute/property depends on the element type.
- `provider-template`: A template string within which the `{{value}}` can be injected before passing to consumers.
- `output-type`: The default output type is `string`. This property can be used to convert the output to either `boolean` or `number`.
- `debounce-delay`: The delay in milliseconds to wait before triggering a change event. This is useful to batch multiple updates together. Default is 0ms.

### log-in-form

A form component which allows end-users to authenticate themselves into your app using the Saasufy blockchain or any Capitalisk-based blockchain.
On success, the socket of the form's `socket-provider` will be set to the authenticated state; this will then cause appropriate Saasufy components which share this `socket-provider` to reload themselves.
Once a user is authenticated, they will be able to access restricted data (as specified on the Saasufy `Model -> Access` page).
It's also possible to specify a `success-location-hash` attribute to trigger a client-side redirect upon successful authentication.
The change in the location hash can then be detected by an `app-router` to switch to a different page upon successful login.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/log-in-form.js" type="module" defer></script>
```

**Example usage**

```html
<log-in-form
  hostname="capitalisk.com"
  port="443"
  network-symbol="clsk"
  chain-module-name="capitalisk_chain"
  secure="true"
></log-in-form>
```

**Attributes**

- `hostname` (required): The hostname of the blockchain node to match authentication details against.
- `port` (required): The port of the blockchain node to match authentication details against. Should be 80 for HTTP/WS or 443 for HTTPS/WSS.
- `network-symbol` (required): The symbol of the target blockchain.
- `chain-module-name` (required): The module name used by the target blockchain.
- `secure` (required): Should be `true` or `false` depending on whether or not the node is exposed over HTTP/WS or HTTPS/WSS.
- `auth-timeout`: The maximum number of milliseconds to wait for authentication to complete. Defaults to 10000 (10 seconds).
- `success-location-hash`: If authentication is successful, the browser's `location.hash` will be set to this value. It can be used to redirect the user to their dashboard, for example.

### log-out

A component which can be placed inside a `socket-provider` to deauthenticate the socket (e.g. on click).

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/log-out.js" type="module" defer></script>
```

**Example usage**

```html
<log-out onclick="logOut()"><a href="javascript:void(0)">Log out</a></log-out>
```

### oauth-link

A link to initiate an OAuth flow to authenticate a user as part of log in. Can support a range of different OAuth providers.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/oauth-link.js" type="module" defer></script>
```

**Example usage**

```html
<oauth-link class="log-in-oauth-section" provider="github" client-id="dabb51f8af31a0bc53bf">
  <template slot="item">
    <a href="https://github.com/login/oauth/authorize?client_id={{oauth.clientId}}&state={{oauth.state}}">
      Log in with GitHub
    </a>
  </template>
  <div slot="viewport"></div>
</oauth-link>
```

**Attributes**

- `provider` (required): The name of the provider. It must match the provider name specified on the `Authentication` page of your Saasufy control panel and also the value provided to the `oauth-handler` component at the end of the OAuth flow.
- `client-id` (required): This is the client ID from the third-party OAuth provider.
- `state-size`: This allows you to control the size (in bytes) of the random state string which is passed to the OAuth provider as part of the OAuth flow. Defaults to 20.
- `state-storage-key`: The state string is stored in the browser's `sessionStorage` under this key. Defaults to `oauth.state`. It must match the value provided to the `oauth-handler` component at the end of the OAuth flow.
- `use-local-storage`: By default, the state is stored inside sessionStorage. If this property is set, then the state will be stored inside localStorage instead. This is useful for sharing the state across different tabs. If set, this attribute should also be set on the related `oauth-handler` component.

### oauth-handler

This component handles the final stage of OAuth and then redirects the user to the relevant page/URL if successful.
When using an OAuth provider, the callback URL which you register with the provider must lead the user back to a page which contains this `oauth-handler` component.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/oauth-handler.js" type="module" defer></script>
```

**Example usage**

```html
<oauth-handler provider="github" success-location-hash="/chat"></oauth-handler>
```

**Attributes**

- `provider` (required): The name of the provider. It must match the provider name specified on the `Authentication` page of your Saasufy control panel and also the value provided to the `oauth-link` component at the start of the OAuth flow.
- `success-location-hash`: If authentication is successful, the browser's `location.hash` will be set to this value. It can be used to redirect the user to their dashboard, for example.
- `success-url`: If authentication is successful, the browser's `location.href` will be set to this value. It can be used to redirect the user to their dashboard, for example.
- `extra-data`: This attribute can be used to pass additional data to the OAuth `getAccessTokenURL` endpoint. For Google OAuth, for example, an additional `redirect_uri` field is required, so it should be set using `extra-data="redirect_uri=http://localhost.com:8000/"` (substitute the URI with your own).
- `navigate-event-path`: If authentication is successful and a path is set via this attribute, the component will emit a `navigate` event which will bubble up the component hierarchy and can be used by a parent component to perform the success redirection. This approach can be used as an alternative to `success-location-hash` or `success-url` for doing the final redirect.
- `state-storage-key`: The state string is stored in the browser's `sessionStorage` under this key. Defaults to `oauth.state`. It must match the value provided to the `oauth-link` component at the start of the OAuth flow.
- `code-param-name`: The name of the query parameter which holds the `code` as provided by the OAuth provider within the OAuth callback URL. Defaults to `code`.
- `state-param-name`: The name of the query parameter which holds the `state` as provided by the OAuth provider within the OAuth callback URL. Defaults to `state`.
- `auth-timeout`: The number of milliseconds to wait for authentication to complete before timing out. Defaults to 10000 (10 seconds).
- `use-local-storage`: By default, the state is retrieved from sessionStorage. If this property is set, then the state will be retrieved from localStorage instead. This is useful for sharing the state across different tabs. If set, this attribute should also be set on the related `oauth-link` component.

### render-group

A component which can be used to guarantee that certain children components are always rendered at the same time (once they are loaded) to provide a smooth user experience.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/render-group.js" type="module" defer></script>
```

**Example usage**

```html
<render-group wait-for="1,2,3">
  <model-input
    type="text"
    load-id="1"
    model-type="Product"
    model-id="{{productId}}"
    model-field="name"
  ></model-input>
  <model-input
    type="text"
    load-id="2"
    model-type="Product"
    model-id="{{productId}}"
    model-field="desc"
  ></model-input>
  <model-input
    type="number"
    load-id="3"
    model-type="Product"
    model-id="{{productId}}"
    model-field="qty"
  ></model-input>
</render-group>
```

**Attributes**

- `wait-for` (required): A list of components to wait for before rendering based on their `load-id` attributes.
The `render-group` will only render its content once all the components specified via this attribute have finished loading their data.

### if-group

A component which exposes a `show-content` property which can be set to true or false to show or hide its content.
It's intended to be placed inside a `model-viewer`, `collection-browser` or `collection-reducer` component such that the true/false value of the `show-content` attribute can be computed using a template `{{expression}}` placeholder. This component requires a template and a viewport to be slotted in. The content of the template will not be processed unless the `show-content` condition is met.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/if-group.js" type="module" defer></script>
```

**Example usage**

```html
<if-group show-content="{{!!Product.isVisible}}">
  <template slot="content">
    <div>Name: {{Product.name}}</div>
    <div>Description: {{Product.desc}}</div>
    <div>Quantity: {{Product.qty}}</div>
  </template>
  <div slot="viewport"></div>
</if-group>
```

### switch-group

A component which exposes a `show-cases` property which can be set to key-value pairs in the format `key1=true,key2=false`. It can be used to conditionally display multiple slotted elements based on multiple conditions. It helps to keep HTML clean when the conditions are complex.
This element is intended to be placed inside a `model-viewer`, `collection-browser` or `collection-reducer` component such that the true/false values of the `show-cases` attribute can be computed using template `{{expression}}` placeholders. This component requires one or more templates and a viewport to be slotted in. The content of the templates will not be processed unless the `show-cases` condition is met. All templates must have a `slot="content"` attribute and a name attribute in the format `name="key1"` where the value `key1` corresponds to the key specified inside the `show-cases` attribute of the `switch-group`.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/switch-group.js" type="module" defer></script>
```

**Example usage**

```html
<switch-group show-cases="image={{!!Section.imageURL}},text={{!!Section.text}}">
  <template slot="content" name="image">
    <img src="{{Section.imageURL}}" alt="{{Section.imageDesc}}" />
  </template>
  <template slot="content" name="text">
    <div>{{Section.text}}</div>
  </template>
  <div slot="viewport"></div>
</switch-group>
```

### collection-adder-group

A component which can be used to group together multiple `collection-adder` components. It can be used to insert multiple records into a collection via a single button click.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/collection-adder-group.js" type="module" defer></script>
```

**Example usage**

```html
<!--
  This collection-adder-group adds multiple pre-defined records into a Product
  collection using a single button click. This example assumes that the name
  field is the only required field in the Product model.
-->
<collection-adder-group>
  <collection-adder
    slot="collection-adder"
    collection-type="Product"
    model-values="name=Flour"
    hide-submit-button
  ></collection-adder>
  <collection-adder
    slot="collection-adder"
    collection-type="Product"
    model-values="name=Egg"
    hide-submit-button
  ></collection-adder>
  <collection-adder
    slot="collection-adder"
    collection-type="Product"
    model-values="name=Milk"
    hide-submit-button
  ></collection-adder>
  <div slot="error-container"></div>
  <input slot="submit-button" type="button" value="Add pancake ingredients">
</collection-adder-group>
```

### confirm-modal

A modal component to prompt the user for confirmation before performing sensitive operations. Can be slotted into a `collection-browser` component.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/confirm-modal.js" type="module" defer></script>
```

**Example usage**

```html
<collection-browser
  collection-type="Product"
  collection-fields="name,qty"
  collection-view="alphabeticalView"
  collection-view-params=""
  collection-page-size="50"
>
  <template slot="item">
    <div>
      <div class="chat-message">{{Product.name}}</div>
      <collection-deleter model-id="{{Product.id}}" confirm-message="Are you sure you want to delete the {{Product.name}} product?" onclick="confirmDeleteItem()">&#x2715;</collection-deleter>
    </div>
  </template>

  <div slot="viewport" class="chat-viewport"></div>

  <!-- The confirm-modal element must be specified here with slot="modal" to prompt the user for confirmation -->
  <confirm-modal slot="modal" title="Delete confirmation" message="" confirm-button-label="Delete"></confirm-modal>
</collection-browser>
```

**Attributes**

- `title`: The text to show in the modal's title bar.
- `message`: The text to show as the modal's main content.
- `confirm-button-label`: The text to use as the confirm button label.
- `cancel-button-label`: The text to use as the cancel button label.

### overlay-modal

A general purpose modal component.

### download-link

A component to download a file from a model. The file must be stored on the model instance in base64 format.

**Import**

```html
<script src="https://saasufy.com/node_modules/saasufy-components/download-link.js" type="module" defer></script>
```

**Example usage**

```html
<download-link model-type="Image" model-id="dce962f8-34f1-4a82-95b9-377e42b57e2d" model-field="src" file-name="my-image.png">
  <a href="javascript: void(0)">Download image</a>
</download-link>
```

**Attributes**

- `model-type` (required): Specifies the type of model to download the file from. This should match a `Model` available in your Saasufy service.
- `model-id` (required): The id of the model instance/record to download the file from.
- `model-field` (required): The field of the model instance/record where the file is stored in base64 format (with content type).
- `file-name` (required): The default name of the file to save as. The file extension is optional.
