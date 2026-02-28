// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 29,
    select: jest.fn((obj) => obj.android),
  },
  NativeModules: {},
  NativeEventEmitter: jest.fn(),
}));

// Mock react-native-sqlite-storage
jest.mock('react-native-sqlite-storage', () => {
  const mockDB = {
    transaction: jest.fn(),
    executeSql: jest.fn(),
    close: jest.fn(),
  };
  
  return {
    default: {
      enablePromise: jest.fn(),
      openDatabase: jest.fn(() => Promise.resolve(mockDB)),
    },
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() => Promise.resolve(mockDB)),
  };
});

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getCameraDevice: jest.fn(),
    requestCameraPermission: jest.fn(() => Promise.resolve('granted')),
  },
}));

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  unlink: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
