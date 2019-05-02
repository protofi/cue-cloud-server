<template>

    <v-flex xs12 md6>

        <v-card>
            
            <v-layout wrap>

                <v-flex xs3 sm2 lg2>
                    
                    <v-card-title>
                        
                        <v-avatar size="72" color="cue-green-4">
                        
                            <v-icon dark large>settings_remote</v-icon>
                        
                        </v-avatar>
                        
                    </v-card-title>
            
                </v-flex>
            
                <v-flex xs9 sm6 lg6>
            
                    <v-card-title primary-title>

                        <div>

                            <div class="headline">
                                
                                {{ sensor.data.name }}

                                <span v-if="sensor.data.location">
                                    i {{ sensor.data.location.toLowerCase() }}
                                </span>
                            
                            </div>

                            <div>

                                <span class="grey--text text--darken-1">
                                    {{ sensor.id }}
                                </span>

                            </div>

                            <div v-if="sensor.data.last_heartbeat">

                                <v-icon small>favorite</v-icon>
                                <span>{{ sensor.data.last_heartbeat }}</span>

                            </div>

                        </div>

                    </v-card-title>
            
                </v-flex>

                <v-flex xs12 sm4>
                    
                    <v-card-title>

                        <v-layout row wrap>

                            <v-flex xs3 sm12
                                v-if="sensor.data.battery_level"
                            >
                                <v-icon>battery_std</v-icon>
                                <span>{{ sensor.data.battery_level.toFixed(2) }}v</span>
                            </v-flex>

                            <v-flex xs3 sm12
                                v-if="sensor.data.signal_strength"
                            >
                                <v-icon>wifi</v-icon>
                                <span>{{ sensor.data.signal_strength }}</span>
                            </v-flex>

                            <v-flex xs3 sm12
                                v-if="sensor.data.db_threshold"
                            >
                                <v-icon>hearing</v-icon>
                                <span>{{ sensor.data.db_threshold }} dB</span>
                            </v-flex>

                        </v-layout>

                    </v-card-title>

                </v-flex>
            
            </v-layout>
            
            <v-divider light></v-divider>
            
            <v-card-actions>
                
                <v-btn
                    v-if="sensor.data.event_has_happened"
                    ripple icon outline color="red"
                    @click="dismissNotification()"
                >
                    <v-icon>notifications_active</v-icon>
                </v-btn>

                <slot name="additional-actions"></slot>
            
                <v-spacer></v-spacer>
                        
                <v-btn icon large ripple
                >
                    <v-icon>delete</v-icon>
                </v-btn>

                <v-btn icon large ripple
                >
                    <v-icon>settings</v-icon>
                </v-btn>   
                
            </v-card-actions>
            
        </v-card>

    </v-flex>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'

export default {
	props : [
		'sensor'
    ],
	data () {
        return {
          
        }
    },

    methods : {
	
		async dismissNotification()
        {
            try{
				await firestore.collection('sensors').doc(this.sensor.id).update({
                    event_has_happened : false
                })
			}
			catch(e)
			{
				console.log(e)
			}
        },
	}
}

</script>