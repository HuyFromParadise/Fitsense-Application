/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundFcmHandler } from './src/features/notifications';

registerBackgroundFcmHandler();

AppRegistry.registerComponent(appName, () => App);
