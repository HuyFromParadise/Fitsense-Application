const React = require('react');
const { View } = require('react-native');

const BarChart = (props) => React.createElement(View, { testID: 'bar-chart', ...props });
const LineChart = (props) => React.createElement(View, { testID: 'line-chart', ...props });
const PieChart = (props) => React.createElement(View, { testID: 'pie-chart', ...props });

module.exports = {
  BarChart,
  LineChart,
  PieChart,
};
