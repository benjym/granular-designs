const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [{
    mode: "development",
    // mode: "production",
    entry: {
        'ring': './src/ring.js',
        'slice': './src/slice.js',
    },
    plugins: [
        new webpack.ProvidePlugin({
            THREE: 'three'
        }),
        new HtmlWebpackPlugin({
            title: "NDDEM Ring maker",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "ring.html",
            chunks: ['ring']
        }),
        new HtmlWebpackPlugin({
            title: "NDDEM CT Slicer",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "slice.html",
            chunks: ['slice']
        }),
    ],
    output: {
        path: path.resolve(__dirname, 'deploy'),
        filename: '[name]-bundle.js',
        clean: true,
    },
    devServer: {
        hot: true,
        static: {
            directory: 'deploy'
        },
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(ico|webmanifest|stl|nrrd|png)$/,
                exclude: /node_modules/,
                use: ["file-loader?name=[name].[ext]"] // ?name=[name].[ext] is only necessary to preserve the original file name
            },
        ],
    },
    resolve: {
        fallback: {
            "fs": false,
            "crypto": false
        },
    }
}
];
