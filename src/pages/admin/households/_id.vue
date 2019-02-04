<template>
    
    <div>

        <v-toolbar
            color="cyan"
            
            dark
            tabs
        >

			<v-toolbar-title>Household</v-toolbar-title>

			<v-spacer></v-spacer>

            ID: {{$route.params.id}}
		
        </v-toolbar>
        
        <v-container>
    
            <v-btn
                block
                color="error"
                large
                :loading="deleteLoading"
                @click.stop="deletion"
                >

                <v-icon left dark>
                    delete
                </v-icon>
                
                Delete
 
            </v-btn>
    
        </v-container>

    </div>

</template>

<script>
import { firestore } from '~/plugins/firebase.js'

export default {
    data() {
        return {
            deleteLoading : false
        }
    },

    methods : {
        async deletion()
        {
            this.deleteLoading = true
            const _this = this

            firestore.collection('households').doc(this.$route.params.id).delete()
            .then(() => {
                _this.$router.push('/admin/households')
            }).catch(console.log)
        }
    }
}
</script>

<style>

</style>
