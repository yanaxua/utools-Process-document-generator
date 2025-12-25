window.utoolsDb = {
  get: (key) => utools.db.get(key),
  put: (doc) => utools.db.put(doc),
  remove: (key) => utools.db.remove(key),
  allDocs: (key) => utools.db.allDocs(key),
};

window.utoolsUtils = {
  copyText: (text) => utools.copyText(text),
  showNotification: (text) => utools.showNotification(text),
  showOpenDialog: (options) => utools.showOpenDialog(options),
  showSaveDialog: (options) => utools.showSaveDialog(options),
};
