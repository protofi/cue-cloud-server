<template>

    <v-flex xs12 md6>

        <v-card>
            
            <v-layout wrap>

                <v-flex xs3 sm2 lg2>
                    
                    <v-card-title>
                        
                        <v-avatar size="56" color="cue-green-2 darken-1">
                        
                            <v-icon dark>settings_remote</v-icon>
                        
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

                        <v-layout row wrap class="icon-list">

                            <v-flex xs3 sm12
                                v-if="sensor.data.battery_level"
                            >
                                <v-icon>battery_std</v-icon>
                                <span>{{ sensor.data.battery_level.toFixed(2) }}V</span>
                            </v-flex>

                            <v-flex xs3 sm12
                                v-if="sensor.data.signal_strength"
                            >
                                <v-icon>bluetooth_searching</v-icon>
                                <span>{{ sensor.data.signal_strength }}dBm</span>
                            </v-flex>

                            <v-flex xs3 sm12
                                v-if="sensor.data.rssi_to_base_station"
                            >
                                <v-icon>router</v-icon>
                                <span>{{ sensor.data.rssi_to_base_station }}dBm</span>
                            </v-flex>

                            <v-flex xs3 sm12
                                v-if="sensor.data.db_threshold"
                            >
                                <v-icon>hearing</v-icon>
                                <span>{{ sensor.data.db_threshold }}dB</span>
                            </v-flex>

                            <v-flex xs3 sm12
                                v-if="sensor.data.notification_counter"
                            >
                                <v-icon>add_alert</v-icon>
                                <span>{{ sensor.data.notification_counter }}</span>
                            </v-flex>

                        </v-layout>

                    </v-card-title>

                </v-flex>
            
            </v-layout>
            
            <v-divider light></v-divider>
            
            <v-card-actions>
                
                <v-btn
                    large
                    v-if="sensor.data.event_has_happened"
                    ripple icon outline color="red"
                    @click.stop.prevent="dismissNotification()"
                >
                    <v-icon>notifications_active</v-icon>
                </v-btn>

                <slot name="additional-actions"></slot>
            
                <v-spacer></v-spacer>
                        
                <v-btn icon large ripple
                    @click.stop.prevent="showDialog('delete')"
                >
                    <v-icon>delete</v-icon>
                </v-btn>

                <v-btn icon large ripple
                    @click.stop.prevent="showDialog('edit')"
                >
                    <v-icon>settings</v-icon>
                </v-btn>   
                
            </v-card-actions>
            
        </v-card>

        <c-dialog
            :show="dialog.show"
            v-on:confirmed="onConfirmed"
            v-on:dismissed="onDismissed"
            :actions="dialog.type == 'delete'"
            :cancable="dialog.type == 'delete'"
        >   
            
            <template v-if="dialog.type == 'edit'">

                <template slot="headliner">Edit Sensor</template>
                
                <form-edit-sensor
                    :sensor="sensor"
                    :cancable="true"
                    v-on:submitted="onSubmitted"
                    v-on:dismissed="onDismissed">
                </form-edit-sensor>
            
            </template>

            <template v-if="dialog.type == 'delete'">

                <template slot="headliner">Delete sensor</template>

                <template slot="body">Are you sure you want to delete this sensor?</template>

            </template>

        </c-dialog>

    </v-flex>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'
import FormEditSensor from '~/components/FormEditSensor.vue'
import CDialog from '~/components/Dialog.vue'

export default {
	props : [
		'sensor'
    ],
    components : {
        FormEditSensor,
        CDialog
    },
	data () {
        return {
            dialog : {
                show : false,
                type : null,
                loading : false
            }
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

        showDialog (type)
        {
            this.dialog.show = true
            this.dialog.type = type
        },

        onSubmitted ()
        {
            this.dialog.show = false
            setTimeout(() => this.dialog.type = null, 200)

        },

        async onConfirmed () 
        {
            switch(this.dialog.type)
            {
                case('delete') :
                    await this.deleteSensor()
                break
            }
            setTimeout(() => this.dialog.type = null, 200)
        },

        onDismissed ()
        {
            this.dialog.show = false
            setTimeout(() => this.dialog.type = null, 200)
        },

        async deleteSensor()
        {
            this.dialog.loading = true
            try{
				await firestore.collection('sensors').doc(this.sensor.id).delete()
			}
			catch(e)
			{
				console.log(e)
            }
            this.dialog.show = false
            this.dialog.loading = false
        },

	}
}

</script>

<style lang="scss" scoped>
    .icon-list > *{
        align-items: center;
        display: flex;
    }
</style>
