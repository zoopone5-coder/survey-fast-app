# Fast Survey App

Minimal survey app using Express + vanilla JS + Google Sheets + Google Drive.

## Setup

1. Run `npm install`
2. Run `npm run setup`
3. Create a Google Cloud project, enable **Google Drive API** and **Google Sheets API**
4. Create a **Service Account**, download the JSON key, and set `GOOGLE_APPLICATION_CREDENTIALS`
5. Create a Google Sheet with columns:
   `Timestamp, Site Name, Village, Taluka, Site HoD Name, Phone, Email, Office Name, Pincode, Latitude, Longitude, Photo URL, Answers JSON`
6. Share the Sheet and the Drive root folder with the service account email as **Editor**
7. Put the Drive root folder id and Sheet id in `.env`
8. Run `npm start`

## Notes

- Site Name is mandatory and used to find/create the Drive folder.
- GPS can be denied; submission still works with empty latitude/longitude.
- If photo upload fails, the row is still written with an empty photo URL.
- Extra answers are accepted as JSON text.

## Test

Run `npm test`

## Deploy To Render

1. Put this project in a GitHub repo
2. Add `service-account.json` to the repo only if you accept storing that key there
3. Better option: set `GOOGLE_SERVICE_ACCOUNT_JSON` in Render instead of using a file
4. In Render, create a new Blueprint service from your repo
5. Render will read [render.yaml](./render.yaml)
6. Fill secrets:
   `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SHEET_ID`, and optionally `GOOGLE_SERVICE_ACCOUNT_JSON`
7. If you use `GOOGLE_SERVICE_ACCOUNT_JSON`, remove `GOOGLE_APPLICATION_CREDENTIALS` from the Render env
8. After deploy, open `/health` to confirm the app is live
