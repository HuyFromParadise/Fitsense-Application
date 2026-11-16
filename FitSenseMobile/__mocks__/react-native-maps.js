const React = require('react');
const { View } = require('react-native');

const MapView = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    animateToRegion: jest.fn(),
    fitToCoordinates: jest.fn(),
  }));
  return React.createElement(View, { testID: 'map-view', ...props });
});

const Marker = (props) => React.createElement(View, { testID: 'map-marker', ...props });
const Polyline = (props) => React.createElement(View, { testID: 'map-polyline', ...props });
const Callout = (props) => React.createElement(View, { testID: 'map-callout', ...props });

MapView.Marker = Marker;
MapView.Polyline = Polyline;
MapView.Callout = Callout;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.Polyline = Polyline;
module.exports.Callout = Callout;
