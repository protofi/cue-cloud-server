<template>
    <div>
        <h2>Sensors</h2>
        <v-btn
        :loading="loading"
        :disabled="loading"
        color="secondary"
        @click="deleting">
            Delete all
        </v-btn>
    </div>
</template>

<script>
export default {
    data () {
      return {
        loader: null,
        loading: false,
        message : ''
      }
    },
    watch: {
      loader () {
        const l = this.loader
        this[l] = !this[l]

        setTimeout(() => (this[l] = false), 3000)

        this.loader = null
      }
    },
    methods : {
        deleting: () => {
            message = 'hej'
        }
    }
}
</script>

<style>

</style>
