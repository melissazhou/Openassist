// Allow prisma build scripts
module.exports = {
  hooks: {
    readPackage(pkg) {
      return pkg;
    }
  }
};
