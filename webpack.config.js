const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
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
      },
      {
        test: /\.(mp3|wav|ogg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 2 * 1024 * 1024, // 2 MB
    maxEntrypointSize: 2 * 1024 * 1024, // 2 MB
  },
  watchOptions: {
    poll: 1000, // Check for changes every second
    ignored: /node_modules/,
  },
};
