/**
 * OPEN MONEY TRACKER - JSON API BACKEND
 */

const SHEET_NAME = "Transactions";

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // CORS Header handling for GitHub Pages access
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter.action ? e.parameter : JSON.parse(e.postData.contents);
    const action = params.action;
    let result = {};

    if (action === "get") {
      result = getTransactions();
    } else if (action === "add") {
      result = addTransaction(params.data);
    } else if (action === "delete") {
      result = deleteTransaction(params.id);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["ID", "Date", "Type", "Category", "Platform", "Amount", "Description"]);
  }
  return sheet;
}

function getTransactions() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { success: true, data: [] };
  
  const headers = rows.shift();
  const data = rows.map(row => ({
    id: row[0],
    date: row[1],
    type: row[2],
    category: row[3],
    platform: row[4],
    amount: row[5],
    desc: row[6]
  }));
  
  // Return newest first
  return { success: true, data: data.reverse() };
}

function addTransaction(data) {
  const sheet = getSheet();
  // Expects data: {id, date, type, category, platform, amount, desc}
  sheet.appendRow([
    data.id, 
    data.date, 
    data.type, 
    data.category, 
    data.platform, 
    data.amount, 
    data.desc
  ]);
  return { success: true };
}

function deleteTransaction(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "ID not found" };
}
