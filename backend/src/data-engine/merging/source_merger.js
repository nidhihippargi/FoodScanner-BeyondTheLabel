'use strict';

const { ConflictError } = require('../errors');
const { computeQualitySummary } = require('../quality/quality_checks');

function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function sourceIdOf(wrapper, fallback) { return wrapper?.provenance?.[0]?.sourceId || fallback; }
function conflictEntry(fieldPath, left, right, fallbackLeft, fallbackRight, valueKey = 'value') {
  return {
    fieldPath,
    candidates: [
      { sourceId: sourceIdOf(left, fallbackLeft), value: left?.[valueKey] ?? left?.rawText ?? left?.originalValue ?? null },
      { sourceId: sourceIdOf(right, fallbackRight), value: right?.[valueKey] ?? right?.rawText ?? right?.originalValue ?? null },
    ],
    resolutionStatus: 'unresolved',
  };
}
function mergeWrapper(left, right, path, conflicts, sourceLeft, sourceRight, valueKey = 'value') {
  if (!left || left.status === 'missing') return right || left;
  if (!right || right.status === 'missing') return left;
  const lv = left[valueKey]; const rv = right[valueKey];
  const combinedProvenance = [...(left.provenance || []), ...(right.provenance || [])];
  if (sameJson(lv, rv)) return { ...left, provenance: combinedProvenance, status: left.status === 'unverified' || right.status === 'unverified' ? 'unverified' : left.status };
  conflicts.push(conflictEntry(path, left, right, sourceLeft, sourceRight, valueKey));
  return { ...left, status: 'conflicting', provenance: combinedProvenance };
}

function mergeObservations(existing, incoming, { now = () => new Date().toISOString() } = {}) {
  if (!existing || !incoming) throw new TypeError('Both existing and incoming product records are required.');
  const a = existing.identifiers?.gtin?.value;
  const b = incoming.identifiers?.gtin?.value;
  if (a && b && a !== b) throw new ConflictError('Cannot merge observations with different GTINs.', { existingGtin: a, incomingGtin: b });
  const sourceLeft = existing.sourceRecords?.[0]?.sourceId || 'source-existing';
  const sourceRight = incoming.sourceRecords?.[0]?.sourceId || 'source-incoming';
  const conflicts = [...(existing.conflicts || []), ...(incoming.conflicts || [])];
  const merged = structuredClone(existing);
  merged.sourceRecords = [...(existing.sourceRecords || [])];
  for (const record of incoming.sourceRecords || []) if (!merged.sourceRecords.some((item) => item.sourceId === record.sourceId)) merged.sourceRecords.push(record);

  merged.productName = mergeWrapper(existing.productName, incoming.productName, '/productName/value', conflicts, sourceLeft, sourceRight);
  merged.brand = mergeWrapper(existing.brand, incoming.brand, '/brand/value', conflicts, sourceLeft, sourceRight);
  merged.ingredients = mergeWrapper(existing.ingredients, incoming.ingredients, '/ingredients/rawText', conflicts, sourceLeft, sourceRight, 'rawText');
  merged.packageQuantity = mergeWrapper(existing.packageQuantity, incoming.packageQuantity, '/packageQuantity/rawText', conflicts, sourceLeft, sourceRight, 'rawText');

  const leftBasis = existing.nutrition?.declaredBasis || 'unknown';
  const rightBasis = incoming.nutrition?.declaredBasis || 'unknown';
  merged.nutrition = {
    ...(existing.nutrition || {}),
    declaredBasis: leftBasis === 'unknown' ? rightBasis : leftBasis,
    servingSize: mergeWrapper(existing.nutrition?.servingSize, incoming.nutrition?.servingSize,
      '/nutrition/servingSize/rawText', conflicts, sourceLeft, sourceRight, 'rawText'),
    nutrients: { ...(existing.nutrition?.nutrients || {}) },
  };
  if (leftBasis !== 'unknown' && rightBasis !== 'unknown' && leftBasis !== rightBasis) {
    conflicts.push({ fieldPath: '/nutrition/declaredBasis', candidates: [
      { sourceId: sourceLeft, value: leftBasis }, { sourceId: sourceRight, value: rightBasis },
    ], resolutionStatus: 'unresolved' });
  }
  for (const [key, incomingNutrient] of Object.entries(incoming.nutrition?.nutrients || {})) {
    const current = merged.nutrition.nutrients[key];
    if (!current || current.status === 'missing') merged.nutrition.nutrients[key] = incomingNutrient;
    else if (incomingNutrient.status !== 'missing') {
      const sameOriginal = sameJson(current.originalValue, incomingNutrient.originalValue);
      if (sameOriginal) {
        const representations = [...(current.standardizedValues || [])];
        for (const representation of incomingNutrient.standardizedValues || []) {
          if (!representations.some((item) => sameJson(item, representation))) representations.push(representation);
        }
        merged.nutrition.nutrients[key] = { ...current, standardizedValues: representations,
          provenance: [...(current.provenance || []), ...(incomingNutrient.provenance || [])] };
      }
      else {
        conflicts.push({ fieldPath: `/nutrition/nutrients/${key}`, candidates: [
          { sourceId: sourceIdOf(current, sourceLeft), value: current.originalValue },
          { sourceId: sourceIdOf(incomingNutrient, sourceRight), value: incomingNutrient.originalValue },
        ], resolutionStatus: 'unresolved' });
        merged.nutrition.nutrients[key] = { ...current, status: 'conflicting', provenance: [...(current.provenance || []), ...(incomingNutrient.provenance || [])] };
      }
    }
  }
  const leftGtin = existing.identifiers?.gtin || { value: null, status: 'missing', provenance: [] };
  const rightGtin = incoming.identifiers?.gtin || { value: null, status: 'missing', provenance: [] };
  merged.identifiers = { ...(existing.identifiers || {}), gtin: {
    value: a || b || null,
    status: a || b ? (leftGtin.status === 'unverified' || rightGtin.status === 'unverified' ? 'unverified' : 'available') : 'missing',
    provenance: [...(leftGtin.provenance || []), ...(rightGtin.provenance || [])],
  } };
  // Keep the identifier value from whichever observation actually supplied it.
  if (!a && b) merged.identifiers.gtin.value = rightGtin.value;
  merged.images = [...(existing.images || [])];
  for (const image of incoming.images || []) if (!merged.images.some((item) => item.url === image.url)) merged.images.push(image);
  merged.conflicts = conflicts;
  merged.updatedAt = now();
  merged.quality = computeQualitySummary(merged);
  return merged;
}

module.exports = { mergeObservations };
