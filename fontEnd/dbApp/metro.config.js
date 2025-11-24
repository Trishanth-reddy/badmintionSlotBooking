const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This tells Metro to recognize .glb files as assets
config.resolver.assetExts.push('glb');

module.exports = config;