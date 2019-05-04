<template>
    
    <v-form ref="form">

        <v-card flat color="transparent">
        
            <v-card-text>
            
                <v-container grid-list-md>

                    <v-layout wrap>

                        <v-flex xs12>
                            {{sensor.id}}
                        </v-flex>

                        <v-flex xs12>
                            <v-text-field
                                label="Name"
                                v-model="name">
                            </v-text-field>
                        </v-flex>

                        <v-flex xs12>
                            <v-text-field
                                label="Sensor icon"
                                v-model="icon">
                            </v-text-field>
                        </v-flex>

                        <v-flex xs12>
                            <v-text-field
                                label="Location of the sensor"
                                v-model="location">
                            </v-text-field>
                        </v-flex>

                        <v-alert
                            :value="error"
                            color="error"
                            icon="warning"
                            transition="scale-transition"
                            outline
                        >
                            {{ errorMessage }}

                        </v-alert>

                    </v-layout>

                </v-container>
            
            </v-card-text>

            <v-card-actions>
            
                <v-spacer></v-spacer>

                <v-btn
                    v-if="cancable"
                    color="cue-green-7 darken-1"
                    flat
                    @click.stop="cancel"
                >
                    Cancel
                </v-btn>

                <v-btn
                    color="cue-green-7 darken-1"
                    flat type="submit"
                    @click.stop="submit"
                    :loading="loading"
                >
                    Update
                </v-btn>
       
            </v-card-actions>
       
        </v-card>
        
    </v-form>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'

export default {
    props : [
        'sensor',
        'cancable'
    ],
    data() {
        return {
            name : this.sensor.data.name,
			location : this.sensor.data.location,
			icon : this.sensor.data.icon_string,
			error : false,
            errorMessage : '',
            loading : false
        }
    },

    watch : {
		sensorConfigErrorMessage (v) {
			this.sensorConfigError = (v.length > 0)
        }
	},

    methods : {
        async submit (event)
        {
            event.preventDefault()
            this.loading = true

            const data = {}
            if(this.name)       data.name           = this.name
            if(this.location)   data.location       = this.location
            if(this.icon)       data.icon_string    = this.icon

			try{
				await firestore.collection('sensors').doc(this.sensor.id).set(data, {
					merge : true
				})
			}
			catch(e)
			{
				console.log(e)
            }
            
            this.loading = false
            this.$emit('submitted', event, this.$refs.form)
        },

        cancel () 
        {
            this.clear()
            this.$emit('dismissed', event, this.$refs.form)
        },

        clear ()
        {
            this.name       = this.sensor.data.name
			this.location   = this.sensor.data.location
			this.icon       = this.sensor.data.icon_string
        }
    }
}
</script>
