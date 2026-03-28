import type { StorybookConfig } from "@storybook/react-webpack5";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  typescript: {
    reactDocgen: false,
  },
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (webpackConfig) => {
    if (!webpackConfig.module) {
      webpackConfig.module = { rules: [] };
    }
    if (!webpackConfig.module.rules) {
      webpackConfig.module.rules = [];
    }

    webpackConfig.module.rules.push({
      test: /\.tsx?$/,
      use: {
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
      exclude: /node_modules/,
    });

    if (!webpackConfig.resolve) {
      webpackConfig.resolve = { extensions: [] };
    }
    webpackConfig.resolve.extensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ...(webpackConfig.resolve.extensions ?? []),
    ];

    return webpackConfig;
  },
};

export default config;
