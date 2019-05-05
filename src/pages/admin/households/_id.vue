<template>
    
    <div>

        <v-toolbar
            color="cue-green-6"
            dark
            tabs
        >

			<v-toolbar-title>Household</v-toolbar-title>

			<v-spacer></v-spacer>

            {{ $route.params.id }}
		
        </v-toolbar>
        
        <v-container
            grid-list-md
        >
            <v-subheader>
                Base Stations
            </v-subheader>

            <v-layout column fill-height justify-center>
                
                <v-layout row wrap>
                    
                    <v-flex xs12 sm11 md10 lg9 xl9>
                        
                        <v-layout column>

                            <card-item-base-station
                                v-for="baseStation in baseStations"
                                :key="baseStation.id"
                                :base-station="baseStation"    
                            >
                            </card-item-base-station>
                            
                        </v-layout> 
                
                    </v-flex>
                    
                </v-layout>

            </v-layout>

        </v-container>

        <v-container
            grid-list-md
        >
            <v-subheader>
                Sensors
            </v-subheader>

            <v-layout row wrap>
    
                <sensor-details-card-item
                    v-for="sensor in sensors"
                    :key="sensor.id"
                    :sensor="sensor"
                >

                </sensor-details-card-item>
                <!-- <v-card>

                    <v-card-title
                        primary-title
                    >

                        <v-avatar color="blue-grey lighten-1">
                            <v-icon dark>settings_remote</v-icon>
                        </v-avatar>

                        &nbsp;
                        &nbsp;

                        <span class="subheading font-weight-thin"> {{ sensor.id }} </span>
                        
                        <v-spacer></v-spacer>

                        <v-btn
                            ripple icon outline color="red"
                            v-if="sensor.data.event_has_happened"
                            @click="dismissNotification(sensor.id)"
                        >
                            <v-icon>notifications_active</v-icon>
                        </v-btn>

                    </v-card-title>

                    <v-card-actions class="headline">

                        {{ sensor.data.name }}
                        
                        <span v-if="sensor.data.location">
                            &nbsp;i
                            {{ sensor.data.location }}
                        </span>

                    </v-card-actions>

                    <v-card-actions>
                        
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

                        <span v-if="sensor.data.db_threshold">
                            
                            &nbsp;
                            &nbsp;
                            &nbsp;
                        
                            <span class="subheading font-weight-medium">
                                
                                <v-icon>hearing</v-icon>
                                {{ sensor.data.db_threshold }}
                                
                            </span>

                            &nbsp;
                            
                        </span>

                        <span v-if="sensor.data.last_heartbeat">
                            
                            &nbsp;
                            &nbsp;
                            &nbsp;
                        
                            <span class="subheading font-weight-medium">
                                
                                <v-icon>favorite</v-icon>
                                {{ sensor.data.last_heartbeat }}
                                
                            </span>

                            &nbsp;
                            
                        </span>

                        <span v-if="sensor.data.notification_counter">
                            
                            &nbsp;
                            &nbsp;
                            &nbsp;
                        
                            <span class="subheading font-weight-medium">
                                
                                <v-icon>notifications</v-icon>
                                {{ sensor.data.notification_counter }}
                                
                            </span>

                            &nbsp;
                            
                        </span>

                        <v-spacer></v-spacer>
                        
                        <v-btn icon large ripple
                            @click.stop="deleteSensor(sensor.id)"
                        >
                            <v-icon>delete</v-icon>
                        </v-btn>   

                    </v-card-actions>

                </v-card> -->

            </v-layout>

        </v-container>
        
        <v-container>
        
            <v-btn
                color="error"
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
import SensorDetailsCardItem from '~/components/SensorDetailsCardItem.vue'
import CardItemBaseStation from '~/components/admin/CardItemBaseStation.vue'

export default {
    data () {
        return {
            deleteLoading : false,
            baseStations : {},
            sensors : {}
        }
    },
    components : {
        SensorDetailsCardItem,
        CardItemBaseStation
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

        async deleteSensor(sensorId)
        {
            try{
				await firestore.collection('sensors').doc(sensorId).delete()
			}
			catch(e)
			{
				console.log(e)
			}
        },

        async dismissNotification(sensorId)
        {
            try{
				await firestore.collection('sensors').doc(sensorId).update({
                    event_has_happened : false
                })
			}
			catch(e)
			{
				console.log(e)
			}
        }
    }
}
</script>

<style>

</style>
