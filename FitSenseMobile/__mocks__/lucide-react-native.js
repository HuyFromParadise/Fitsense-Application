const React = require('react');
const { View } = require('react-native');

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === '__esModule') {
        return true;
      }
      return props =>
        React.createElement(View, {
          testID: `lucide-${String(prop)}`,
          ...props,
        });
    },
  },
);
