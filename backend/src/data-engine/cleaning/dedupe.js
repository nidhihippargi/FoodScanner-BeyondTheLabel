'use strict';

function getBarcode(record) { return record?.identifiers?.gtin?.value || null; }

/** Only exact GTIN matches are considered duplicates. Do not deduplicate by fuzzy product-name matching. */
function deduplicateRecords(records) {
  const byBarcode = new Map();
  const unique = [];
  const duplicates = [];
  for (const record of records || []) {
    const barcode = getBarcode(record);
    if (!barcode) { unique.push(record); continue; }
    if (!byBarcode.has(barcode)) {
      byBarcode.set(barcode, record);
      unique.push(record);
    } else {
      duplicates.push({ barcode, retainedRecordId: byBarcode.get(barcode).recordId, duplicateRecordId: record.recordId });
    }
  }
  return { unique, duplicates };
}

module.exports = { deduplicateRecords, getBarcode };
