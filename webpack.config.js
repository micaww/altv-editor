const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const DelWebpackPlugin = require('del-webpack-plugin');
const AltvWebpackPlugin = require('altv-webpack-plugin');

const PACKAGE_NAME = 'altv-editor';

const removeTypescriptReferences = content => content.toString().replace(/^\/\/\/\s<reference.*$/gm, '');

module.exports = env => [
    {
        entry: './src/client/index.js',
        mode: env,
        output: {
            path: path.resolve('dist', PACKAGE_NAME, 'client'),
            filename: 'index.js'
        },
        plugins: [
            new CleanWebpackPlugin(),
            new AltvWebpackPlugin()
        ]
    },
    {
        entry: './src/server/index.js',
        mode: env,
        target: 'node',
        node: {
            __dirname: false
        },
        plugins: [
            new CleanWebpackPlugin(),
            new CopyWebpackPlugin({
                patterns: [
                    { context: 'src/server', from: 'static/**/*', to: './', globOptions: { ignore: ['*.js'] } },
                    { from: 'src/server/node_modules', to: 'node_modules' },
                    { from: 'src/server/config.json', to: './' }
                ]
            })
        ],
        externals: [
            function(ctx, req, callback){
                if(req === 'ngrok' || req === './config.json' || req === 'alt') callback(null, 'commonjs ' + req);
                else callback();
            }
        ],
        output: {
            path: path.resolve('dist', PACKAGE_NAME, 'server'),
            filename: 'index.js'
        }
    },
    {
        entry: './src/server/static/index.js',
        mode: env,
        module: {
            rules: [
                {
                    test: /\.js$/,
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    browsers: ["last 2 Chrome versions"]
                                }
                            }],
                            '@babel/preset-react'
                        ],
                        plugins: [
                            '@babel/plugin-proposal-object-rest-spread',
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-syntax-dynamic-import'
                        ],

                    },
                    exclude: [/node_modules/]
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.ttf$/,
                    loader: 'url-loader',
                    options: {
                        limit: 1000000
                    }
                }
            ]
        },
        plugins: [
            new MonacoWebpackPlugin({
                output: 'workers',
                languages: ['javascript', 'typescript'],
                features: []
            }),
            new HtmlWebpackPlugin({
                inject: false,
                cache: false,
                filename: path.resolve('dist', PACKAGE_NAME, 'server', 'static', `index.html`),
                minify: {
                    collapseWhitespace: true,
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    useShortDoctype: true
                },
                templateContent: htmlWebpackData => `
                    <!DOCTYPE html>
                    <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <title>alt:V Editor</title>
                        </head>
                        <body>
                            <div id="root"></div>
                            <script type="text/javascript">
                                ${htmlWebpackData.compilation.assets[htmlWebpackData.htmlWebpackPlugin.files.js[0].substr(htmlWebpackData.htmlWebpackPlugin.files.publicPath.length)].source()}
                            </script>
                        </body>
                    </html>
                `
            }),
            new CopyWebpackPlugin({
                patterns: [{
                    from: 'node_modules/@altv/types/types/altv-client.d.ts',
                    to: 'defs/altv-client.d.ts',
                    transform: content => {
                        return  "// Generated local backup copy of client-side TypeScript definitions\n" +
                            removeTypescriptReferences(content);
                    }
                }]
            }),
            new CopyWebpackPlugin({
                patterns: [{
                    from: 'node_modules/@altv/types/types/altv-server.d.ts',
                    to: 'defs/altv-server.d.ts',
                    transform: content => {
                        return  "// Generated local backup copy of server-side TypeScript definitions\n" +
                            removeTypescriptReferences(content);
                    }
                }]
            }),
            new DelWebpackPlugin({
                include: ['index.js'],
                keepGeneratedAssets: false
            })
        ],
        output: {
            path: path.resolve('dist', PACKAGE_NAME, 'server', 'static'),
            filename: 'index.js'
        }
    }
];