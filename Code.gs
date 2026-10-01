/**
 * Configuration Constants
 */
const SHEET_NAME = "OnlineSoundTracks";
const DEFAULT_HEADERS = ["startTime", "endTime", "title", "category", "language", "url"];

const DEFAULT_STATIONS = [
  // 1. Specified Core Stations
  ["05:00", "05:20", "Fun Kids UK (Live Radio)", "Kids", "English", "https://radio.canstream.co.uk:8021/live.mp3"],
  ["05:20", "05:40", "Radio Mirchi Top 20", "Entertainment", "Hindi", "https://stream.zeno.fm/0r0xa792kwzuv"],
  ["05:40", "06:00", "BBC World Service", "News", "English", "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service"],
  ["06:00", "06:20", "NPR News 24 Hour", "News", "English", "https://npr-ice.streamguys1.com/live.mp3"],
  ["06:20", "06:40", "LBC News London", "News", "English", "https://media-ice.musicradio.com/LBCNewsUKMP3"],
  ["06:40", "07:00", "France 24 English Radio", "News", "English", "https://stream.radiofrance.fr/fip/fip.m3u8"],
  ["07:00", "07:20", "Times Radio UK", "News", "English", "https://timesradio.wireless.radio/stream"],
  ["07:20", "07:40", "WNYC AM (Podcasts & Debate)", "Learning", "English", "https://fm939.wnyc.org/wnycfm-web"],
  ["07:40", "08:00", "KQED Public Talks (San Francisco)", "Learning", "English", "https://streams.kqed.org/kqedradio.mp3"],
  ["08:00", "08:20", "KEXP Discovery & Education", "Learning", "English", "https://kexp.streamguys1.com/kexp160.aac"],
  ["08:20", "08:40", "WBEZ Chicago Public Radio", "Learning", "English", "https://stream.wbez.org/wbez128.mp3"],
  ["08:40", "09:00", "Capital FM UK (Global Hits)", "Entertainment", "English", "https://media-ice.musicradio.com/CapitalMP3"],
  ["09:00", "09:20", "Heart UK (80s & 90s Hits)", "Entertainment", "English", "https://media-ice.musicradio.com/HeartUKMP3"],
  ["09:20", "09:40", "Smooth Radio UK (Relaxing Favorites)", "Entertainment", "English", "https://media-ice.musicradio.com/SmoothUKMP3"],
  ["09:40", "10:00", "Classic FM London", "Entertainment", "English", "https://media-ice.musicradio.com/ClassicFMMP3"],
  ["10:00", "10:20", "Radio X UK (Indie Rock)", "Entertainment", "English", "https://media-ice.musicradio.com/RadioXUKMP3"],
  ["10:20", "10:40", "Gold Radio UK (Classic Oldies)", "Entertainment", "English", "https://media-ice.musicradio.com/GoldMP3"],
  ["10:40", "11:00", "Swiss Classic Radio", "Entertainment", "Classical", "https://stream.srg-ssr.ch/m/rsc_de/mp3_128"],
  ["11:00", "11:20", "WQXR Classical New York", "Entertainment", "English", "https://stream.wqxr.org/wqxr-web"],
  ["12:20", "12:40", "RTHK Radio 3 English (Hong Kong)", "News", "English", "https://stm.rthk.hk/radio3"],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Radio Scheduler")
    .addItem("Reset to Defaults", "forceResetSheet")
    .addToUi();
}

function forceResetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  
  sheet.clear();
  const headerRange = sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length);
  headerRange.setValues([DEFAULT_HEADERS]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#f8fafc");
  headerRange.setHorizontalAlignment("center");

  sheet.getRange(2, 1, DEFAULT_STATIONS.length, DEFAULT_HEADERS.length).setValues(DEFAULT_STATIONS);
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 2).setNumberFormat("@");
  sheet.autoResizeColumns(1, DEFAULT_HEADERS.length);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    forceResetSheet();
  }
  return sheet;
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const rows = sheet.getDataRange().getValues();

    if (rows.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ channels: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = rows[0].map(h => h.toString().trim());
    const data = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;

      let item = {};
      headers.forEach((header, colIndex) => {
        let val = row[colIndex];
        if (val instanceof Date) {
          const hours = String(val.getHours()).padStart(2, "0");
          const minutes = String(val.getMinutes()).padStart(2, "0");
          val = `${hours}:${minutes}`;
        }
        item[header] = val;
      });
      data.push(item);
    }

    return ContentService.createTextOutput(JSON.stringify({ channels: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    let payload = e.postData ? e.postData.contents : null;
    if (!payload) throw new Error("No data payload received");

    const body = JSON.parse(payload);
    const newSchedule = body.channels;

    if (!Array.isArray(newSchedule)) {
      throw new Error("Invalid payload format. Expected channels array.");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, DEFAULT_HEADERS.length).clearContent();
    }

    const rowsToInsert = newSchedule.map(item => [
      String(item.startTime || "").trim(),
      String(item.endTime || "").trim(),
      String(item.title || "").trim(),
      String(item.category || "General").trim(),
      String(item.language || "English").trim(),
      String(item.url || "").trim()
    ]);

    if (rowsToInsert.length > 0) {
      sheet.getRange(2, 1, rowsToInsert.length, DEFAULT_HEADERS.length).setValues(rowsToInsert);
      sheet.getRange(2, 1, rowsToInsert.length, 2).setNumberFormat("@");
    }

    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rowsToInsert.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}