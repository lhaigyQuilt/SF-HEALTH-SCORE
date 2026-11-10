# Extracts a "<Object> Field Health Analysis <BU>.xlsx" workbook into the app's dataset JSON
# (scoringModel, fields, additionalNotes, notAssessable, readMe).
# usage: python extract_wb.py <xlsx> <out.json>
import datetime
import json
import sys

import openpyxl

src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, read_only=True, data_only=False)

KEYS = ['apiName', 'label', 'dataType', 'origin', 'required', 'formula', 'checkbox', 'createdDate', 'age',
        'createdBeforeWindow', 'createdBy', 'lastModified', 'recordsPopulated', 'pctAll', 'eligibleSinceCreation',
        'recordsPopulatedSinceCreation', 'pctSinceCreation', 'pct90d', 'pct365d', 'firstPopulated', 'lastPopulated',
        'monthsSinceLast', 'adoptionOnset', 'adoptionLag', 'distinctValues', 'flows', 'formulaRefs', 'layouts',
        'otherRefs', 'totalRefs', 'refTypes', 'helpText', 'description', 'sourceRecordsPopulated', 'varianceVsSource']


def iso(v):
    if isinstance(v, datetime.datetime):
        return v.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    if isinstance(v, datetime.date):
        return v.strftime('%Y-%m-%dT00:00:00.000Z')
    return v


def cell(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return iso(v)
    return v


# Scoring Model inputs live in fixed cells (B5:B33).
sm_ws = wb['Scoring Model']
SM_CELLS = {
    'weightPopulation': 'A5', 'weightRecency': 'A6', 'weightTrend': 'A7', 'weightInfo': 'A8',
    'weightIntegration': 'A9', 'weightDoc': 'A10', 'popFullCreditPct': 'A14', 'recencyMonthsZero': 'A15',
    'infoDistinctFull': 'A16', 'integrationRefsFull': 'A17', 'graceDays': 'A18', 'trendWindowDays': 'A19',
    'minEligible': 'A20', 'dormancyMonths': 'A21', 'bandHealthy': 'A24', 'bandMonitor': 'A25', 'bandReview': 'A26',
    'bandLikelyDebt': 'A27', 'bandRetire': 'A28', 'activePct': 'A31', 'growingMultiple': 'A32', 'asOfDate': 'A33',
}
b = {i: r[1] for i, r in enumerate(sm_ws.iter_rows(min_col=1, max_col=2, values_only=True), start=1)}
scoring = {k: iso(b[int(c[1:])]) for k, c in SM_CELLS.items()}

fh_rows = wb['Field Health'].iter_rows(values_only=True)
fh_header = list(next(fh_rows))
override_col = fh_header.index('Manual Override') if 'Manual Override' in fh_header else None
fields = []
for r in fh_rows:
    if not r[0]:
        continue
    f = {k: cell(r[i]) for i, k in enumerate(KEYS)}
    # "Manual Override" is an annotation column on some workbooks; no formula reads it.
    if override_col is not None and len(r) > override_col and r[override_col] not in (None, ''):
        f['manualOverride'] = r[override_col]
    fields.append(f)


def table(name, header_row):
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    cols = [c for c in rows[header_row - 1] if c is not None]
    data = []
    for r in rows[header_row:]:
        if not r or r[0] is None:
            continue
        data.append({c: cell(r[i]) for i, c in enumerate(cols)})
    return {'columns': cols, 'rows': data}


def find_header(name, first):
    for i, r in enumerate(wb[name].iter_rows(values_only=True), start=1):
        if r and r[0] == first:
            return i
    raise SystemExit(f'no header in {name}')


notes = table('Additional Notes', find_header('Additional Notes', 'API Name'))
na_ws = wb['Not Assessable']
na_first = next(r[0] for r in na_ws.iter_rows(min_row=4, max_row=4, values_only=True))
notass = table('Not Assessable', find_header('Not Assessable', na_first))
readme = [{'a': cell(r[0]), 'b': cell(r[1]) if len(r) > 1 else None}
          for r in wb['Read Me'].iter_rows(values_only=True) if r and r[0] is not None]

json.dump({'scoringModel': scoring, 'fields': fields, 'additionalNotes': notes, 'notAssessable': notass,
           'readMe': readme}, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print(out, len(fields), 'fields', len(notes['rows']), 'notes', len(notass['rows']), 'not assessable')
