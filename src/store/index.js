import Vuex from 'vuex'
import Vue from 'vue'
const jwt_decode = require('jwt-decode')

Vue.use(Vuex)

const createStore = () => {
  return new Vuex.Store({
    state: {
      user: null
    },
    getters: {
      activeUser: (state, getters) => {
        return state.user
      },
      isUserAdmin: (state, getters) => {
        try{
            const token = jwt_decode(state.user.ra)
            return (token.isAdmin)
        }
        catch(e)
        {
            return false
        }
      }
    },
    mutations: {
      setUser (state, payload) {
        state.user = payload
      },
      unsetUser(state, payload) {
        state.user = null
      }
    }
  })
}

export default createStore