import { auth } from '~/plugins/firebase.js'

const { isEmpty } = require('lodash')
const jwt_decode = require('jwt-decode')

export const state = () => ({
    user: null,
    error: null,
    loading: false,
    redirect: null,
    processing: false,
})

export const getters = {

	get: state => {
		return state.user
    },
    
    error: state => {
        return state.error
    },

	isAdmin: state => {
	
		try{
			const token = jwt_decode(state.user.ra)
			return (token.isAdmin)
		}
		catch(e) {
			return false
		}
	},
    
    isGuest: state => {
		return isEmpty(state.user)
	},
    
    loading: state => {
		return state.loading
    },
    
    processing: state => {
        return state.processing
    }
}

export const mutations = {
	set (state, payload)
	{
        state.user = payload
        state.loading = false
        state.processing = false
        
        if(!state.user) return

		this.$axios.setHeader('Authorization', payload.ra)
    },
    
    redirect (state, payload)
    {
        state.redirect = payload
    },
    
    remove(state, payload)
	{
		state.user = null
		this.$axios.setHeader('Authorization', null)
    },
    
	loading(state, payload)
	{
		state.loading = payload
    },

    signIn (state, payload)
    {
        state.processing = true

        auth.signInWithEmailAndPassword(payload.email, payload.password)
            .catch(error => {

                state.processing = false
                state.error = error.message

            }).finally(() => {
                state.processing = false
            })
    },
}

export const actions = {
    signIn(context, payload)
    {
        context.commit('signIn', payload)
    },

    signOut(context, payload) 
    {
        const _this = this

        auth.signOut().then(() => {

            context.commit('remove')
            _this.$router.push('/')
        }).catch(error => {
            
            console.log(error)
        })
    }
}