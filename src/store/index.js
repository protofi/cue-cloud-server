import Vuex from 'vuex'
import Vue from 'vue'

Vue.use(Vuex)

const createStore = () => {
  return new Vuex.Store({
    state: {
      user: null
    },
    getters: {
      activeUser: (state, getters) => {
        return state.user
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