<template>
  <v-app>
    <v-navigation-drawer
      :mini-variant="miniVariant"
      :clipped="clipped"
      v-model="drawer"
      fixed
      app
    >
      <v-list>
        <v-list-tile
          v-for="(item, i) in items"
          :to="item.to"
          :key="i"
          router
          exact
        >
          <v-list-tile-action>
            <v-icon v-html="item.icon" />
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title v-text="item.title" />
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar
      :clipped-left="clipped"
      fixed
      app
    >
      <v-toolbar-side-icon @click="drawer = !drawer" />
      <v-btn
        icon
        @click.stop="miniVariant = !miniVariant"
      >
        <v-icon v-html="miniVariant ? 'chevron_right' : 'chevron_left'" />
      </v-btn>
      <v-btn
        icon
        @click.stop="clipped = !clipped"
      >
        <v-icon>web</v-icon>
      </v-btn>

      <v-toolbar-title v-text="title"/>

      <v-btn
        icon
        @click.stop="signOut"
      >
        <v-icon>lock</v-icon>
      </v-btn>

    </v-toolbar>
    <v-content>
      <!-- <v-container> -->
        <nuxt />
      <!-- </v-container> -->
    </v-content>
    
  </v-app>
</template>

<script>
  import { auth } from '~/plugins/firebase.js'
  export default {
    data() {
      return {
        clipped: false,
        drawer: true,
        items: [
          { icon: 'panorama', title: 'Welcome', to: '/' },
          { icon: 'security', title: 'Admin', to: '/admin' },
          { icon: 'lock_open', title: 'Sign in', to: '/signin' },
        ],
        miniVariant: false,
        title: 'Cue dashboard'
      }
    },

    methods: {
      signOut() {
        const _this = this
        auth.signOut().then(function()
        {
          _this.$store.commit('unsetUser')
          _this.$router.push('/')
        }).catch(function(error) {
          console.log(error)
        })
      }
    }
  }
</script>
