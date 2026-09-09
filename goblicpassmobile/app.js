"use strict";

const $ = (selector) => document.querySelector(selector);
const ui = {
  app: $("#app"), lock: $("#lockScreen"), lockMessage: $("#lockMessage"), lockSupport: $("#lockSupport"),
  unlock: $("#unlockButton"), setup: $("#setupButton"), install: $("#installButton"), menuButton: $("#menuButton"),
  menu: $("#menu"), search: $("#searchInput"), list: $("#mappingList"), empty: $("#emptyState"), count: $("#resultCount"),
  entryDialog: $("#entryDialog"), entryForm: $("#entryForm"), entryTitle: $("#entryTitle"), entryId: $("#entryId"),
  entryName: $("#entryName"), entryCategory: $("#entryCategory"), entryError: $("#entryError"),
  deleteDialog: $("#deleteDialog"), deleteMessage: $("#deleteMessage"), passwordDialog: $("#passwordDialog"),
  passwordForm: $("#passwordForm"), passwordTitle: $("#passwordTitle"), passwordDescription: $("#passwordDescription"),
  password: $("#backupPassword"), passwordConfirm: $("#confirmPassword"), confirmPasswordLabel: $("#confirmPasswordLabel"),
  passwordError: $("#passwordError"), passwordButton: $("#passwordConfirm"), restoreFile: $("#restoreFile"), toast: $("#toast")
};

const STORAGE_DOCUMENT = "gpc.encrypted.mappings.v1";
const STORAGE_CREDENTIAL = "gpc.device.credential.v1";
const DB_NAME = "goblinpass-companion";
const DB_STORE = "secure-keys";
const BACKGROUND_LOCK_MS = 30_000;
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

let entries = [];
let editingId = null;
let deletingId = null;
let backupMode = null;
let pendingRestore = null;
let hiddenAt = null;
let lockTimer = null;
let installPrompt = null;
let toastTimer = null;

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open secure browser storage"));
  });
}

async function databaseGet(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DB_STORE, "readonly");
    const request = transaction.objectStore(DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read secure browser storage"));
    transaction.oncomplete = () => database.close();
  });
}

async function databasePut(key, value) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(value, key);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error || new Error("Could not update secure browser storage"));
  });
}

async function getDataKey() {
  let key = await databaseGet("mapping-key");
  if (!key) {
    key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await databasePut("mapping-key", key);
  }
  return key;
}

function validatedEntries(value) {
  if (!value || value.schema !== 1 || !Array.isArray(value.entries) || value.entries.length > 10_000) throw new Error("Invalid mapping data");
  const seen = new Set();
  return value.entries.map((entry, index) => {
    const id = String(entry.id || "").trim();
    const name = String(entry.name || "").trim();
    const category = entry.category ? String(entry.category).trim() : "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(id) || !name || name.length > 100 || category.length > 40) throw new Error(`Invalid entry at position ${index + 1}`);
    const canonicalId = id.toLocaleLowerCase("en-US");
    if (seen.has(canonicalId)) throw new Error(`Duplicate ID: ${id}`);
    seen.add(canonicalId);
    return { id, name, category, modifiedAt: Number.isFinite(entry.modifiedAt) ? entry.modifiedAt : Date.now() };
  });
}

function documentFor(list) {
  return { schema: 1, entries: list };
}

async function saveEntries() {
  const key = await getDataKey();
  const iv = randomBytes(12);
  const plaintext = encoder.encode(JSON.stringify(documentFor(entries)));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  plaintext.fill(0);
  localStorage.setItem(STORAGE_DOCUMENT, JSON.stringify({ version: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext) }));
}

async function loadEntries() {
  const stored = localStorage.getItem(STORAGE_DOCUMENT);
  if (!stored) return [];
  try {
    const envelope = JSON.parse(stored);
    if (envelope.version !== 1) throw new Error("Unsupported stored data version");
    const key = await getDataKey();
    const plaintext = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext)
    ));
    try { return validatedEntries(JSON.parse(decoder.decode(plaintext))); }
    finally { plaintext.fill(0); }
  } catch (error) {
    throw new Error("Encrypted mappings could not be opened. Browser data may be damaged.", { cause: error });
  }
}

function canonical(value) { return value.toLocaleLowerCase("en-US"); }

function render() {
  const query = canonical(ui.search.value.trim());
  const filtered = entries
    .filter((entry) => !query || [entry.id, entry.name, entry.category].some((value) => canonical(value).includes(query)))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }));
  ui.list.replaceChildren(...filtered.map(mappingRow));
  ui.empty.hidden = filtered.length !== 0;
  ui.empty.querySelector("h2").textContent = query ? "No matching IDs" : "No mappings yet";
  ui.empty.querySelector("p").textContent = query ? "Try a different ID, name, or category." : "Add your first ID and the service it represents.";
  ui.count.textContent = `${filtered.length} ${filtered.length === 1 ? "mapping" : "mappings"}`;
}

function mappingRow(entry) {
  const item = document.createElement("li");
  item.className = "mapping-item";
  const badge = document.createElement("span"); badge.className = "id-badge"; badge.textContent = entry.id;
  const copy = document.createElement("div"); copy.className = "mapping-copy";
  const name = document.createElement("strong"); name.textContent = entry.name;
  const category = document.createElement("span"); category.textContent = entry.category || "No category";
  copy.append(name, category);
  const actions = document.createElement("div"); actions.className = "row-actions";
  const edit = document.createElement("button"); edit.className = "icon-button"; edit.type = "button"; edit.textContent = "✎"; edit.setAttribute("aria-label", `Edit ${entry.id}`);
  const remove = document.createElement("button"); remove.className = "icon-button"; remove.type = "button"; remove.textContent = "⌫"; remove.setAttribute("aria-label", `Delete ${entry.id}`);
  edit.addEventListener("click", () => openEntryDialog(entry));
  remove.addEventListener("click", () => openDeleteDialog(entry));
  actions.append(edit, remove); item.append(badge, copy, actions); return item;
}

function openEntryDialog(entry = null) {
  editingId = entry?.id || null;
  ui.entryTitle.textContent = entry ? "Edit mapping" : "Add mapping";
  ui.entryId.value = entry?.id || ""; ui.entryName.value = entry?.name || ""; ui.entryCategory.value = entry?.category || "";
  ui.entryError.textContent = ""; ui.entryDialog.showModal(); ui.entryId.focus();
}

async function submitEntry(event) {
  event.preventDefault();
  const id = ui.entryId.value.trim(); const name = ui.entryName.value.trim(); const category = ui.entryCategory.value;
  if (!ui.entryForm.checkValidity()) { ui.entryForm.reportValidity(); return; }
  const duplicate = entries.find((entry) => canonical(entry.id) === canonical(id) && canonical(entry.id) !== canonical(editingId || ""));
  if (duplicate) { ui.entryError.textContent = "That ID already exists."; return; }
  const next = { id, name, category, modifiedAt: Date.now() };
  if (editingId) entries = entries.map((entry) => canonical(entry.id) === canonical(editingId) ? next : entry); else entries.push(next);
  try { await saveEntries(); ui.entryDialog.close(); render(); showToast("Mapping saved"); }
  catch (error) { ui.entryError.textContent = safeMessage(error, "Could not securely save the mapping"); }
}

function openDeleteDialog(entry) {
  deletingId = entry.id; ui.deleteMessage.textContent = `This removes ${entry.id} → ${entry.name}. It cannot be undone unless it exists in a backup.`; ui.deleteDialog.showModal();
}

async function confirmDelete(event) {
  event.preventDefault();
  const previous = entries; entries = entries.filter((entry) => canonical(entry.id) !== canonical(deletingId || ""));
  try { await saveEntries(); ui.deleteDialog.close(); render(); showToast("Mapping deleted"); }
  catch (error) { entries = previous; showToast(safeMessage(error, "Could not delete mapping")); }
}

async function supportsPlatformUnlock() {
  return Boolean(window.PublicKeyCredential && navigator.credentials &&
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));
}

function credentialId() { return localStorage.getItem(STORAGE_CREDENTIAL); }

async function prepareLockScreen() {
  ui.app.hidden = true; ui.lock.hidden = false;
  const supported = await supportsPlatformUnlock();
  const enrolled = credentialId();
  if (supported && enrolled) {
    ui.unlock.hidden = false; ui.setup.hidden = true; ui.lockMessage.textContent = "Use your device fingerprint, face, or screen lock to continue.";
    ui.lockSupport.textContent = "Your mappings remain encrypted in this browser.";
  } else if (supported) {
    ui.unlock.hidden = true; ui.setup.hidden = false; ui.lockMessage.textContent = "Set up device unlock before opening your mappings.";
    ui.lockSupport.textContent = "The browser will ask for your device biometric or screen lock.";
  } else {
    ui.unlock.hidden = false; ui.unlock.textContent = "Continue on this device"; ui.setup.hidden = true;
    ui.lockMessage.textContent = "This browser does not offer a compatible device-unlock prompt.";
    ui.lockSupport.textContent = "For biometric protection, install with a current Android browser.";
  }
}

async function setupDeviceUnlock() {
  ui.setup.disabled = true;
  try {
    const credential = await navigator.credentials.create({ publicKey: {
      challenge: randomBytes(32), rp: { name: "GoblinPass Companion" },
      user: { id: randomBytes(32), name: "local-user", displayName: "GoblinPass Companion user" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
      timeout: 60_000, attestation: "none"
    }});
    if (!credential) throw new Error("Device unlock was not created");
    localStorage.setItem(STORAGE_CREDENTIAL, bytesToBase64(new Uint8Array(credential.rawId)));
    await unlock();
  } catch (error) { ui.lockSupport.textContent = safeMessage(error, "Device unlock setup was cancelled"); }
  finally { ui.setup.disabled = false; }
}

async function unlock() {
  ui.unlock.disabled = true; ui.setup.disabled = true;
  try {
    const id = credentialId();
    if (id && await supportsPlatformUnlock()) {
      const result = await navigator.credentials.get({ publicKey: {
        challenge: randomBytes(32), allowCredentials: [{ type: "public-key", id: base64ToBytes(id) }],
        userVerification: "required", timeout: 60_000
      }});
      if (!result) throw new Error("Device unlock was cancelled");
    }
    entries = await loadEntries();
    ui.lock.hidden = true; ui.app.hidden = false; render(); ui.search.focus();
  } catch (error) { ui.lockSupport.textContent = safeMessage(error, "Could not unlock mappings"); }
  finally { ui.unlock.disabled = false; ui.setup.disabled = false; }
}

function lockNow() {
  entries = []; ui.list.replaceChildren(); ui.search.value = ""; closeMenu();
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
  prepareLockScreen();
}

async function deriveBackupKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function openPasswordDialog(mode, restoreEnvelope = null) {
  backupMode = mode; pendingRestore = restoreEnvelope; ui.password.value = ""; ui.passwordConfirm.value = ""; ui.passwordError.textContent = "";
  const exporting = mode === "export";
  ui.passwordTitle.textContent = exporting ? "Create encrypted backup" : "Restore encrypted backup";
  ui.passwordDescription.textContent = exporting ? "Choose a unique password of at least 12 characters. It cannot be recovered." : "Enter the backup password. Restoring replaces all current mappings on this device.";
  ui.confirmPasswordLabel.hidden = !exporting; ui.passwordButton.textContent = exporting ? "Download backup" : "Replace & restore";
  ui.passwordDialog.showModal(); ui.password.focus();
}

async function submitPassword(event) {
  event.preventDefault();
  const password = ui.password.value;
  if (password.length < 12) { ui.passwordError.textContent = "Use at least 12 characters."; return; }
  if (backupMode === "export" && password !== ui.passwordConfirm.value) { ui.passwordError.textContent = "Passwords do not match."; return; }
  ui.passwordButton.disabled = true;
  try {
    if (backupMode === "export") await exportBackup(password); else await restoreBackup(password);
    ui.passwordDialog.close(); ui.password.value = ""; ui.passwordConfirm.value = "";
  } catch (error) { ui.passwordError.textContent = safeMessage(error, "Backup operation failed"); }
  finally { ui.passwordButton.disabled = false; }
}

async function exportBackup(password) {
  const salt = randomBytes(16); const iv = randomBytes(12); const key = await deriveBackupKey(password, salt);
  const plaintext = encoder.encode(JSON.stringify(documentFor(entries)));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode("GPCBACKUP:1") }, key, plaintext));
  plaintext.fill(0);
  const envelope = { magic: "GPCBACKUP", version: 1, kdf: "PBKDF2-SHA256", iterations: 310000, cipher: "AES-256-GCM", salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: bytesToBase64(ciphertext) };
  const blob = new Blob([JSON.stringify(envelope)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "goblinpass-backup.gpc";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000); showToast("Encrypted backup downloaded");
}

async function chooseRestoreFile(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) { showToast("Backup file is too large"); return; }
  try {
    const envelope = JSON.parse(await file.text());
    if (envelope.magic !== "GPCBACKUP" || envelope.version !== 1 || envelope.iterations !== 310000) throw new Error("This is not a supported GoblinPass backup");
    openPasswordDialog("restore", envelope);
  } catch (error) { showToast(safeMessage(error, "Could not read backup")); }
}

async function restoreBackup(password) {
  if (!pendingRestore) throw new Error("No backup selected");
  try {
    const key = await deriveBackupKey(password, base64ToBytes(pendingRestore.salt));
    const plaintext = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(pendingRestore.iv), additionalData: encoder.encode("GPCBACKUP:1") }, key, base64ToBytes(pendingRestore.data)
    ));
    const restored = validatedEntries(JSON.parse(decoder.decode(plaintext))); plaintext.fill(0);
    const previous = entries; entries = restored;
    try { await saveEntries(); } catch (error) { entries = previous; throw error; }
    pendingRestore = null; render(); showToast("Backup restored");
  } catch (error) { throw new Error("Incorrect password or damaged backup", { cause: error }); }
}

function showToast(message) {
  clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.hidden = false;
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 3600);
}

function safeMessage(error, fallback) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  return message.slice(0, 180);
}

function closeMenu() { ui.menu.hidden = true; ui.menuButton.setAttribute("aria-expanded", "false"); }

ui.menuButton.addEventListener("click", () => { ui.menu.hidden = !ui.menu.hidden; ui.menuButton.setAttribute("aria-expanded", String(!ui.menu.hidden)); });
document.addEventListener("click", (event) => { if (!ui.menu.hidden && !event.target.closest(".header-actions")) closeMenu(); });
$("#addButton").addEventListener("click", () => openEntryDialog());
ui.search.addEventListener("input", render);
ui.entryForm.addEventListener("submit", submitEntry);
$("#confirmDelete").addEventListener("click", confirmDelete);
ui.passwordForm.addEventListener("submit", submitPassword);
$("#backupButton").addEventListener("click", () => { closeMenu(); openPasswordDialog("export"); });
$("#restoreButton").addEventListener("click", () => { closeMenu(); ui.restoreFile.click(); });
ui.restoreFile.addEventListener("change", chooseRestoreFile);
$("#lockButton").addEventListener("click", lockNow);
$("#aboutButton").addEventListener("click", () => { closeMenu(); $("#aboutDialog").showModal(); });
ui.unlock.addEventListener("click", unlock); ui.setup.addEventListener("click", setupDeviceUnlock);
document.querySelectorAll("dialog [value=cancel]").forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); button.closest("dialog").close(); }));

window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; ui.install.hidden = false; });
ui.install.addEventListener("click", async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; ui.install.hidden = true; });
window.addEventListener("appinstalled", () => { installPrompt = null; ui.install.hidden = true; showToast("GoblinPass Companion installed"); });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hiddenAt = performance.now(); clearTimeout(lockTimer); lockTimer = setTimeout(lockNow, BACKGROUND_LOCK_MS);
  } else {
    clearTimeout(lockTimer);
    if (hiddenAt !== null && performance.now() - hiddenAt >= BACKGROUND_LOCK_MS) lockNow();
    hiddenAt = null;
  }
});

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => showToast("Offline setup could not be completed")));
prepareLockScreen();
