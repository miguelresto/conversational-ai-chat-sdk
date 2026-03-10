// eslint-disable-next-line no-undef
process.env.npm_package_version = '0.0.0-test';

// Polyfill Promise.withResolvers for Node.js < 22.
if (typeof Promise.withResolvers === 'undefined') {
  // eslint-disable-next-line no-undef
  Promise.withResolvers = function withResolvers() {
    let resolve, reject;
    // eslint-disable-next-line no-undef
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
