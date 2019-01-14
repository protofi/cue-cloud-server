<template>

    <v-container>

        <v-layout row wrap justify-center align-center v-show="authLoading">
            <v-flex xs6>
                <v-card color="blue-grey darken-2" class="white--text">
                    
                    <v-card-title primary-title>
                        
                        <div>
                        
                            <div class="headline">Just a moment...</div>
                            <span>Checking if you are signed in or not.</span>
                        
                        </div>

                        <v-flex  text-lg-right>
                            <v-progress-circular 
                                :size="70"
                                :width="7"
                                indeterminate
                            ></v-progress-circular>
                        </v-flex>

                    </v-card-title>
                    
                </v-card>

          </v-flex>
        </v-layout>

        <v-form ref="form"
            v-model="valid" 
            lazy-validation
            v-show="!authLoading && !auth"
            transition="fade-transition"
        >
            <h2>Sign in</h2>

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
                type="submit"
                :loading="signInLoading"
                @click="submit"
            >
                Sign in
            </v-btn>

            <v-btn @click="clear">Reset</v-btn>

            <v-alert
                :value="formError"
                color="error"
                icon="warning"
                transition="scale-transition"
                outline
            >
                {{ formErrorMessage }}
            </v-alert>

        </v-form>

    </v-container>

</template>

<script>
    // import axios from 'axios'

    export default {
        
        async asyncData ({ route }) {
            return {
                redirect : ( route.query.redirect ) ? route.query.redirect : '/'
            }
        },
        mounted () {
            this.$store.watch(state => {
                if(state.auth.user) this.$router.push(this.redirect)
            })
        },
        data: () => ({
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
            formErrorMessage (v) {
                this.formError = (v.length > 0)
            },
        },
        computed : {
            authLoading () {
                return this.$store.getters['auth/loading']
            },
            signInLoading () {
                return this.$store.getters['auth/signInLoading']
            },
            auth () {
                return this.$store.getters['auth/get']
            },
            formErrorMessage() {
                return this.$store.getters['auth/error']
            }
        },
        methods: {
            submit (e) {
                e.preventDefault()

                if (this.$refs.form.validate()) {

                    // this.submitLoading = true
                    // this.formErrorMessage = ''

                    this.$store.dispatch('auth/signIn', {
                        email : this.email,
                        password : this.password
                    })
                    // auth.signInWithEmailAndPassword(this.email, this.password)
                    // .then((response) => {

                    //     this.$router.push(this.redirect)
                    // })
                    // .catch((error) => {
                    //     this.formErrorMessage = error.message;

                    // }).finally(() => {
                    //     this.submitLoading = false
                    // })
                }
            },
            clear () {
                this.formErrorMessage = ''
                this.$refs.form.reset()
            }
        }
    }
</script>

<style>

</style>
