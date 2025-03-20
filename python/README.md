# GSheetDB

A simple way to use Google Sheet as your Data Base with own authentication system.

> No google workspace project is needed.

## Install

```bash
pip install gsheetdb
```

## Setup

1. Create a google sheet
2. Add as many sheets (tables) as you want
3. First line is table header, first column must be `id`
4. Table relationship: set a column header with the name of a table, its content is the id (or ids) of the other table
5. Go to "Extensions > App Script"
6. Copy the content of the file [`gsheet.js`](/gsheet.js) to the current file.
7. Create a new deploy: "Deploy > New deployment"
    - **Select type**: "Web app"
    - **Description**: Anything you wanted
    - **Execute as**: "Me (your_email@gmail.com)"
    - **Who has access**: "Anyone"
8. Copy Deployment ID

## Usage

```js
from gsheetdb import Sheet

const sheet = Sheet({ 'deploymentId': '123456789abcdef' })
```

### Get Tables (with Schemas)

```js
sheet.tables();
```

### Add Item

`Ids` are generated automaticaly

```js
sheet.set('Sheet1', [
    {'col1': 'val1', 'col2': 2, 'col3': datetime.datetime()},
    {'col1': 'val2', 'col2': 3, 'col3': datetime.datetime()},
])
```

### Get Item

Return all items

```js
const data = sheet.get('Sheet1')
```

### Modify Item

Same API as [set](#add-item) but with `id`. If `id` doesn't exist, it fails.

```js
sheet.set('Sheet1', [
    {id: 1234, 'col1': 'val2'}
])
```

### Delete Item

Remove by item ids

```js
sheet.rm('Sheet1', [1234])
```

### New Table

```js
sheet.new('MyNewSheetName', ['field1', 'field2', 'field3'])
```

### Query Items

Add the `query` to [get](#get-item) function.

Query can be object or array.

General rules:

- **`=`**: `field: value`
- **`!=`**: `field: {ne: value}`. `ne` stands for "not equal"
- **`>`**: `field: {gt: value}`. `gt` stands for "greater than"
- **`<`**: `field: {lt: value}`. `lt` stands for "lower than"
- **`>=`**: `field: {ge: value}`. `ge` stands for "greater or equals to"
- **`<=`**: `field: {le: value}`. `le` stands for "greater or equals to"
- **AND**: curly brace `{A, B, C}` read as "_A and B and C_"
- **OR**: square brace `[A, B, C]` read as "_A or B or C_"

<details>

<summary> Examples:</summary>

##### Get all items where column `col1` is equal to `123`

```js
sheet.get('Sheet1', {'col1': 123})
```

##### Get all items where column `col1 == 123` **AND** `col2 == 456`

```js
sheet.get('Sheet1', {'col1': 123, 'col2': 456})
```

##### Get all items where column `col1 == 123` **OR** `col1 == 456`

```js
sheet.get('Sheet1', [{'col1': [123, 456]}])
// OR
sheet.get('Sheet1', [{'col1': 123}, {'col1': 456}])
```

##### Get all items where column `col1 > 123`

```js
sheet.get('Sheet1', {'col1': {'gt': 123}})
```

##### Get all items where column `col1 < 123`

```js
sheet.get('Sheet1', {'col1': {'lt': 123}})
```

##### Get all items where column `col1 >= 123`

```js
sheet.get('Sheet1', {'col1': {'ge': 123}})
```

##### Get all items where column `col1 >= 123`

```js
sheet.get('Sheet1', {'col1': {'ge': 123}})
```

##### Get all items from interval `col1 > 123` **AND** `col1 <= 456` (for short `(123, 456]`)

```js
sheet.get('Sheet1', {'col1': {'gt': 123, le: 456}})
```

##### Get all items where `col1` belongs to interval `(1, 3]` **OR** from interval `[14, 16)`

```js
sheet.get('Sheet1', {'col1': [{'gt': 1, le: 3}, {'ge': 14, 'lt': 16}]})
```

##### Get all items where `col1 == 30` **OR** belongs to interval `(1, 3]` **OR** to interval `[14, 16)`

```js
sheet.get('Sheet1', {'col1': [30, {'gt': 1, 'le': 3}, {'ge': 14, 'lt': 16}]})
```

</details>

## Auth (Optional)

Create a table `_user` with the following columns:

1. **id** to identify each user.

2. **token** or **username** and **password** depending on how you want to do the login.

3. **permission** should contain either `admin`, `user` or `blocked` (default).
    - `admin` can read (**r**), write (**w**) and delete (**x**) access to all tables.
    - `user` can only read recursively tables that reference its user's `id`.
    - `blocked` can not do **rwx**.

4. **read** allow or disable read to tables, give their names splited by ",".
5. **write** allow or disable write to tables, give their names splited by ",".
6. **delete** allow or disable delete to tables, give their names splited by ",".

> You can change the name of Auth table [here](src/gsheet.js#L1).

<details>

<summary>Example</summary>


Table: **_user**
| id | token  | permission | read   | write | delete  |
|----|--------|------------|--------|-------|---------|
|  1 | user01 | admin      |        |       | Table3  |
|  2 | user02 | user       |        |       |         |
|  3 | user03 | block      | Table3 |       |         |

Table: **Table1**
| id | _user | col1 | Table2 |
|----|-------|------|--------|
| 10 |     2 | 123  |    456 |
| 11 |     4 | 321  |    789 |

Table: **Table2**
|  id | my_data |
|-----|---------|
| 456 |     123 |

Table: **Table3**
| id | temperature |
|----|-------------|
| 14 |        43.4 |

`user01` can read, write and delete items from all tables except delete **Table3**.

`user02` can not get **Table2** directly, instead he can ask **Table1**, because it has a reference to him (by its user's id). By asking **Table1** he will only get the entries where column **_user** contains its user's id. In this example he will get the entry `id == 10`. This entry has the column **Table2** which references to a valid entry on **Table2**, so he will get this entry as well. Note that he has no access to **Table3**.

`user03` is blocked by default he can only read **Table3**.

</details>

