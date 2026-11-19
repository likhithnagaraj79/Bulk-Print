/**
 * Bulk Badge Print — "Issue Pass" endpoint.
 *
 * Setup (once): open the badge Google Sheet → Extensions → Apps Script, paste this file,
 * save, then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Copy the /exec URL into PASS_SCRIPT_URL in src/app/utils/badgeSheet.ts.
 *
 * Each issue appends one row to the "Pass Issued" tab (created if missing).
 */
var TAB = "Pass Issued";
var HEADERS = ["Timestamp", "Company Name", "Issued To", "Designation", "Phone"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var company = String(body.company || "").trim();
    var name = String(body.name || "").trim();
    var designation = String(body.designation || "").trim();
    var phone = String(body.phone || "").trim();

    if (!company) return reply({ ok: false, error: "Company name is missing" });
    if (!name) return reply({ ok: false, error: "Person name is missing" });
    if (!/^\d{10}$/.test(phone)) return reply({ ok: false, error: "Phone must be exactly 10 digits" });

    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TAB);
    if (!sheet) {
      sheet = ss.insertSheet(TAB);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    var at = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd-MM-yyyy HH:mm");
    // Leading apostrophe stores every value as plain text (keeps the phone as typed and
    // stops names starting with "=" from being treated as formulas).
    sheet.appendRow([at, company, name, designation, phone].map(function (v) { return "'" + v; }));
    return reply({ ok: true, at: at });
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
