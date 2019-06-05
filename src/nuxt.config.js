const pkg = require('./package')

module.exports = {
  mode: 'universal',

  /*
  ** Headers of the page
  */
  head: {
    title: 'Cue Dashboard',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Material+Icons' }
    ]
  },

  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#FFFFFF' },

  /*
  ** Global CSS
  */
  css: [
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    '~/plugins/firebase.js',
    '~/plugins/fireauth.js',
    '~/plugins/websocket.js'
  ],

  router: {
    middleware: 'auth-router'
  },

  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://github.com/nuxt-community/axios-module#usage
    ['@nuxtjs/axios', {
      baseURL: (process.env.NODE_ENV == 'production') ? '/api/v1/' : 'http://localhost:5000/api/v1/'
    }],
    '@nuxtjs/vuetify',
    ['nuxt-validate', {
      lang: 'en',
    }]
  ],

  
  /*
  ** Axios module configuration
  */
  axios: {
    // See https://github.com/nuxt-community/axios-module#options
  },

  vuetify: {
    // Vuetify options
    theme: {
      primary: '#121212',
      'cue-green-0' : '#F0F8F4',
      'cue-green-1' : '#CBE8DB',
      'cue-green-2' : '#9CD5BD',
      'cue-green-3' : '#72C7A8',
      'cue-green-4' : '#44BB93',
      'cue-green-5' : '#27AB84',
      'cue-green-6' : '#169574',
      'cue-green-7' : '#187E64',
      'cue-green-8' : '#0D6C59',
      'cue-green-9' : '#044E41',
      'cue-yellow-0' : '#FFFAEB',
      'cue-yellow-1' : '#FCEFC7',
      'cue-yellow-2' : '#F8E3A3',
      'cue-yellow-3' : '#F9DA8B',
      'cue-yellow-4' : '#F7D070',
      'cue-yellow-5' : '#E9B949',
      'cue-yellow-6' : '#C99A2E',
      'cue-yellow-7' : '#A27C1A',
      'cue-yellow-8' : '#7C5E10',
      'cue-yellow-9' : '#513C06',
    }
  },

  /*
  ** Build configuration
  */
  buildDir: '../functions/nuxt',
  build: {
    publicPath: '/assets/client',
    extractCSS: true,
    typescript : {
      typeCheck: false
    },
    /*
    ** You can extend webpack config here
    */
    extend(config, ctx) {
      // Run ESLint on save
      // if (ctx.isDev && ctx.isClient) {
      //   config.module.rules.push({
      //     enforce: 'pre',
      //     test: /\.(js|vue)$/,
      //     loader: 'eslint-loader',
      //     exclude: /(node_modules)/
      //   })
      // }
      // if (ctx.isServer) {
      //   config.externals = [
      //     nodeExternals({
      //       whitelist: [/^vuetify/]
      //     })
      //   ]
      // }
    }
  }
}
