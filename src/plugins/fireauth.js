import { auth } from '~/plugins/firebase.js'

export default context => {
	const { store } = context

	if( process.server ) return

	return new Promise((resolve, reject) => {

		auth.onAuthStateChanged(user => {
			
			return resolve(store.commit('auth/set', user))
		})
	})
}