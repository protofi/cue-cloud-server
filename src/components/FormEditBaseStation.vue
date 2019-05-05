<template>
    
    <v-form ref="form">

        <v-card flat color="transparent">
        
            <v-card-text>
            
                <v-container grid-list-md>

                    <v-layout wrap>

                        <v-flex xs12>
                            <div class="caption">Base Station id:</div>
                            <div class="subheading">{{baseStation.id}}</div>
                            
                        </v-flex>

                        <v-flex
                            xs12
                            md8
                        >
                            <v-text-field
                                v-model="pin"
                                :rules="pinRules"
                                label="Pin code"
                                required
                            ></v-text-field>
                        </v-flex>

                    </v-layout>

                    <v-layout wrap>

                        <v-flex
                            xs12
                            md8
                        >
                            <v-text-field
                                v-model="ip"
                                :rules="ipRules"
                                label="IP Address"
                                required
                            ></v-text-field>
                        </v-flex>

                        <v-flex
                            xs12
                            md4
                        >
                            <v-text-field
                                v-model="port"
                                :rules="portRules"
                                label="Port"
                                required
                            ></v-text-field>
                        </v-flex>

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
        'base-station',
        'cancable'
    ],
    data() {
        return {
			error : false,
            errorMessage : '',
            loading : false,
            ip: (this.baseStation.data.websocket) ? this.baseStation.data.websocket.address : '',
            ipRules: [
                v => !!v || 'You have to provide an IP address',
                v => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v) || 'You have to provide a valid IP address'
            ],
            port: (this.baseStation.data.websocket) ? this.baseStation.data.websocket.port : '',
            portRules: [
                v => !!v || 'You have to provide a port',
                v => /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/.test(v) || 'The port must be an integer between 0 and 65535'
            ],
            pin: this.baseStation.data.pin,
            pinRules: [
                v => !!v || 'You have to provide a pin code',
            ],
        }
    },

    watch : {
		sensorConfigErrorMessage (v) {
			this.baseStationConfigError = (v.length > 0)
        }
	},

    methods : {
        async submit (event)
        {
            event.preventDefault()
            this.loading = true

            const data = {websocket : {}}
            if(this.port) data.websocket.port       = this.port
            if(this.ip)   data.websocket.address    = this.ip
            if(this.pin)  data.pin                  = this.pin

			try{
				await firestore.collection('base_stations').doc(this.baseStation.id).set(data, {
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
            this.ip     = (this.baseStation.data.websocket) ? this.baseStation.data.websocket.address : ''
			this.port   = (this.baseStation.data.websocket) ? this.baseStation.data.websocket.port : ''
			this.pin    = this.baseStation.data.pin
        }
    }
}
</script>
