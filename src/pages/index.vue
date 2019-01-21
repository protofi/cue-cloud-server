<template>

    <div>
        
        <v-parallax
            v-show="$store.getters['auth/isGuest']"
            dark
            src="https://cdn.vuetifyjs.com/images/parallax/material.jpg"
        >
            <v-layout
                align-center
                column
                justify-center
            >
                <h1 class="display-2 font-weight-thin mb-3">Cue</h1>
                <h4 class="subheading">Et smartere hjem</h4>

            </v-layout>

        </v-parallax>

        <cue-user-dashboard
            v-show="!$store.getters['auth/isGuest']"
        />

    </div>

</template>

<script>
    import CueUserDashboard from '~/components/CueUserDashboard.vue'

    export default {
        components: {
            CueUserDashboard
        }
    }
</script>
