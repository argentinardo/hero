const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const express = require('express');

module.exports = {
  mode: 'development',
  entry: './src/scripts/index.ts',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    hot: true, // Habilita Hot Module Replacement
    watchFiles: ['src/**/*'], // Observa cambios en todos los archivos de src
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
};
