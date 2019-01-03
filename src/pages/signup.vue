<template>

    <div>

        <h2>Opret en ny profil</h2>
    
        <v-form ref="form" v-model="valid" lazy-validation >
           
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
                opret
            </v-btn>

            <v-btn @click="clear">Nulstil</v-btn>

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
    import { auth } from '~/plugins/firebase.js'

    export default {
        data: () => ({
            submitLoading: false,

            errorMessage : '',
            formError : false,

            //form validation
            valid: true,
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
                    .catch((error) => {
                        this.errorMessage = error.message

                    }).finally(() => {
                        this.submitLoading = false
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
