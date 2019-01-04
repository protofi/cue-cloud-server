import { auth } from '~/plugins/firebase.js'

export default context => {
  const { store } = context

  if(process.server) return

  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(user => {
      if (user) {
        store.commit('userLoading', false)
        return resolve(store.commit('setUser', user))
      }

      return resolve(store.commit('userLoading', false))
    })
  })
}