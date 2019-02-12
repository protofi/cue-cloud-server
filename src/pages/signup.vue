<template>

    <div>

        <h2>Opret en ny profil</h2>
    
        <v-form ref="form" v-model="valid" lazy-validation >
           
            <v-text-field
                v-model="name"
                label="Navn"
                :validate-on-blur='true'
            ></v-text-field>

            <v-text-field
                v-model="email"
                :rules="emailRules"
                label="E-mail"
                :validate-on-blur='true'
                required
            ></v-text-field>

            <v-text-field
                v-model="password"
                :validate-on-blur='true'
                :rules="passwordRules"
                :type="'password'"
                label="Adgangskode"
                required
            ></v-text-field>

            <v-btn
                :submitLoading="submitLoading"
                type="submit"
                @click="submit"
            >
                Register
            </v-btn>

            <v-btn @click="clear">Reset</v-btn>

                <v-alert
                    :value="formError"
                    color="error"
                    icon="warning"
                    transition="scale-transition"
                    outline
                >
                {{ errorMessage }}
                </v-alert>

        </v-form>

    </div>

</template>

<script>
    import axios from 'axios'
    import { auth, firestore } from '~/plugins/firebase.js'

    export default {
        data: () => ({
            submitLoading: false,

            errorMessage : '',
            formError : false,

            //form validation
            valid: true,
            name : '',
            password: '',
            passwordRules: [
                v => !!v || 'Du skal indtaste en adgangskode',
                v => (v && v.length >= 8) || 'Din adgangskode skal være 8 tegn eller flere',
            ],
            email: '',
            emailRules: [
                v => !!v || 'Du skal indtaste en email',
                v => /.+@.+/.test(v) || 'Indtast venligst en korrekt email'
            ],
        }),
        watch: {
            errorMessage (v) 
            {
                this.formError = (v.length > 0)
            }
        },
        methods: {
            submit (e) {
                e.preventDefault()

                if (this.$refs.form.validate())
                {
                    this.submitLoading = true
                    this.errorMessage = ''

                    auth.createUserWithEmailAndPassword(this.email, this.password)

                    auth.onAuthStateChanged(user => {

                        if(!user) return

                        try{

                            const unsubscribe = firestore.collection('users').doc(user.uid).onSnapshot((snapshot) => {
                         
                                console.log('CHANGE')

                                if(snapshot.ref)
                                {
                                    snapshot.ref.set({
                                        name : this.name,
                                        FCM_tokens : {
                                            'abvel234' : {
                                                context : 'IOS'
                                            }
                                        }
                                    }, { merge : true })
                                    .then(() => {
                                        unsubscribe()
                                    })
                                    .catch(e => {
                                        console.log('UPDATE', e)
                                    })
                                }
                            })
                        }
                        catch(e)
                        {
                            console.log('READ', e)
                        }
                    })
                }
            },
            clear () {
                this.errorMessage = ''
                this.$refs.form.reset()
            }
        }
    }
</script>

<style>

</style>
