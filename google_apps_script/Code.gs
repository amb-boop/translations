const COUNTRY_SHEETS = ["Spain", "Poland", "Czech Republic"];
const REVIEW_COLUMNS = [
  "key",
  "run_date",
  "locale",
  "country",
  "reference_mc",
  "model_id",
  "color_id",
  "issue",
  "confidence",
  "product_url",
  "image_url",
  "category",
  "universe",
  "current_title",
  "current_long_description",
  "recommended_title",
  "recommended_long_description",
  "source_logic",
  "proposal_source",
  "fr_title_changed",
  "fr_long_description_changed",
  "previous_fr_title",
  "current_fr_title",
  "previous_fr_long_description",
  "current_fr_long_description",
  "status",
  "reviewer_comment",
  "approved_title",
  "approved_long_description",
  "last_reviewed_at"
];

const PRESERVED_REVIEW_COLUMNS = [
  "status",
  "reviewer_comment",
  "approved_title",
  "approved_long_description",
  "last_reviewed_at"
];

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  writeSimpleSheet_(ss, "Summary", payload.sheets.Summary || []);
  writeSimpleSheet_(ss, "Daily changes", payload.sheets["Daily changes"] || []);

  COUNTRY_SHEETS.forEach(function(name) {
    writeReviewSheet_(ss, name, payload.sheets[name] || []);
  });

  appendHistory_(ss, payload);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, run_date: payload.run_date }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeSimpleSheet_(ss, name, rows) {
  const sheet = getOrCreateSheet_(ss, name);
  sheet.clearContents();
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(
    rows.map(function(row) {
      return headers.map(function(header) {
        return row[header] || "";
      });
    })
  );
  formatHeader_(sheet, headers.length);
}

function writeReviewSheet_(ss, name, incomingRows) {
  const sheet = getOrCreateSheet_(ss, name);
  const preserved = readPreservedReviewState_(sheet);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, REVIEW_COLUMNS.length).setValues([REVIEW_COLUMNS]);

  if (incomingRows.length) {
    const values = incomingRows.map(function(row) {
      const existing = preserved[row.key] || {};
      return REVIEW_COLUMNS.map(function(column) {
        if (PRESERVED_REVIEW_COLUMNS.indexOf(column) !== -1 && existing[column]) {
          return existing[column];
        }
        return row[column] || "";
      });
    });
    sheet.getRange(2, 1, values.length, REVIEW_COLUMNS.length).setValues(values);
  }

  formatHeader_(sheet, REVIEW_COLUMNS.length);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(REVIEW_COLUMNS.length, 12));
  applyReviewValidation_(sheet);
}

function readPreservedReviewState_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};

  const headers = values[0];
  const keyIndex = headers.indexOf("key");
  if (keyIndex === -1) return {};

  const result = {};
  values.slice(1).forEach(function(row) {
    const key = row[keyIndex];
    if (!key) return;
    result[key] = {};
    PRESERVED_REVIEW_COLUMNS.forEach(function(column) {
      const index = headers.indexOf(column);
      result[key][column] = index === -1 ? "" : row[index];
    });
  });
  return result;
}

function appendHistory_(ss, payload) {
  const sheet = getOrCreateSheet_(ss, "History");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "timestamp",
      "run_date",
      "mode",
      "queue_items",
      "message"
    ]);
    formatHeader_(sheet, 5);
  }
  const countries = payload.summary && payload.summary.countries ? payload.summary.countries : {};
  const queueItems = Object.keys(countries).reduce(function(sum, locale) {
    return sum + (countries[locale].metrics.mc_to_review || 0);
  }, 0);
  sheet.appendRow([
    new Date(),
    payload.run_date || "",
    payload.summary ? payload.summary.mode : "",
    queueItems,
    payload.summary ? payload.summary.first_run_message : ""
  ]);
}

function applyReviewValidation_(sheet) {
  const statusColumn = REVIEW_COLUMNS.indexOf("status") + 1;
  if (statusColumn < 1) return;
  const range = sheet.getRange(2, statusColumn, Math.max(1, sheet.getMaxRows() - 1), 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Draft", "Approved", "Rejected", "Needs copy review"], true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function formatHeader_(sheet, columnCount) {
  const range = sheet.getRange(1, 1, 1, columnCount);
  range.setFontWeight("bold");
  range.setBackground("#f5edeb");
  range.setFontColor("#25282d");
}

