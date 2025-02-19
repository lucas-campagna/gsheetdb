# GSheets-DB

A simple way to use Google Sheet as your Data Base with own authentication system.

> No google project is needed.

## Install

```bash
npm install gsheets-db
```

## Setup

1. Create a google sheet
2. Add as many sheets (tables) as you want
3. First line is table header
4. Table relationship: set a column header with the name of a table, its content is the id (or ids) of the other table
5. Go to "Extensions > App Script"
6. Copy the content of the file `gsheet.js` to the current file.
7. Create a new deploy: "Deploy > New deployment"
    - **Select type**: "Web app"
    - **Description**: Anything you wanted
    - **Execute as**: "Me (your_email@gmail.com)"
    - **Who has access**: "Anyone"
8. Copy Deployment ID

## Usage

```js
import { Sheet } from 'gsheets-db';

const sheet = new Sheet({ deploymentId: '123456789abcdef' })
```

### Get Tables

```js
await sheet.tables();
```

### Add Item

```js
await sheet.set('Sheet1', [
    {col1: 'val1', col2: 2, col3: new Date()},
    {col1: 'val1', col2: 2, col3: new Date()},
])
```

### Get Item

Return all items

```js
const data = await sheet.get('Sheet1')
```

### Modify Item

Same API as `set` but with `id`. If `id` doesn't exist, it fails.

```js
sheet.set('Sheet1', [
    {id: 1234, col1: 'val2'}
])
```

### Delete Item

Remove by item ids

```js
sheet.rm('Sheet1', [1234])
```