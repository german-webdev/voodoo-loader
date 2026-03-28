const proxy = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === "__esModule") {
        return true;
      }
      return String(prop);
    },
  },
);

module.exports = proxy;
module.exports.default = proxy;
