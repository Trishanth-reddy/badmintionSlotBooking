// index.js - FIXED VERSION FOR REACT 19 + EXPO

// ========================================
// POLYFILLS - MUST BE FIRST!
// ========================================
import { decode, encode } from 'base-64';

// Buffer polyfill for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Base64 polyfills
if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}

// ========================================
// IMPORTS
// ========================================
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
