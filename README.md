# Saasufy Components
Components for Saasufy

## Overview

Many Saasufy components use a combination of `<template slot="item">` and `<div slot="viewport">`. Both of these are known as `slotted` elements.

A `<template slot="item">` is an inert/hidden element which the component uses to format its output. The `<div slot="viewport">` is an element which will contain the rendered output of the component.

Components which follow this pattern take templates as input and render them inside the specified `<div slot="viewport">` element. Note that the viewport can be any element and not necessarily a `div`.

The most important thing to remember is that the element marked with the `slot="item"` attribute serves as a template for your component and the element marked with `slot="viewport"` serves as a container for its output. Although the `item` slot is commonly used, components may require different slot names for input templates so it's important to read the documentation carefully.

A component's output consists of instances of your template after they've been populated with data from the component.
You can apply custom CSS/styling to elements that are rendered inside a viewport - It may be useful to add a custom `class` attribute to your viewport element to allow targeting using CSS selectors.

## How to use

To use components, you just need to include them into your `.html` file inside your `<head>` tag like this:

```html
<script src="https://saasufy.com/node_modules/saasufy-components/socket.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/app-router.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/collection-browser.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/collection-adder.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/collection-deleter.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/collection-reducer.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/model-input.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/model-text.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/model-viewer.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/input-provider.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/confirm-modal.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/render-group.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/conditional-group.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/collection-adder-group.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/log-in-form.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/log-out.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/oauth-link.js" type="module" defer></script>
<script src="https://saasufy.com/node_modules/saasufy-components/oauth-handler.js" type="module" defer></script>
```

You should only add the script tags for the components which your page uses to avoid wasting bandwidth and unnecessarily delaying page load for your users.
The `.js` file name of the component matches the names of the HTML tags which the script provides.
The only exception is the `socket-provider` component which is located inside the `socket.js` file - This is because that file exposes multiple components which are used behind the scenes by other components.
You should always include the `socket.js` script as shown above whenever you use components which depend on data from Saasufy.

Linking the scripts directly from `saasufy.com` as shown above is the simplest way to get started as it doesn't require loading anything or hosting the scripts yourself.
An alternative approach is to download Saasufy components using `npm install saasufy-components` and then link to them from your own hosting provider.

## Components

### app-router

A component which allows you build apps which have multiple pages. Inside it, you should specify a template for each page in your app along with the route/path to bind each page to.
This component also supports simple redirects as well as redirects based on the user's current authentication state. Redirects can be soft or hard; a soft redirect does not change the current URL/path, a hard redirect does.

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

The app router path is based on the `location.hash` so the path section in your browser's address bar needs to start with the `#` character.
So for example, if your `index.html` file is served up from the URL `http://mywebsite.com`, then, to activate the `/products` route as in the example above, you would need to type the URL `http://mywebsite.com#/products`.

**Attributes of app-router**

- `default-page`: The path/route of the default page to send the user to in case no routes are matched. Commonly used to point to a `/page-not-found` page. For the home page, it's typically recommended to create a page template with `route-path=""` instead.
- `debounce-delay`: The number of milliseconds to wait before changing the route. This can help to avoid multiple renders if the route changes rapidly (e.g. when doing hard redirects). Defaults to 100ms.

**Attributes of slotted page templates**

- `redirect`: An optional path/route which this page should redirect to. Note that the content of this page will not be shown so it should always be empty.
- `auth-redirect`: An optional path/route which this page should redirect to if the user is authenticated. If the user is not authenticated, then the content of the template will be displayed as normal.
- `no-auth-redirect`: An optional path/route which this page should redirect to if the user is not authenticated. If the user is authenticated, then the content of the template will be displayed as normal.
- `hard-redirect`: An optional, additional attribute which can be specified alongside a `redirect`, `auth-redirect` or `no-auth-redirect` attribute to ensure that any redirect will change the URL in the address bar. Redirects are `soft` redirects by default; this means that they redirect the user to the target page but keep the current URL path unchanged.

### socket-provider

A top level component which connects to your Saasufy service and inside which you can place other components which depends on Saasufy data.
A Saasufy component which integrates with data from Saasufy is known as a `socket-consumer` and must always be placed inside a `socket-provider` element (although it does not have to be a direct child).

**Example usage**

```html
<socket-provider url="wss://saasufy.com/sid7890/socketcluster/">
  <!-- Elements which rely on Saasufy data go here. -->
</socket-provider>
```

**Attributes**

- `url` (required): Specifies the URL for the Saasufy service to use as the data store for all components which are placed inside it.
- `auth-token-name`: Allows you to specify a custom key for your token - This will be used as the key in localStorage. You generally do not need to set this attribute. It is intended for situations were an app has multiple `socket-provider` elements connecting different services with different/separate authentication flows.

### collection-browser

Used for rendering collections as lists, tables or other sequences based on a specific view using a template.
Supports pagination by allowing you to specify custom buttons or links to navigate between pages.
Can also perform basic CRUD operations such as deleting or creating records by listening for events from child components.

**Example usage**

```html
<collection-browser
  collection-type="Chat"
  collection-fields="username,message,createdAt"
  collection-view="recentView"
  collection-page-size="50"
  collection-view-params=""
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

  <div slot="viewport" class="chat-viewport"></div>

  <div slot="loader" class="loading-spinner-container">
    <div class="spinning">&#8635;</div>
  </div>
</collection-browser>
```

**Attributes**

- `collection-type` (required): Specifies the type of collection to be used, which defines the dataset you want to work with. This should match a `Model` available in your Saasufy service (as specified in `socket-provider`).
- `collection-fields` (required): A comma-separated list of fields from the `Model` that you want to display or use. This lets you pick specific pieces of data from your collection to work with.
- `collection-view` (required): Determines the view of the collection. This should match one of the `Views` defined in your Saasufy service under that specific `Model`.
- `collection-view-params` (required): Parameters for the view, specified as comma-separated key-value pairs (e.g., key1=value1,key2=value2). These parameters can customize the behavior of the collection view. The keys must match `paramFields` specified in your Saasufy service under the relevant `View`.
- `collection-page-size`: Sets how many items from the collection are displayed at once. This is useful for pagination, allowing users to navigate through large sets of data in chunks.
- `collection-page-offset`: Indicates the current page offset in the collection's data. It’s like telling the browser which page of data you want to display initially.
- `type-alias`: Allows you to provide an alternative name for your `Model` to use when injecting values inside the template. This is useful for situations where you may have multiple `collection-browser` elements and/or `model-viewer` elements of the same type nested inside each other and want to avoid `Model` name clashes in the nested template definitions. For example, if the `type-alias` in the snippet above was set to `SubChat`, then `{{Chat.message}}` would become `{{SubChat.message}}`.
- `hide-error-logs`: A flag that, when present, suppresses error logs from being printed to the console. This can be used to keep the user interface clean of technical messages.
- `max-show-loader`: If this attribute is present, your slotted `loader` element will be shown as often as possible; this includes situations where the collection is merely refreshing itself. It is disabled by default.

### collection-adder

A form component for inserting data into collections.

### collection-deleter

A component which can be placed anywhere inside a `collection-browser` component to delete a specific item from a collection as a result of a user action (e.g. on click).
It supports either immediate deletion or deletion upon confirmation; in the latter case, the parent `collection-browser` must have a `confirm-modal` component slotted into its `modal` slot.

### collection-reducer

Similar to the `collection-browser` component but designed to render collections in combined format. For example, to combine values from multiple records into a single item.
A common use case is to extract and join values to pass to other child components via their attributes.

### model-input

Used for displaying and editing a single field of a model instance in real time.

### model-text

Used to displaying a field of a model instance in real time.

### model-viewer

Used for rendering a single model resource using a template. This is the single-model alternative to the `collection-browser` which works with collections of models.

### input-provider

An input component which can pass data to other components (or HTML elements) via custom attributes.
A common use case for it is to pass user input to `collection-browser` or `model-viewer` components to then fetch data from Saasufy.
This component can be configured to provide its data to multiple components (consumers) via custom attributes.
Note that an `input-provider` only targets elements which are downstream from its parent element in the HTML hierarchy.

### log-in-form

A form component which allows end-users to authenticate themselves into your app using the Saasufy blockchain or any Capitalisk-based blockchain.
On success, the socket of the form's `socket-provider` will be set to the authenticated state; this will then cause appropriate Saasufy components which share this `socket-provider` to reload themselves.
Once a user is authenticated, they will be able to access restricted data (as specified on the Saasufy `Model -> Access` page).
It's also possible to specify a `success-location-hash` attribute to trigger a client-side redirect upon successful authentication.
The change in the location hash can then be detected by an `app-router` to switch to a different page upon successful login.

### log-out

A component which can be placed inside a `socket-provider` to deauthenticate the socket (e.g. on click).

Example usage: `<log-out onclick="logOut()"><a href="javascript:void(0)">Log out</a></log-out>`

### confirm-modal

A modal component to prompt the user for confirmation before performing sensitive operations.

### overlay-modal

A general purpose modal component.

### render-group

A component which can be used to guarantee that certain children components are always rendered at the same time (once they are loaded) to provide a smooth user experience.

### conditional-group

A modal component which exposes a `show-content` property which can be set to true or false to show or hide its content.
It's intended to be placed inside a `model-viewer`, `collection-browser` or `collection-reducer` component such that the true/false value of the `show-content` attribute can be computed using a template `{{expression}}` placeholder.

### collection-adder-group

A component which can be used to group together multiple `collection-adder` components. It can be used to insert multiple records into a collection via a single button click.
