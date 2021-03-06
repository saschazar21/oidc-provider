/* eslint-disable global-require */
const path = require('path');

const { baseUrl } = require('./lib/tools/domain');
const passport = require('./lib/auth');
const pkg = require('./package.json');

module.exports = {
  axios: {
    proxy: true,
  },
  head: {
    title: 'OpenID Connect | Sascha Zarhuber',
    meta: [
      { charset: 'utf-8' },
      { 'http-equiv': 'text/html; charset=UTF-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      }, {
        hid: 'description',
        name: 'description',
        content: pkg.description,
      }, {
        hid: 'author',
        name: 'author',
        content: pkg.author,
      }, {
        hid: 'application-name',
        name: 'application-name',
        content: pkg.name,
      }, {
        hid: 'keywords',
        name: 'keywords',
        content: pkg.keywords.toString(),
      },
    ],
    link: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
    ],
  },
  /*
  ** Add axios globally
  */
  build: {
    // extend(config, ctx) {
    //   if (ctx.isClient) {
    //     config.module.rules.push({
    //       enforce: 'pre',
    //       test: /\.(js|vue)$/,
    //       loader: 'eslint-loader',
    //       exclude: /(node_modules)/,
    //     });
    //   }
    // },
    postcss: [
      // require('colorguard')(),
      require('postcss-font-magician')({ foundries: 'bootstrap google' }),
      require('postcss-image-set-polyfill')(),
      require('postcss-cssnext')(),
    ],
  },
  /*
  ** Global CSS
  */
  css: [
    '@/assets/css/style.scss',
  ],
  env: {
    baseUrl,
  },
  modules: [
    '@nuxtjs/axios',
  ],
  router: {
    base: '/web/',
  },
  serverMiddleware: [
    passport.isAuthenticated,
  ],
  srcDir: path.resolve(__dirname, './vue'),
};
