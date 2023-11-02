# Saasufy Components
Components for Saasufy

## How to use

Coming soon.

## Components

### socket-provider

A top level component which connects to your Saasufy service and inside which you can place other components which depends on Saasufy data.
A Saasufy component which integrates with data from Saasufy is known as a `socket-consumer` and must always be placed inside a `socket-provider` element (although it does not have to be a direct child).

### collection-browser

Used for rendering collections as lists, tables or other sequences based on a specific view using a template.
Supports pagination by allowing you to specify custom buttons or links to navigate between pages.
Can also perform basic CRUD operations such as deleting or creating records by listening for events from child components.

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
