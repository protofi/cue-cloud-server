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
        
        <v-container
            grid-list-md
        >

            <v-layout column fill-height justify-center>
                
                <v-layout row wrap>
                    
                    <v-flex xs12 sm11 md10 lg9 xl9>
                        
                        <v-layout column>

                            <v-flex 
                                v-for="baseStation in baseStations"
                                :key="baseStation.id"
                            >
                                <v-card>

                                    <v-card-title
                                        primary-title
                                    >

                                        <v-avatar color="blue-grey lighten-1">
                                            <v-icon dark>router</v-icon>
                                        </v-avatar>

                                        &nbsp;
                                        &nbsp;
                                        
                                        <span class="subheading font-weight-thin"> {{ baseStation.id }} </span>
                                        
                                        <v-spacer></v-spacer>

                                        <p class="headline"> {{ baseStation.data.pin }} </p>

                                    </v-card-title>

                                    <v-card-actions>

                                        <p v-if="baseStation.data.websocket"
                                            class="headline">
                                            &nbsp;{{baseStation.data.websocket.address}}:{{baseStation.data.websocket.port}}
                                        </p>

                                        <v-spacer></v-spacer>

                                    </v-card-actions>

                                    <v-card-actions>

                                        <!-- <v-btn
                                            @click="showSettingsDialog(baseStation.id)"
                                            icon large ripple>
                                            <v-icon dark>settings</v-icon>
                                        </v-btn>
                                        
                                        <v-btn
                                            icon
                                            large
                                            ripple
                                            :loading="websocketBaseStationLoadingIds.includes(baseStation.id)"
                                            @click.stop="toggleWebsocketConnection(baseStation.id)"
                                        >
                                            
                                            <v-icon dark :color="hasWebsocket.includes(baseStation.id) ? 'green' : 'primary'">power</v-icon>
                                        </v-btn>

                                        <div>
                                            <v-btn
                                                :disabled="!hasWebsocket.includes(baseStation.id)"
                                                @click.stop="publishMessage('pairing', baseStation.id)"                                                
                                                >
                                                Pairing
                                            </v-btn>
                                            <v-btn
                                                :disabled="!hasWebsocket.includes(baseStation.id)"
                                                @click.stop="publishMessage('calibration', baseStation.id)">
                                                Calibration
                                            </v-btn>
                                            <v-btn
                                                :disabled="!hasWebsocket.includes(baseStation.id)"
                                                @click.stop="publishMessage('disconnect', baseStation.id)">
                                                Disconnect peripheral
                                            </v-btn>
                                        </div>
                                       
                                         -->
                                        <v-spacer></v-spacer>
                                        <v-btn
                                            icon large ripple
                                            :loading="baseStation.meta.unlinkLoading"
                                            v-if="baseStation.data.households"
                                            @click.stop="unlink(baseStation.id)"
                                        >
                                            <v-icon>link_off</v-icon>
                                        </v-btn>

                                    </v-card-actions>

                                </v-card>

                            </v-flex>
                            
                        </v-layout> 
                
                    </v-flex>
                    
                </v-layout>

            </v-layout>

        </v-container>

        <v-container
            grid-list-md
        >

            <v-layout column fill-height justify-center>
                
                <v-layout row wrap>
                    
                    <v-flex xs12 sm11 md10 lg9 xl9>
                        
                        <v-layout column>

                            <v-flex 
                                v-for="sensor in sensors"
                                :key="sensor.id"
                            >
                                <v-card>

                                    <v-card-title
                                        primary-title
                                    >

                                        <v-avatar color="blue-grey lighten-1">
                                            <v-icon dark>settings_remote</v-icon>
                                        </v-avatar>

                                        &nbsp;
                                        &nbsp;
                                        
                                        <span class="subheading font-weight-thin"> {{ sensor.id }} </span>
                                        
                                    </v-card-title>

                                    <v-card-actions>
                                        
                                        <v-spacer></v-spacer>
                                        
                                        <span v-if="sensor.data.battery_level">


                                            <span class="subheading font-weight-medium">
                                                <v-icon>battery_std</v-icon>
                                                
                                                {{ sensor.data.battery_level }}
                                                
                                            </span>
                                            
                                            &nbsp;
                                        
                                        </span>

                                        <span v-if="sensor.data.signal_strength">
                                            
                                            &nbsp;
                                            &nbsp;
                                            &nbsp;
                                        
                                            <span class="subheading font-weight-medium">
                                                
                                                <v-icon>wifi</v-icon>
                                                {{ sensor.data.signal_strength }}
                                                
                                            </span>

                                            &nbsp;
                                            
                                        </span>
                                    
                                    </v-card-actions>

                                </v-card>

                            </v-flex>
                            
                        </v-layout> 
                
                    </v-flex>
                    
                </v-layout>

            </v-layout>

        </v-container>
        
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

import { firebase, firestore } from '~/plugins/firebase.js'

export default {
    data () {
        return {
            deleteLoading : false,
            baseStations : {},
            sensors : {}
        }
    },
    async mounted() {

        firestore.collection('base_stations').where('households.id', '==', this.$route.params.id).onSnapshot(({docs}) => {
            const baseStations = {}
            
            docs.forEach(doc => {

                const oldBaseStation = this.baseStations[doc.id]
                const meta = (oldBaseStation) ? oldBaseStation.meta : {}

                const data = doc.data()

                const baseStation = {
                    id      : doc.id,
                    path    : `/base-stations/${doc.id}`,
                    data    : data,
                    meta    : meta
                }

                baseStations[doc.id] = baseStation
            })

            this.baseStations = baseStations

        }, console.error)

        firestore.collection('sensors').where('households.id', '==', this.$route.params.id).onSnapshot(({docs}) => {
            const sensors = {}
           
            docs.forEach(doc => {

                const oldSensor = this.sensors[doc.id]
                const meta = (oldSensor) ? oldSensor.meta : {}

                const data = doc.data()

                const sensor = {
                    id      : doc.id,
                    path    : `/sensors/${doc.id}`,
                    data    : data,
                    meta    : meta
                }

                sensors[doc.id] = sensor
            })

            this.sensors = sensors

        }, console.error)
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
        },

        async unlink(baseStationId)
        {
            const baseStations = this.baseStations
            baseStations[baseStationId].meta.unlinkLoading = !baseStations[baseStationId].meta.unlinkLoading
            
            this.baseStations = {}
            this.baseStations = baseStations

            try{
				await firestore.collection('base_stations').doc(baseStationId).update({
					households : firebase.firestore.FieldValue.delete()
				})
			}
			catch(e)
			{
				if(!e.message.includes('No document to update'))
                {
                    console.log(e)
                    return
                }
			}

            const householdId = baseStation.data().households.id

			try{
				await firestore.collection('households').doc(householdId).update({
						[`base_stations.${baseStationId}`] : firebase.firestore.FieldValue.delete()
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

<style>

</style>
