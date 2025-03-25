const AUTH_TABLE_NAME = '_user';

const makeSuccess = message => ({ "success": true, message });
const makeError = message => ({ "success": false, message });
const jsonifyResult = e => ContentService.createTextOutput(JSON.stringify(e)).setMimeType(ContentService.MimeType.JSON);
const cacheFunction = function (f) { return new Proxy(f, { apply: function (target, thisArg, argArray) { return this[argArray] ?? (this[argArray] = f(...argArray)) } }) };

function generateUUID() {
  let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return uuid;
}

const ss = SpreadsheetApp.getActive();

class TableNoAuth {
  constructor(name) {
    this.name = name;
    this._sheet = ss.getSheetByName(name);
    if (!this._hasSheet()) {
      throw `Table "${name}" not found`;
    }

  }
  _hasSheet() {
    return !!this._sheet;
  }
  values() {
    if (!this._hasSheet()) {
      return [];
    }
    if (!this._items) {
      const [header, ...rows] = this._sheet.getDataRange().getValues();
      this._items = rows.map(d => header.reduce((a, h, i) => ({ ...a, [h]: d[i] }), {}));
    }
    return this._items;
  }
  header() {
    if (!this._hasSheet()) {
      return [];
    }
    if (this._items) {
      return Object.keys(this._items[0])
    }
    if (this._sheet.getLastColumn() === 0) {
      return [];
    }
    return this._sheet.getRange(1, 1, 1, this._sheet.getLastColumn()).getValues()?.[0] || []
  }
  append(data) {
    if (!this._hasSheet()) {
      return;
    }
    if (data?.length) {
      const numRows = data.length;
      const numCols = this.header().length;
      const numCurrentRows = this._sheet.getLastRow();
      const startRow = numCurrentRows === 0 ? 1 : numCurrentRows + 1;
      const [id, ...header] = this.header();
      this._sheet
        .getRange(startRow, 1, numRows, numCols)
        .setValues(data.map(row => [generateUUID(), ...header.map(h => row[h])]));
      this._items = [
        ...(this._items ?? []),
        ...data
      ];
    }
  }
  set(data) {
    if (!this._hasSheet()) {
      return;
    }
    if (data?.length) {
      const ids = this._sheet
        .getRange(2, 1, this._sheet.getLastRow(), 1)
        .getValues()
        .flat();
      const rows = ids.map(id => data.filter(d => d.id === id)?.[0]);
      const header = this.header();
      const numCols = header.length;
      rows.forEach((item, row) => {
        if (item) {
          const range = this._sheet.getRange(row + 2, 1, 1, numCols);
          const currentItem = range.getValues().flat();
          range.setValues([header.map((h, i) => item[h] ?? currentItem[i])])
        }
      });
      this._items = undefined;
    }
  }
  deleteRow(row) {
    if (!this._hasSheet()) {
      return false;
    }
    try {
      this._sheet.deleteRow(row);
    } catch {
      return false;
    }
    this._items = null;
    return true
  }
  _column(columnName) {
    if (!this._hasSheet()) {
      return [];
    }
    const columnIndex = this.header()
      .reduce((acc, name, index) =>
        name === columnName ? index + 1 : acc, null
      );
    if (columnIndex === null) {
      return []
    }
    const numRows = this._sheet.getLastRow() - 1;
    return this._sheet
      .getRange(2, columnIndex, numRows, 1)
      .getValues()
      .flat()
  }
}

class TableAuth extends TableNoAuth {
  constructor(...props) {
    super(...props);
    this._cachedColumns = {};
  }
  values() {
    if (this._items) {
      return this._items;
    }
    if (!USER.canRead(this.name)) {
      return [];
    }
    const values = super.values();
    this._items = USER.isAccessFilteredByUserId(this.name)
      ? values.filter(item => item[AUTH_TABLE_NAME] === USER.id)
      : values;
    return this._items;
  }
  header() {
    if (this._header) {
      return this._header;
    }
    if (!USER.canRead(this.name)) {
      return [];
    }
    this._header = super.header();
    if (USER.isAccessFilteredByUserId(this.name)) {
      const idColumn = this._column(AUTH_TABLE_NAME);
      if (!idColumn.some(id => id === USER.id)) {
        return [];
      }
    }
    return this._header;
  }
  append(data) {
    if (!USER.canWrite(this.name)) {
      return false;
    }
    return super.append(data);
  }
  set(data) {
    if (!USER.canWrite(this.name)) {
      return false;
    }
    return super.set(data);
  }
  deleteRow(row) {
    if (!USER.canDelete(this.name)) {
      return false;
    }
    return super.deleteRow(row);
  }
  _column(columnName) {
    if (this._cachedColumns[columnName]) {
      return this._cachedColumns[columnName];
    }
    if (!USER.canRead(this.name)) {
      return [];
    }
    this._cachedColumns[columnName] = super._column(columnName);
    if (USER.isAccessFilteredByUserId(this.name)) {
      const idColumn = super._column(AUTH_TABLE_NAME);
      this._cachedColumns[columnName] = this._cachedColumns[columnName].filter((_, i) => idColumn[i] === USER.id);
    }
    return this._cachedColumns[columnName];
  }
}

const USER = {
  hasAuthTable: cacheFunction(() => AUTH_TABLE_NAME && TABLES.tables(true).includes(AUTH_TABLE_NAME)),
  permission: null,
  canRead: () => true,
  canWrite: () => true,
  canDelete: () => true,
  canAdd: () => true,
  isAdmin: () => true,
  authTable: function () { return this.hasAuthTable() && new TableNoAuth(AUTH_TABLE_NAME) },
  isTokenBased: cacheFunction(() => USER.hasAuthTable() && USER.authTable().header().includes('token')),
  isAccessFilteredByUserId: name => USER.permission === 'user' && !USER.read.includes(name),
  login({ token, username, password }) {
    if (!this.hasAuthTable()) {
      return true;
    }
    if ((this.isTokenBased() && (!token && token !== undefined)) || ((!username && username !== undefined) && (!password && password !== undefined))) {
      return false;
    }
    const user = this.isTokenBased()
      ? this.authTable().values().filter(user => user.token == token)[0]
      : this.authTable().values().filter(user => user.username == username && user.password == password)[0]
    const allowedPermissions = ['admin', 'user', 'blocked'];
    if (user == undefined || !allowedPermissions.includes(user.permission)) {
      return false;
    }
    this.id = user.id;
    this.permission = user.permission;
    this.read = user.read.split(',');
    this.write = user.write.split(',');
    this.delete = user.delete.split(',');

    const isTableRefsUser = cacheFunction(name => new TableNoAuth(name)._column(AUTH_TABLE_NAME).some(id => id === USER.id))

    this.isAdmin = this.permission === 'admin'
      ? () => true
      : () => false

    this.canAdd = cacheFunction({
      admin: name => !USER.write.includes(name),
      user: name => USER.write.includes(name),
      blocked: name => false,
    }[this.permission]);

    this.canRead = cacheFunction({
      admin: name => !USER.read.includes(name),
      user: name => USER.read.includes(name) || isTableRefsUser(name),
      blocked: name => USER.read.includes(name),
    }[this.permission]);

    this.canWrite = cacheFunction({
      admin: name => !USER.write.includes(name),
      user: name => USER.write.includes(name) || isTableRefsUser(name),
      blocked: name => USER.write.includes(name),
    }[this.permission]);

    this.canDelete = cacheFunction({
      admin: name => !USER.delete.includes(name),
      user: name => USER.delete.includes(name) || isTableRefsUser(name),
      blocked: name => USER.delete.includes(name),
    }[this.permission]);

    return true;
  }
};

// Class to avoid double requests to the same tables
const TABLES = cacheFunction((name) => new (USER.hasAuthTable() ? TableAuth : TableNoAuth)(name));

TABLES.tables = cacheFunction((full = false) => {
  const fullTable = ss.getSheets().map(table => table.getName());
  return full
    ? fullTable
    : fullTable.filter(name => !name.startsWith('_') && name !== AUTH_TABLE_NAME)
})

TABLES.schemas = cacheFunction((full = false) => {
  let schemas = TABLES.tables(full)
    .reduce((acc, name) =>
      ({ ...acc, [name]: new TableNoAuth(name).header() }),
      {}
    );
  if (USER.hasAuthTable()) {
    schemas = Object.fromEntries(
      Object.entries(schemas)
        .filter(([name]) =>
          [USER.canRead, USER.canWrite, USER.canDelete].some(f => f(name)) &&
          name !== AUTH_TABLE_NAME
        )
    )
  }
  return schemas;
})

const doGet = () => jsonifyResult(main({ action: 'tables' }));
const doPost = event => jsonifyResult(main(JSON.parse(event.postData.contents)));

function main({ action, ...props }) {
  if (!ss) {
    return makeError('No active Spreadsheet active');
  }

  if (!USER.login(props)) {
    return makeError('Authetication failed');
  }

  if (!actions[action]) {
    return makeError(`Invalid action ${action}`);
  }

  try {
    return makeSuccess(actions[action](props));
  } catch (message) {
    return makeError(message);
  }
}

const actions = {}
actions['set'] = setData;
actions['get'] = getData;
actions['rm'] = rmData;
actions['tables'] = tablesData;
actions['new'] = newData;

function setData({ table: tableName, items }) {
  if (!USER.canWrite(tableName)) {
    throw `Can't set table "${tableName}"`;
  }
  const table = TABLES(tableName);
  const modifiedItems = items.filter(item => item.id);
  const newItems = items.filter(item => !item.id);
  const header = table.header();

  // Has items to modify?
  if (modifiedItems?.length) {
    // Prepare data to parse modified items
    // const modifiedItemsObject = modifiedItems.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
    // const itemsOnTable = new TableNoAuth(tableName).values();
    const idOfItemsOnTableAllowedToModify = table._column('id');

    // Validate modified items
    if (!modifiedItems.every(({ id }) => idOfItemsOnTableAllowedToModify.includes(id))) {
      throw `Item(s) with id(s) not allowed to be modified: ${modifiedItems.filter(({ id }) => !idOfItemsOnTableAllowedToModify.includes(id)).map(({ id }) => id)}`
    }

    // Modify table items
    table.set(
      modifiedItems
      // itemsOnTable
      //   .map(item => ({ ...item, ...modifiedItemsObject[item.id] }))
    );
  }

  // Has items to add?
  if (newItems?.length) {
    // Validate new items
    if (!USER.canAdd(tableName)) {
      throw `Not allowed to add new items`;
    }
    const newItemsMissingFields = newItems.map(item => header.filter(h => !(h in { [AUTH_TABLE_NAME]: null, id: null, ...item })));
    if (newItemsMissingFields.some(item => item.length !== 0)) {
      throw `Missing fields at add items: ${newItemsMissingFields.reduce((acc, fields, index) => fields.length !== 0 ? `${acc}\n ${index}: ${fields}` : acc, '')}
      `;
    }
    // Add new items
    table.append(
      header.includes(AUTH_TABLE_NAME)
        ? newItems.map(item => ({ ...item, [AUTH_TABLE_NAME]: USER.id }))
        : newItems
    );
  }
}

function getDataRecursively(items) {
  this._cachedItems = this._cachedItems ?? {};
  if ((items?.length ?? 0) === 0) {
    return items;
  }
  const tablesName = TABLES.tables();
  const header = Object.keys(items[0]);
  const referencedTables = header.reduce((acc, name) =>
    tablesName.includes(name)
      ? { ...acc, [name]: new TableNoAuth(name) }
      : acc,
    {});
  return items.map(item => {
    return header.reduce((a, h) => {
      if (h in referencedTables && typeof item[h] !== 'object') {
        const ids = item[h].toString().split(',').map(id => id.toString().trim());
        const refItemToConsult = referencedTables[h]
          .values()
          .filter(({ id }) => ids.includes(id.toString()))
          .map(item => this._cachedItems[`${h}.${item.id}`] ?? item);
        ids.forEach(id => (
          this._cachedItems[`${h}.${id}`] = refItemToConsult.filter(({ id: refId }) => id == refId)[0] ?? {}
        ));
        const refItemContent = getDataRecursively(refItemToConsult)
        if (refItemContent.length) {
          item[h] = refItemContent.length === 1
            ? refItemContent[0]
            : refItemContent;
        }
      }
      return { ...a, [h]: item[h] };
    }, {});
  });
}

function getData({ table: tableName, query }) {
  if (!USER.canRead(tableName)) {
    throw `Can't get table "${tableName}"`;
  }
  const table = TABLES(tableName);
  const items = table.values();
  const header = table.header();
  if (!query || Object.keys(query) === 0 || query._deep === false) {
    if (query?._deep === false) {
      return items;
    }
    return getDataRecursively(items);
  }
  const validQueryKeys = new Set(['ne', 'gt', 'lt', 'ge', 'le']);
  const testConditions = (c, d) =>
    c === d ||
    (
      typeof c === 'object' &&
      validQueryKeys.has(Object.keys(c)?.[0]) &&
      ('ne' in c ? d != c.ne : true) &&
      ('gt' in c ? d > c.gt : true) &&
      ('lt' in c ? d < c.lt : true) &&
      ('ge' in c ? d >= c.ge : true) &&
      ('le' in c ? d <= c.le : true)
    )
  const buildFilterFunction = query =>
    header.reduce((a, h) =>
      !(h in query)
        ? a
        : (
          Array.isArray(query[h])
            ? { ...a, [h]: d => query[h].some(c => testConditions(c, d[h])) }
            : typeof query[h] === 'object'
              ? { ...a, [h]: d => testConditions(query[h], d[h]) }
              : { ...a, [h]: d => query[h] === d[h] }
        ), {}
    );
  return Object.values(
    (Array.isArray(query) ? query : [query]).map(q => {
      const filterFunctions = buildFilterFunction(q);
      const filteredItems = items.filter(d => header.reduce((a, h) => a && (filterFunctions?.[h]?.(d) ?? true), true));
      return filteredItems;
    })
      .flat()
      .reduce((a, item) => ({ ...a, [item.id]: item }), {})
  );
}

function rmData({ table: tableName, ids }) {
  if (!ids || !Array.isArray(ids)) {
    throw `Wrong ids`
  }
  if (!USER.canDelete(tableName)) {
    throw `Can't delete items of table "${tableName}"`;
  }
  const table = TABLES(tableName);
  const idOfItemsAllowedToBeRemoved = table._column('id');
  const tableItemsObject = new TableNoAuth(tableName).values()
    .reduce((acc, item, index) =>
      idOfItemsAllowedToBeRemoved.includes(item.id)
        ? ({ ...acc, [item.id]: { ...item, row: index + 2 } })
        : acc,
      {}
    );
  const rowsToDelete = [... new Set(ids.map(id => tableItemsObject[id]?.row).filter(e => e))];
  return rowsToDelete.sort().reverse().map(row => {
    table.deleteRow(row);
  });
}

function tablesData() {
  return TABLES.schemas();
}

function newData({ table: tableName, header }) {
  if (!USER.isAdmin()) {
    throw 'Only admins can create new tables';
  }
  if (!Array.isArray(header)) {
    throw `Header is not an array of string`
  }
  const newSheet = ss.insertSheet(0);
  newSheet.setName(tableName);
  newSheet.getRange(1, 1, 1, header.length + 1).setValues([['id', ...header]]);
}