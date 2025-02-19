# GSheets-DB

A simple way to use Google Sheet as your Data Base with own authentication system.

> No google workspace project is needed.

## Install

```bash
npm install gsheets-db
```

## Setup

1. Create a google sheet
2. Add as many sheets (tables) as you want
3. First line is table header, first column must be `id`
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

### Get Tables (with Schemas)

```js
await sheet.tables();
```

### Add Item

`Ids` are generated automaticaly

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

Same API as [set](#add-item) but with `id`. If `id` doesn't exist, it fails.

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

### Query Items

Add the query to [get](#get-item) function.

Query can be object or array.

General rules:

- **`=`**: `field: value`
- **`>`**: `field: {gt: value}`. `gt` stands for "greater than"
- **`<`**: `field: {lt: value}`. `lt` stands for "lower than"
- **`>=`**: `field: {ge: value}`. `ge` stands for "greater or equals to"
- **`<=`**: `field: {le: value}`. `le` stands for "greater or equals to"
- **AND**: curly brace `{A, B, C}` read as "_A and B and C_"
- **OR**: square brace `[A, B, C]` read as "_A or B or C_"

#### Examples:

##### Get all items where column `col1` is equal to `123`

```js
sheet.get('Sheet1', {col1: 123})
```

##### Get all items where column `col1 == 123` **AND** `col2 == 456`

```js
sheet.get('Sheet1', {col1: 123, col2: 456})
```

##### Get all items where column `col1 == 123` **OR** `col2 == 456`

```js
sheet.get('Sheet1', [{col1: 123}, {col2: 456}])
```

##### Get all items where column `col1 == 123` **OR** `col1 == 456`

```js
sheet.get('Sheet1', [{col1: [123, 456]}])
// OR
sheet.get('Sheet1', [{col1: 123}, {col1: 456}])
```

##### Get all items where column `col1 > 123`

```js
sheet.get('Sheet1', {col1: {gt: 123}})
```

##### Get all items where column `col1 < 123`

```js
sheet.get('Sheet1', {col1: {lt: 123}})
```

##### Get all items where column `col1 >= 123`

```js
sheet.get('Sheet1', {col1: {ge: 123}})
```

##### Get all items where column `col1 >= 123`

```js
sheet.get('Sheet1', {col1: {ge: 123}})
```

##### Get all items from interval `col1 > 123` **AND** `col1 <= 456` (for short `(123, 456]`)

```js
sheet.get('Sheet1', {col1: {gt: 123, le: 456}})
```

##### Get all items where `col1` belongs to interval `(1, 3]` **OR** from interval `[14, 16)`

```js
sheet.get('Sheet1', {col1: [{gt: 1, le: 3}, {ge: 14, lt: 16}]})
```

##### Get all items where `col1 == 30` **OR** belongs to interval `(1, 3]` **OR** to interval `[14, 16)`

```js
sheet.get('Sheet1', {col1: [30, {gt: 1, le: 3}, {ge: 14, lt: 16}]})
```

## Auth (Optional) (IN DEVELOPMENT)

Create a table with name `_users` and columns **id**, **access** and either:

1. **token**: if you want to login with token alone
2. **username, password**: if you want to do it with username and password 

On the client side you connect with:

```js
const sheet = new Sheet({
    deploymentId: '123456789abcdef',
    token: 'abc123'
    // or
    username: 'admin',
    password: 'admin'
})
```

The column `id` is used to filter 
