const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [{
    mode: "development",
    // mode: "production",
    entry: {
        'segregation_ring': './src/segregation_ring.js',
        'roughness_ring': './src/roughness_ring.js',
        'roughness_band': './src/roughness_band.js',
        'slice': './src/slice.js',
        'apollonian_2d': './src/apollonian_2d.js',
        'apollonian_3d': './src/apollonian_3d.js',
        'morse-code': './src/morse-code.js',
        'packing': './src/packing.js',
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
            filename: "apollonian_3d.html",
            chunks: ['apollonian_3d']
        }),
        new HtmlWebpackPlugin({
            title: "Apollonian Circle Packing",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "apollonian_2d.html",
            chunks: ['apollonian_2d']
        }),
        new HtmlWebpackPlugin({
            title: "Morse Code",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "morse-code.html",
            chunks: ['morse-code']
        }),
        new HtmlWebpackPlugin({
            title: "Roughness Band",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "roughness_band.html",
            chunks: ['roughness_band']
        }),
        new HtmlWebpackPlugin({
            title: "Packing",
            favicon: "./resources/favicon.ico",
            template: "template.html",
            filename: "packing.html",
            chunks: ['packing']
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
                test: /\.(ico|webmanifest|stl|nrrd|png|jpg|obj)$/,
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
