/**
 * Visitas Passline — backend (Google Apps Script)
 *
 * Deploy as a Web App (Execute as: Me / Access: Anyone) so the form works
 * on mobile with no login. See README.md for step-by-step deployment.
 */

var SHEET_ID = '1fVgcUlEH3tcXEDmFnFyKYoH_HAdoeaeceZ6UHRvTmHI';
var VISITAS_SHEET = 'Visitas';
var DASHBOARD_SHEET = 'Dashboard';
var PHOTOS_FOLDER_NAME = 'Passline - Fotos de Visitas';
var TIMEZONE = 'America/Argentina/Buenos_Aires';

var COMERCIALES = ['Joaquin Wagner', 'José Prat Gay', 'Stefano Cagnoni', 'Sol Moya', 'Bautista Peña'];
var ESTADOS = ['Cliente activo', 'Prospecto'];

var VISITAS_HEADERS = [
  'Marca temporal', 'Comercial', 'Fecha y hora visita', 'Cliente visitado',
  'Contacto (nombre y cargo)', 'Estado de la cuenta', 'Temas charlados',
  'Próximos pasos', 'Foto', 'Semana'
];

function doGet() {
  ensureVisitasHeaders_();
  var tpl = HtmlService.createTemplateFromFile('Index');
  tpl.comerciales = COMERCIALES;
  tpl.estados = ESTADOS;
  return tpl.evaluate()
    .setTitle('Visitas Passline')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Passline')
    .addItem('Inicializar / reparar hoja', 'ensureSheets_')
    .addToUi();
}

/**
 * Called from the client via google.script.run. Validates, stores the photo
 * in Drive, appends a row to "Visitas" and returns a confirmation.
 */
function submitVisita(data) {
  var visitas = ensureVisitasHeaders_();

  var required = ['comercial', 'fechaHora', 'cliente', 'contacto', 'estado', 'temas', 'proximosPasos'];
  for (var i = 0; i < required.length; i++) {
    if (!data || !String(data[required[i]] || '').trim()) {
      throw new Error('Falta completar un campo obligatorio.');
    }
  }
  if (!data.photoBase64 || !data.photoMimeType) {
    throw new Error('La foto es obligatoria.');
  }
  if (COMERCIALES.indexOf(data.comercial) === -1) {
    throw new Error('Comercial inválido.');
  }
  if (ESTADOS.indexOf(data.estado) === -1) {
    throw new Error('Estado de cuenta inválido.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var photoUrl = savePhoto_(data.photoBase64, data.photoMimeType, data.comercial, data.cliente);

    var visitaDate = new Date(data.fechaHora);
    var now = new Date();
    var semana = Utilities.formatDate(visitaDate, TIMEZONE, "yyyy-'S'ww");

    visitas.appendRow([
      now,
      data.comercial,
      visitaDate,
      data.cliente,
      data.contacto,
      data.estado,
      data.temas,
      data.proximosPasos,
      photoUrl,
      semana
    ]);

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function savePhoto_(base64, mimeType, comercial, cliente) {
  var folder = getOrCreateFolder_(PHOTOS_FOLDER_NAME);
  var bytes = Utilities.base64Decode(base64);
  var ext = mimeType.indexOf('png') !== -1 ? 'png' : 'jpg';
  var safeName = (comercial + '_' + cliente).replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 60);
  var filename = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss') + '_' + safeName + '.' + ext;
  var blob = Utilities.newBlob(bytes, mimeType, filename);
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Sharing restricted by domain policy — file stays private to the owner, still usable from the sheet.
  }
  return file.getUrl();
}

function getOrCreateFolder_(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

/**
 * Cheap, safe-to-call-on-every-request check: makes sure the "Visitas"
 * sheet and its header row exist. Does NOT touch the Dashboard tab, so a
 * page load or a form submit never rebuilds/reorders sheets.
 */
function ensureVisitasHeaders_() {
  var ss = getSpreadsheet_();
  var visitas = ss.getSheetByName(VISITAS_SHEET);
  if (!visitas) visitas = ss.insertSheet(VISITAS_SHEET);
  if (visitas.getRange('A1').getValue() !== VISITAS_HEADERS[0]) {
    visitas.getRange(1, 1, 1, VISITAS_HEADERS.length)
      .setValues([VISITAS_HEADERS])
      .setFontWeight('bold').setBackground('#0d0d0d').setFontColor('#F5A800');
    visitas.setFrozenRows(1);
  }
  return visitas;
}

/**
 * Full, idempotent setup: run manually (menu "Passline > Inicializar /
 * reparar hoja") whenever you want to (re)build validation dropdowns,
 * formatting and the Dashboard pivot formulas. Not called automatically on
 * every submit, so it never clobbers the Dashboard while people are using
 * the form.
 */
function ensureSheets_() {
  var ss = getSpreadsheet_();
  try { ss.setSpreadsheetTimeZone(TIMEZONE); } catch (e) {}

  var visitas = ensureVisitasHeaders_();
  var headerRange = visitas.getRange(1, 1, 1, VISITAS_HEADERS.length);
  headerRange.setFontWeight('bold').setBackground('#0d0d0d').setFontColor('#F5A800');
  visitas.setFrozenRows(1);
  if (visitas.getMaxColumns() >= 10) {
    visitas.getRange(2, 2, Math.max(visitas.getMaxRows() - 1, 1), 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(COMERCIALES, true).setAllowInvalid(true).build());
    visitas.getRange(2, 6, Math.max(visitas.getMaxRows() - 1, 1), 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(true).build());
  }
  try { visitas.autoResizeColumns(1, VISITAS_HEADERS.length); } catch (e) {}

  var dashboard = ss.getSheetByName(DASHBOARD_SHEET);
  if (!dashboard) dashboard = ss.insertSheet(DASHBOARD_SHEET);
  buildDashboard_(dashboard);

  // Order tabs: Visitas, Dashboard.
  ss.setActiveSheet(visitas);
  ss.moveActiveSheet(1);
  ss.setActiveSheet(dashboard);
  ss.moveActiveSheet(2);
}

function buildDashboard_(dashboard) {
  dashboard.clear();
  dashboard.getRange('A1').setValue('Visitas por comercial y semana')
    .setFontWeight('bold').setFontSize(13).setFontColor('#F5A800');
  dashboard.getRange('A2').setFormula(
    '=IFERROR(QUERY(Visitas!B2:J,"select B, count(B) where B is not null group by B pivot J label B \'Comercial\', count(B) \'Visitas\'",0),"Aún no hay datos")'
  );

  dashboard.getRange('A20').setValue('Estado de cuenta por semana')
    .setFontWeight('bold').setFontSize(13).setFontColor('#F5A800');
  dashboard.getRange('A21').setFormula(
    '=IFERROR(QUERY(Visitas!F2:J,"select F, count(F) where F is not null group by F pivot J label F \'Estado\', count(F) \'Cantidad\'",0),"Aún no hay datos")'
  );

  dashboard.getRange('A1:A21').setFontFamily('Arial');
  dashboard.setColumnWidth(1, 200);
  dashboard.setFrozenRows(0);
}
