module.exports = {
  throwSystem: function(e) {
    if ((e instanceof Error) === false) { return; }
    if (e instanceof TypeError ||
      e instanceof SyntaxError ||
      e instanceof ReferenceError ||
      e instanceof RangeError) {
      throw e;
    }
  },
};
