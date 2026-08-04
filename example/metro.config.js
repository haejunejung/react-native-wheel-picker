/* eslint-env node */
const path = require("path");

const { getDefaultConfig } = require("expo/metro-config");

const pkg = require("../package.json");

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// The library lives outside the example app, so Metro has to watch it for changes.
config.watchFolders = [libraryRoot];

// Only ever resolve packages from the example app, never from the library root.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

// `nodeModulesPaths` alone is not enough: Metro still walks up from the importing file,
// so library source importing `react` finds the library root's node_modules first —
// a second React copy, which crashes every hook ("Invalid hook call"). Disabling the
// hierarchical walk forces everything through the example's node_modules above.
config.resolver.disableHierarchicalLookup = true;

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // The library is symlinked (`link:..`), so its peer dependencies must be pinned to the
  // single copy installed here — otherwise React/Reanimated get duplicated at runtime.
  ...Object.fromEntries(
    Object.keys(pkg.peerDependencies ?? {}).map((name) => [
      name,
      path.resolve(projectRoot, "node_modules", name),
    ]),
  ),
  [pkg.name]: libraryRoot,
};

const baseResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Consume the library's TypeScript source instead of the `lib/` build output,
  // so editing `src/` hot-reloads without running `yarn build` first.
  const resolveContext = moduleName.startsWith(pkg.name)
    ? {
        ...context,
        mainFields: ["source", ...context.mainFields],
        unstable_conditionNames: ["source", ...context.unstable_conditionNames],
      }
    : context;

  const resolve = baseResolveRequest ?? resolveContext.resolveRequest;

  return resolve(resolveContext, moduleName, platform);
};

module.exports = config;
