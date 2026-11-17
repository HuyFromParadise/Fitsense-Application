const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native-linear-gradient') {
        return {
          filePath: path.resolve(__dirname, 'src/shims/react-native-linear-gradient.js'),
          type: 'sourceFile',
        };
      }
      if (moduleName.startsWith('@/')) {
        const rel = moduleName.replace(/^@\//, '');
        const fullPath = path.resolve(__dirname, 'src', rel);
        for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
          const testPath = fullPath + ext;
          if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
            return {
              filePath: testPath,
              type: 'sourceFile',
            };
          }
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
