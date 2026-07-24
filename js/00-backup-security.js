/* Memento local backup safety.
   Backs up IndexedDB photos alongside state, validates imported JSON before it
   reaches the app, and bounds file/media sizes so a malformed file cannot
   freeze a phone. */
(function () {
  'use strict';

  var DB_NAME = 'memento_media';
  var STORE_NAME = 'images';
  var MAX_FILE_BYTES = 85 * 1024 * 1024;
  var MAX_MEDIA_CHARS = 80 * 1024 * 1024;
  var MAX_IMAGE_CHARS = 2 * 1024 * 1024;
  var MAX_IMAGES = 1000;
  var MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
  var SAFE_IMAGE_FILE = /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i;
  var SAFE_IMAGE_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  var SAFE_IMAGE_ID = /^img_[A-Za-z0-9_]+$/;
  var FORBIDDEN_KEYS = { '__proto__': 1, 'prototype': 1, 'constructor': 1 };

  function validateTree(value) {
    var nodes = 0;
    function walk(item, depth) {
      nodes++;
      if (nodes > 250000 || depth > 40) throw new Error('backup_too_complex');
      if (!item || typeof item !== 'object') return;
      if (Array.isArray(item)) {
        for (var i = 0; i < item.length; i++) walk(item[i], depth + 1);
        return;
      }
      Object.keys(item).forEach(function (key) {
        if (FORBIDDEN_KEYS[key]) throw new Error('unsafe_backup_key');
        walk(item[key], depth + 1);
      });
    }
    walk(value, 0);
    return true;
  }

  function validateMedia(value) {
    if (value == null) return [];
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_media');
    var images = Array.isArray(value.images) ? value.images : [];
    if (images.length > MAX_IMAGES) throw new Error('too_many_images');
    var total = 0;
    return images.map(function (record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('invalid_image');
      var id = String(record.id || '');
      var dataURL = String(record.dataURL || '');
      var w = Math.floor(Number(record.w) || 0);
      var h = Math.floor(Number(record.h) || 0);
      if (!SAFE_IMAGE_ID.test(id)) throw new Error('invalid_image_id');
      if (dataURL.length < 32 || dataURL.length > MAX_IMAGE_CHARS || !SAFE_IMAGE_DATA.test(dataURL)) {
        throw new Error('invalid_image_data');
      }
      if (w < 0 || h < 0 || w > 8192 || h > 8192) throw new Error('invalid_image_size');
      total += dataURL.length;
      if (total > MAX_MEDIA_CHARS) throw new Error('media_too_large');
      return { id: id, dataURL: dataURL, w: w, h: h };
    });
  }

  function openMediaDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var request;
      try { request = indexedDB.open(DB_NAME, 1); }
      catch (e) { resolve(null); return; }
      request.onupgradeneeded = function () {
        try {
          var db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            var store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('byCreatedAt', 'createdAt', { unique: false });
          }
        } catch (e) {}
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
      request.onblocked = function () { resolve(null); };
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('media_read_failed')); };
      reader.readAsDataURL(blob);
    });
  }

  async function exportMedia() {
    var db = await openMediaDb();
    if (!db) return [];
    var rows = await new Promise(function (resolve, reject) {
      try {
        var request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        request.onsuccess = function () { resolve(Array.prototype.slice.call(request.result || [])); };
        request.onerror = function () { reject(new Error('media_read_failed')); };
      } catch (e) { reject(e); }
    });
    if (rows.length > MAX_IMAGES) throw new Error('too_many_images');

    var output = [];
    var total = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || !row.blob || !SAFE_IMAGE_ID.test(String(row.id || ''))) continue;
      if (row.blob.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error('image_too_large');
      var dataURL = await blobToDataURL(row.blob);
      total += dataURL.length;
      if (dataURL.length > MAX_IMAGE_CHARS || total > MAX_MEDIA_CHARS) throw new Error('media_too_large');
      output.push({ id: row.id, dataURL: dataURL, w: row.w || 0, h: row.h || 0 });
    }
    return validateMedia({ images: output });
  }

  async function restoreMedia(records) {
    if (!records.length) return true;
    var db = await openMediaDb();
    if (!db) return false;
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var blob = null;
      try {
        var parts = record.dataURL.split(',');
        var binary = atob(parts[1] || '');
        var bytes = new Uint8Array(binary.length);
        for (var j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        var mime = (parts[0].match(/^data:([^;]+);base64$/) || [null, 'image/jpeg'])[1];
        blob = new Blob([bytes], { type: mime });
      } catch (e) {
        return false;
      }
      var saved = await new Promise(function (resolve) {
        try {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put({
            id: record.id,
            blob: blob,
            w: record.w,
            h: record.h,
            type: blob.type,
            createdAt: Date.now(),
          });
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
          tx.onabort = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
      if (!saved) return false;
    }
    return true;
  }

  async function download(stateValue, schemaVersion) {
    try {
      if (!stateValue || typeof stateValue !== 'object') return false;
      validateTree(stateValue);
      var images = await exportMedia();
      var payload = {
        backupFormat: 2,
        schemaVersion: schemaVersion,
        exportedAt: new Date().toISOString(),
        state: stateValue,
        media: { images: images },
      };
      var text = JSON.stringify(payload, null, 2);
      if (new Blob([text]).size > MAX_FILE_BYTES) return false;
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'memento-backup-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function readFile(file) {
    if (!file || Number(file.size) > MAX_FILE_BYTES) throw new Error('backup_file_too_large');
    var text = await file.text();
    var parsed = JSON.parse(text);
    validateTree(parsed);
    var incoming = parsed && parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('invalid_state');
    var records = validateMedia(parsed && parsed.state ? parsed.media : null);
    return { state: incoming, media: records };
  }

  async function restore(file, restoreState) {
    try {
      var backup = await readFile(file);
      if (!(await restoreMedia(backup.media))) return false;
      return await new Promise(function (resolve) {
        restoreState(backup.state, function (ok) { resolve(!!ok); });
      });
    } catch (e) {
      return false;
    }
  }

  function acceptImageFile(file) {
    return !!file
      && Number(file.size) > 0
      && Number(file.size) <= MAX_IMAGE_UPLOAD_BYTES
      && SAFE_IMAGE_FILE.test(String(file.type || ''));
  }

  window.MementoBackup = {
    export: download,
    import: restore,
    acceptImageFile: acceptImageFile,
    maxFileBytes: MAX_FILE_BYTES,
    _test: {
      validateTree: validateTree,
      validateMedia: validateMedia,
    },
  };
})();

