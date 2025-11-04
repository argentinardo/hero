const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');
const express = require('express');

module.exports = {
  mode: 'development',
  entry: './src/scripts/main.ts',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist', // Serve files from the dist directory
    hot: true,
    liveReload: true,
    watchFiles: ['src/**/*'],
    devMiddleware: {
      writeToDisk: true, // Force webpack to write files to disk
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Middleware to parse JSON bodies
      devServer.app.use(express.json());

      devServer.app.post('/api/save-levels', (req, res) => {
        const levelsData = req.body;
        const filePath = path.join(__dirname, 'src', 'assets', 'levels.json');
        
        fs.writeFile(filePath, JSON.stringify(levelsData, null, 4), (err) => {
          if (err) {
            console.error('Error saving levels:', err);
            return res.status(500).send('Error saving levels file.');
          }
          console.log('Levels saved successfully!');
          res.status(200).send('Levels saved successfully.');
        });
      });

      return middlewares;
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Clon de H.E.R.O. + Editor',
      template: './src/index.html'
    }),
    // Ignorar el módulo opcional @capacitor/status-bar si no está instalado
    // Esto evita warnings cuando el plugin no está presente
    new webpack.IgnorePlugin({
      resourceRegExp: /^@capacitor\/status-bar$/,
    }),
    // Copiar Service Worker a dist
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/sw.js', to: 'sw.js' },
        { from: 'manifest.json', to: 'manifest.json' }
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash][ext]',
        },
        // Optimizar imágenes
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB - imágenes pequeñas se convierten a base64
          },
        },
      },
      {
        test: /\.(mp3|wav|ogg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'audio/[name].[contenthash][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    // Ignorar módulos opcionales que pueden no estar instalados
    fallback: {
      '@capacitor/status-bar': false, // Opcional, no fallar si no está instalado
    },
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
        optimization: {
            usedExports: true,
            sideEffects: false,
            minimize: true,
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: 20,
                maxAsyncRequests: 20,
                minSize: 10000,
                maxSize: 300000,
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        filename: 'vendors.[contenthash].js',
                        priority: 10,
                        minChunks: 1,
                        enforce: true,
                    },
                    components: {
                        test: /[\\/]src[\\/]scripts[\\/]components[\\/]/,
                        name: 'components',
                        chunks: 'async',
                        filename: 'components.[contenthash].js',
                        priority: 8,
                        minChunks: 1,
                        enforce: true,
                    },
                    core: {
                        test: /[\\/]src[\\/]scripts[\\/]core[\\/]/,
                        name: 'core',
                        chunks: 'async',
                        filename: 'core.[contenthash].js',
                        priority: 7,
                        minChunks: 1,
                        enforce: true,
                    },
                    utils: {
                        test: /[\\/]src[\\/]scripts[\\/]utils[\\/]/,
                        name: 'utils',
                        chunks: 'async',
                        filename: 'utils.[contenthash].js',
                        priority: 6,
                        minChunks: 1,
                        enforce: true,
                    },
                },
            },
        },
  performance: {
    hints: false, // Desactivar warnings de tamaño
    // maxAssetSize: 1.5 * 1024 * 1024, // 1.5 MB
    // maxEntrypointSize: 1.5 * 1024 * 1024, // 1.5 MB
  },
  watchOptions: {
    poll: 1000, // Check for changes every second
    ignored: /node_modules/,
  },
};
