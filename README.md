# Saasufy Components
Components for Saasufy

## How to use

Coming soon.

## Components

### collection-adder

A form component for inserting data into collections.

### collection-browser

Used for rendering collections as lists, tables or other sequences based on a specific view using a template.
Supports pagination by allowing you to specify custom buttons or links to navigate between pages.
Can also perform basic CRUD operations such as deleting or creating records.

### model-input

Used for displaying and editing a field of a model instance in real time.

### model-viewer

Used for rendering models using a template.

### input-provider

An input component which can pass data to other components (or HTML elements) via custom attributes.
A common use case for it is to pass user input to `collection-browser` or `model-viewer` to display relevant data loaded from Saasufy (e.g. based on a user query).
This component can be configured to provide its data to multiple components (consumers) via custom attributes.
Note that an `input-provider` only targets elements which are downstream from its parent element in the HTML hierarchy.

### confirm-modal

A modal component to prompt the user for confirmation before performing sensitive operations.

### model-text

Used to displaying a field of a model instance in real time.

### overlay-modal

A general purpose modal component.

### render-group

A component which can be used to guarantee that certain children components are always rendered at the same time (once they are loaded) to provide a smooth user experience.
