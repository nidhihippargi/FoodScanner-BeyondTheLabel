'use strict';

function computeQualitySummary(record) {
  const missing = [];
  const unverified = [];
  const conflicted = [];
  const addStatus = (path, status) => {
    if (status === 'missing') missing.push(path);
    if (status === 'unverified') unverified.push(path);
    if (status === 'conflicting') conflicted.push(path);
  };
  addStatus('/identifiers/gtin', record.identifiers?.gtin?.status);
  addStatus('/productName', record.productName?.status);
  addStatus('/brand', record.brand?.status);
  addStatus('/packageQuantity', record.packageQuantity?.status);
  addStatus('/ingredients', record.ingredients?.status);
  addStatus('/nutrition/servingSize', record.nutrition?.servingSize?.status);
  for (const [key, nutrient] of Object.entries(record.nutrition?.nutrients || {})) addStatus(`/nutrition/nutrients/${key}`, nutrient.status);
  const unresolved = (record.conflicts || []).some((item) => item.resolutionStatus === 'unresolved');
  const hasConflicts = unresolved || conflicted.length > 0;
  const hasCoreFacts = Boolean(record.productName?.value || record.ingredients?.rawText || Object.keys(record.nutrition?.nutrients || {}).length);
  const recordStatus = hasConflicts ? 'conflicted' : !hasCoreFacts ? 'insufficient' : (missing.length || unverified.length) ? 'partial' : 'complete';
  return {
    recordStatus,
    missingFields: [...new Set(missing)].sort(),
    unverifiedFields: [...new Set(unverified)].sort(),
  };
}

function runQualityChecks(record) {
  const summary = computeQualitySummary(record);
  const issues = [];
  if (summary.recordStatus === 'insufficient') issues.push({ code: 'INSUFFICIENT_DATA', message: 'No usable product name, ingredient text or nutrition facts were found.' });
  if (summary.missingFields.length) issues.push({ code: 'MISSING_FIELDS', paths: summary.missingFields });
  if (summary.unverifiedFields.length) issues.push({ code: 'UNVERIFIED_FIELDS', paths: summary.unverifiedFields });
  if (summary.recordStatus === 'conflicted') issues.push({ code: 'UNRESOLVED_CONFLICTS', count: (record.conflicts || []).filter((item) => item.resolutionStatus === 'unresolved').length });
  return { ...summary, issues };
}

module.exports = { computeQualitySummary, runQualityChecks };
