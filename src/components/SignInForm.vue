<template>

    <v-form ref="signInForm">

        <v-container grid-list-md>

            <v-layout wrap>

                <v-flex xs12>
                    <v-text-field
                        :rules="emailRules"
                        label="Email"
                        :validate-on-blur='true'
                        required
                        v-model="email">
                    </v-text-field>
                </v-flex>
                
                <v-flex xs12>
                    <v-text-field
                        :validate-on-blur='true'
                        :rules="passwordRules"
                        :type="'password'"
                        label="Password"
                        required
                        v-model="password">
                    </v-text-field>
                </v-flex>
            
            </v-layout>

                <v-btn
                    type="submit"
                    :loading="$store.getters['auth/processing']"
                    @click="submit"
                >
                    Sign in
                </v-btn>

                <v-btn @click="clear">Reset</v-btn>

        </v-container>
        
        <v-alert
            outline
            color="error"
            icon="warning"
            transition="scale-transition"
            :value="$store.getters['auth/error']"
        >
            {{ $store.getters['auth/error'] }}
        </v-alert>

    </v-form>

</template>

<script>
export default {
    created () {
        this.$store.watch((state) => this.$store.getters['auth/isGuest'], () => {
            this.$refs.signInForm.reset()
        })
    },
    data() {
        return {

            valid: true,
            password : '',
            passwordRules: [
                v => !!v || 'Du skal indtaste en adgangskode',
                v => (v && v.length >= 8) || 'Din adgangskode skal være 8 tegn eller flere',
            ],
            email : '',
            emailRules: [
                v => !!v || 'Du skal indtaste en email',
                v => /.+@.+/.test(v) || 'Indtast venligst en korrekt email'
            ],
        }
    },

    methods : {
        submit (e) {
            e.preventDefault()

            if (this.$refs.signInForm.validate()) {

                this.$store.dispatch('auth/signIn', {
                    email : this.email,
                    password : this.password
                })
            }
        },
        clear () {
            this.$refs.signInForm.reset()
        }
    }
}
</script>
