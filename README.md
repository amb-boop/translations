# Etam Localization MVP

Localization review tool for Etam product feeds.

The official business interface is the online HTML tool. The Excel workbook is kept only as an old fallback artifact and should not be used as the source of validation.

Online interface: `https://amb-boop.github.io/translations/`

The tool compares the French reference feed with the localized Lengow feeds, deduplicates at `reference_mc` level, creates daily MC snapshots, compares them with the latest baseline, and generates country review queues.

Current review scope: AH26 only, identified by `sap_saisj = 2026` and `sap_saiso = 0002` / `2`.

## Commands

From this folder:

```bash
npm run generate
npm run generate -- --online
npm run generate -- --local
npm run generate -- --full
npm run generate -- --incremental
npm run generate -- --online --incremental --publish-sheets
```

Default behavior:

```bash
npm run generate -- --online --incremental
```

Official automatic update:

The GitHub workflow `.github/workflows/update-tool.yml` refreshes the online HTML tool twice a week, every Monday and Thursday morning. It downloads the live Lengow/Product Feed URLs, regenerates the interface, updates `docs/index.html`, and publishes the same HTML to `gh-pages`.

Local fallback launcher:

```powershell
.\run_weekly_update.ps1
```

Install the fallback Windows task:

```powershell
.\install_weekly_update_task.ps1
```

## Online Mode

Online mode downloads the feeds from Lengow/Product Feed URLs, stores a dated raw copy, and uses that copy for the daily audit.

Feed URLs:

- France reference feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_fr_fr_productfeed_mcvt.csv`
- Spain feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_es_es_lengow_mcvt.csv`
- Poland feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_pl_pl_lengow_mcvt.csv`
- Czech Republic feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_cz_cz_lengow_mcvt.csv`
- United Kingdom feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_uk_en_gb_lengow_mcvt.csv`
- Belgium Flemish feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_be_nl_be_lengow_mcvt.csv`
- Switzerland German feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_ch_de_ch_lengow_mcvt.csv`
- Germany feed: `https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_de_de_lengow_mcvt.csv`

Raw files are stored here:

```text
data/raw/YYYY-MM-DD/
```

## Local Mode

Local mode reads files from:

```text
input/
```

Expected file names:

```text
input/etam_fr_fr_productfeed_mcvt.csv
input/etam_es_es_lengow_mcvt.csv
input/etam_pl_pl_lengow_mcvt.csv
input/etam_cz_cz_lengow_mcvt.csv
```

If an online download fails, the script automatically tries this local fallback. It logs a clear warning instead of stopping abruptly.

## Snapshots

Daily snapshots are written to:

```text
data/snapshots/YYYY-MM-DD/
  fr_FR_mc_snapshot.json
  es_ES_mc_snapshot.json
  pl_PL_mc_snapshot.json
  cz_CZ_mc_snapshot.json
```

Latest baselines are written to:

```text
data/baseline/
  latest_fr_FR_mc_snapshot.json
  latest_es_ES_mc_snapshot.json
  latest_pl_PL_mc_snapshot.json
  latest_cz_CZ_mc_snapshot.json
```

Each MC snapshot stores:

- locale
- reference_mc
- model_id
- color_id
- reference_mcvt_count
- title
- title_hash
- long_description
- long_description_hash
- category
- universe
- product_url
- image_url
- first_seen_at
- last_seen_at
- source_file_date
- source_url

## Full Audit

Use a full audit when you want to regenerate a complete queue:

```bash
npm run generate -- --online --full
```

or with local files:

```bash
npm run generate -- --local --full
```

## Incremental Daily Audit

Use incremental mode for the daily workflow:

```bash
npm run generate
```

The incremental queue focuses on:

- new MC references
- French title changes
- French long description changes
- empty, non-localized or mixed-language local titles
- missing local long descriptions
- critical local quality warnings
- persistent issues

If French source content changes, the reference is sent back to review for `es_ES`, `pl_PL` and `cz_CZ`. Existing local content is never overwritten automatically.

## First Run

If no previous baseline exists, the run creates the first baseline and generates an initial anomaly queue.

The dashboard displays:

```text
No previous baseline found. Today's run has been saved as the first baseline.
```

## Outputs

Generated files:

```text
Etam_Localization_Review.xlsx
dashboard.html
review_interface.html
summary.json
daily_translation_queue.csv
es_translation_queue.csv
pl_translation_queue.csv
cz_translation_queue.csv
uk_translation_queue.csv
be_nl_translation_queue.csv
ch_de_translation_queue.csv
de_translation_queue.csv
```

Official validation and PIM export happen in `review_interface.html`.

## Google Sheets Publishing

Legacy optional workflow:

```text
Lengow feeds
-> daily script
-> local snapshots
-> compact review queue
-> Google Sheet
```

The Google Sheet workflow is optional and legacy. The current official business validation interface is `review_interface.html`.

Create a Google Sheet with these tabs, or let the script create them automatically:

```text
Summary
Daily changes
Spain
Poland
Czech Republic
United Kingdom
Belgium Flemish
Switzerland DE
Germany
History
```

Then:

1. Open the Google Sheet.
2. Go to `Extensions` > `Apps Script`.
3. Copy the content of:

```text
google_apps_script/Code.gs
```

4. Deploy it as a Web App.
5. Set access according to the Etam sharing policy.
6. Copy the Web App URL.
7. Create a local `.env` file from `.env.example`:

```text
ETAM_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Run:

```bash
npm run generate -- --online --incremental --publish-sheets
```

Or use the Windows launcher:

```powershell
.\run_daily_update.ps1
```

If `ETAM_SHEETS_WEBAPP_URL` is present in `.env`, the launcher publishes to Google Sheets automatically.

The country tabs preserve reviewer columns when a row already exists:

- status
- reviewer_comment
- approved_title
- approved_long_description
- last_reviewed_at

This prevents validated local content from being overwritten silently.

## Excel / OneDrive Fallback

The Excel workbook is an old fallback artifact. Use the HTML interface for current validation and PIM export.

The daily launcher rebuilds this workbook and the HTML dashboard links to it:

```text
Etam_Localization_Review.xlsx
```

The workbook contains:

```text
Summary
Daily changes
Spain
Poland
Czech Republic
History
```

Reviewer columns are preserved when the workbook already exists:

- status
- title_validation
- description_validation
- reviewer_comment
- approved_title
- approved_long_description
- last_reviewed_at

Run:

```powershell
.\run_daily_update.ps1
```

This updates the local HTML/CSV outputs and refreshes the Excel workbook in the same OneDrive folder.

Recommended validation flow:

1. Run the daily update, or let the automation run.
2. Open `Etam_Localization_Review.xlsx`.
3. Review rows in `Spain`, `Poland`, and `Czech Republic`.
4. Use `status`, `reviewer_comment`, `approved_title`, and `approved_long_description`.
5. Keep `review_interface.html` as a read-only backup/search interface.

## PIM Import Export

The PIM import format follows the sample imports:

```text
code MC;locale;displayName fr;shortDescription fr;longDescription fr;coreGlobalModelDescription fr;productColor FR;whyWeLoveIt fr;ourStyleAdvice fr;productDetails fr;weCareDescription fr;ourProduct fr;confectionAndTransparency fr;respectAnimalWelfare fr
```

HTML validation workflow:

- Open `review_interface.html`.
- Validate visible titles, descriptions, or whole visible rows.
- Use `Export approved for PIM`.
- Browser validations are preserved locally for the run date.

Legacy Excel validation workflow:

- Set `status` to `Approved` when the full row is ready.
- Or set `title_validation` to `Approved` when only the title is ready.
- Or set `description_validation` to `Approved` when only the long description is ready.
- Use `approved_title` / `approved_long_description` if you edited the recommendation manually.
- If those approved fields are empty, the export uses `proposed_title` / `proposed_long_description`.

Generate import-ready PIM files:

```powershell
.\export_validated_pim.ps1
```

Files are written to:

```text
exports/YYYY-MM-DD/
  pim_import_es_ES_YYYYMMDD.csv
  pim_import_pl_YYYYMMDD.csv
  pim_import_cz_YYYYMMDD.csv
  pim_import_en_GB_YYYYMMDD.csv
  pim_import_nl_BE_YYYYMMDD.csv
  pim_import_de_CH_YYYYMMDD.csv
  pim_import_de_DE_YYYYMMDD.csv
  pim_import_all_validated_YYYYMMDD.csv
```

The HTML interface exports only rows approved in the browser. Approved rows persist after refresh for the same run date.

Exports include:

- run_date
- change_type
- is_new_mc
- fr_title_changed
- fr_long_description_changed
- previous_fr_title
- current_fr_title
- previous_fr_long_description
- current_fr_long_description
- previous_local_title
- current_local_title
- previous_local_long_description
- current_local_long_description

## If A Lengow URL Does Not Respond

1. Put the latest CSV files in `input/`.
2. Run:

```bash
npm run generate -- --local
```

The script will continue with the available local files and report any missing feed clearly.
