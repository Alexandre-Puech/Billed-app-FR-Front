export const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] !== undefined ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = value;
    },
    clear: function () {
      store = {};
    },
    removeItem: function (key) {
      delete store[key];
    },
  };
})();
