import { ExpoConfig, ConfigContext } from "expo/config";

const APP_NAME = "iKeen";
const APP_BUNDLE_IDENTIFIER = "com.techforgelee.ikeen";
const APP_DEV_BUNDLE_IDENTIFIER = "com.techforgelee.ikeen.dev";

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProd = process.env.APP_ENV === "production";

  return {
    // 1. Spreads all stable top-level defaults from your app.json
    ...config,

    // 2. Overrides mutable top-level properties dynamically
    name: isProd ? APP_NAME : `${APP_NAME} (DEV)`,
    slug: config.slug || "my-app", // Required fallback for Expo tracking containers

    // 3. Deep spreads iOS sub-properties to prevent wiping out app.json entries
    ios: {
      ...config.ios,
      bundleIdentifier: isProd
        ? APP_BUNDLE_IDENTIFIER
        : APP_DEV_BUNDLE_IDENTIFIER, // Dots instead of dashes
    },

    // 4. Deep spreads Android packages mirror-wise to align your cross-platform variants
    android: {
      ...config.android,
      package: isProd ? APP_BUNDLE_IDENTIFIER : APP_DEV_BUNDLE_IDENTIFIER,
      googleServicesFile: isProd
        ? "./google-services.json"
        : "./google-services-dev.json",
    },
  };
};
