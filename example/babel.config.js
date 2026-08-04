module.exports = function (api) {
  api.cache(true);

  return {
    // `babel-preset-expo` already appends `react-native-reanimated/plugin` when
    // reanimated is installed, so it must not be listed again here.
    presets: ["babel-preset-expo"],
  };
};
