module.exports = {
  // The version of the library.
  version: '0.1',
  // Same version, but as an array of three numbers. First number is the major
  // version, second is the minor version, third is the patch version. Most
  // releases will bump the minor version.
  versionSlice: [0, 1, 0],

  // Available packages. Not all Go types/functions will be available for all
  // packages in this list.
  packages: [
    'bytes',
    'strings',
    'sync',
    'time',
    'unicode',
    'unicode/utf8',
  ],
};
