module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // zod v4 dùng `export * as ns from`, preset RN chưa transform (Metro báo lỗi).
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
