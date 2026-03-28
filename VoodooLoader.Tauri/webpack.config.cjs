const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const isAnalyzeMode = process.env.BUNDLE_ANALYZE === "1";

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: "./src/main.tsx",
  output: {
    filename: "assets/[name].[contenthash].js",
    chunkFilename: "assets/[name].[contenthash].chunk.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    publicPath: "/",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.module\.css$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                auto: true,
                namedExport: false,
                exportLocalsConvention: "as-is",
              },
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        exclude: /\.module\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
    new CompressionPlugin({
      algorithm: "gzip",
      test: /\.(js|css|html|svg)$/i,
      threshold: 10 * 1024,
      minRatio: 0.8,
      deleteOriginalAssets: false,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: isAnalyzeMode ? "static" : "disabled",
      openAnalyzer: false,
      reportFilename: path.resolve(__dirname, "dist", "bundle-report.html"),
      generateStatsFile: true,
      statsFilename: path.resolve(__dirname, "dist", "bundle-stats.json"),
    }),
  ],
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      minSize: 20 * 1024,
      maxSize: 240 * 1024,
      cacheGroups: {
        reactVendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: "react-vendor",
          priority: 40,
          reuseExistingChunk: true,
        },
        tauriVendor: {
          test: /[\\/]node_modules[\\/]@tauri-apps[\\/]/,
          name: "tauri-vendor",
          priority: 30,
          reuseExistingChunk: true,
        },
        muiVendor: {
          test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
          name: "mui-vendor",
          priority: 20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  performance: {
    hints: false,
  },
  devServer: {
    port: 1420,
    static: {
      directory: path.resolve(__dirname, "public"),
    },
    historyApiFallback: true,
    hot: true,
    host: "0.0.0.0",
    client: {
      overlay: true,
    },
  },
  stats: "errors-warnings",
};
