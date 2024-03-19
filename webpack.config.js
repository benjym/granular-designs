const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [{
    mode: "development",
    // mode: "production",
    entry: {
        'segregation_ring': './src/segregation_ring.js',
        'roughness_ring': './src/roughness_ring.js',
        'slice': './src/slice.js',
        'apollonian': './src/apollonian.js',
        'morse-code': './src/morse-code.js',
    },
    plugins: [
        new webpack.ProvidePlugin({
            THREE: 'three'
        }),
        new HtmlWebpackPlugin({
            title: "Ring maker",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "segregation_ring.html",
            chunks: ['segregation_ring']
        }),
        new HtmlWebpackPlugin({
            title: "CT Slicer",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "slice.html",
            chunks: ['slice']
        }),
        new HtmlWebpackPlugin({
            title: "Roughness Ring",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "roughness_ring.html",
            chunks: ['roughness_ring']
        }),
        new HtmlWebpackPlugin({
            title: "Apollonian Sphere Packing",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "apollonian.html",
            chunks: ['apollonian']
        }),
        new HtmlWebpackPlugin({
            title: "Morse Code",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "morse-code.html",
            chunks: ['morse-code']
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
                test: /\.(ico|webmanifest|stl|nrrd|png|jpg)$/,
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
