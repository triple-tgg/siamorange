// Session/state persistence helper utilities
window.AppPersistence = {
  save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  load(key) {
    const val = localStorage.getItem(key);
    try {
      return val ? JSON.parse(val) : null;
    } catch (e) {
      return val;
    }
  }
};
