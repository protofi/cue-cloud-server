import { auth } from '~/plugins/firebase.js'

const { isEmpty } = require('lodash')
const jwt_decode = require('jwt-decode')
const moment = require('moment')

export const state = () => ({
    user: null,
    token : null,
    error: null,
    loading: true,
    redirect: null,
    processing: false,
    now : moment().unix(),
})

export const getters = {

	user: state => {
		return state.user
    },
    
    error: state => {
        return state.error
    },
 
	isAdmin: state => {
	
		try{
			return state.token.isAdmin
		}
		catch(e) {
			return false
		}
    },

    token: state => {
        return state.token  
    },

    expiration : state => {
        if(!state.token) return null
        return state.token.exp
    },

    hasExpired: state => {
        if(!state.token) return null

        const now = moment().add(45, 'm').unix()
        const hasExpired = moment(now).isAfter(state.token.exp)
        return hasExpired
    },
    
    isSuperAdmin: state => {
	
		try{
			return state.token.isSuperAdmin
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
	user (state, payload)
	{
        state.user = payload
        state.loading = false
        state.processing = false
        
        if(!state.user) return

        try{
            state.token = jwt_decode(payload.ra)
            this.$axios.setHeader('Authorization', payload.ra)
        }
		catch(e) {
			return false
		} 
    },
    
    redirect (state, payload)
    {
        state.redirect = payload
    },
    
    remove(state, payload)
	{
		state.user = null
		state.token = null
		this.$axios.setHeader('Authorization', null)
    },
    
	loading(state, payload)
	{
		state.loading = payload
    },

    signIn (state, payload)
    {
        state.error = null
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
    },

    refresh({ state}, payload)
    {
        state.processing = true

        auth.currentUser.getIdToken(true).then((token) => {

            try{
                state.token = jwt_decode(token)
                this.$axios.setHeader('Authorization', token)
            }
            catch(e) {
                return false
            } 
        }).catch(error => {

        }).finally(() => {
            state.processing = false
        })
          
    }
}