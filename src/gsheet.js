const makeSuccess = message => ({"success": true,  message});
const makeError = message => ({"success": false,  message});
const jsonifyResult = e => ContentService.createTextOutput(JSON.stringify(e)).setMimeType(ContentService.MimeType.JSON);
const getHeader = table => table.getRange(1,1,1, table.getLastColumn()).getValues()?.[0] || [];

function appendRows(data) {
  if(data?.length){
    const lastRow = this.getLastRow();
    const numRowsToAppend = data.length;
    const startRow = lastRow === 0 ? 1 : lastRow + 1;
    this.getRange(startRow, 1, numRowsToAppend, data[0].length).setValues(data);
  }
}
function setTable(data) {
  if (data?.length){
    const numRowsToAppend = data.length;
    this.getRange(2, 1, numRowsToAppend, data[0].length).setValues(data);
  }
}
function generateUUID() {
  let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return uuid;
}

const ss = SpreadsheetApp.getActive();

const doPost = event => jsonifyResult(main(JSON.parse(event.postData.contents)));
const doGet = () => ContentService.createTextOutput("Successo!!!").setMimeType(ContentService.MimeType.TEXT);

function main({ action, table: tableName, ...props }) {
  if (!ss) {
    return makeError('No active Spreadsheet active');
  }
  
  if (!actions[action]) {
    return makeError(`Invalid action ${action}`);
  }

  const table = ss.getSheetByName(tableName);
  if (tableName && !table) {
    return makeError(`No table ${table}`);
  }

  try {
    return makeSuccess(actions[action]({ table, ...props }));
  } catch(message){ 
    return makeError(message);
  }
}

const actions = {}
actions['set'] = setData;
actions['get'] = getData;
actions['rm'] = rmData;
actions['tables'] = tablesData;

function setData({ table, items }) {
  table.appendRows = appendRows;
  table.setTable = setTable;
  const modifiedItems = items.filter(item => item.id);
  const newItems = items.filter(item => !item.id);
  const header = getHeader(table);
    
  // Has items to modify?
  if (modifiedItems?.length) {
    // Prepare data to parse modified items
    const modifiedItemsObject = modifiedItems.reduce((acc, item) => ({...acc, [item.id]: item}),{});
    const itemsOnTable = getData({table});
    const idOfItemsOnTable = itemsOnTable.map(item => item.id);

    // Validate modified items
    if (modifiedItems.some(item => !idOfItemsOnTable.includes(item.id))) {
      throw `[Modify items] Items without id: ${modifiedItems.map(({id}, index) => !idOfItemsOnTable.includes(id) ? index : null).filter(e => e === null)}`
    }

    // Modify table items
    table.setTable(
      itemsOnTable
        .map(item => ({...item, ...modifiedItemsObject[item.id]}))
        .map(item => header.map(h => item[h]))
    );
  }

  // Has items to add?
  if (newItems?.length) {
    // Validate new items
    const newItemsMissingFields = newItems.map(item => header.filter(h => !(h in {id:null, ...item})));
    if (newItemsMissingFields.some(item => item.length !== 0)) {
      throw `[Add items] Missing fields: ${newItemsMissingFields.reduce((acc, fields, index) => fields.length !== 0 ? `${acc}\n ${index}: ${fields}` : acc, '')}
      `;
    }

    // Add new items
    table.appendRows(
      newItems
      .map(item => ({...item, id: generateUUID()}))
      .map(item => header.map(h => item[h]))
    );
  }
}

function getData({ table }) {
  const [header, ...content] = table.getDataRange().getValues();
  return content.map(d => header.reduce((a, h, i) => ({...a, [h]: d[i]}), {}))
}

function rmData({ table, ids }) {
  const tableItemsObject = getData({ table }).reduce((acc, item, index) => ({...acc, [item.id]: {...item, row: index+2}}), {});
  const rowsToDelete = [... new Set(ids.map(id => tableItemsObject[id]?.row).filter(e => e))];
  rowsToDelete.sort().reverse().forEach(row => table.deleteRow(row));
}

function tablesData() {
  return ss.getSheets().map(sheet => sheet.getName());
}