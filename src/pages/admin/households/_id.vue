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

            <v-menu
                offset-y
            >
                <v-btn
                    slot="activator"
                    icon
                >
                    <v-icon>more_vert</v-icon>

                </v-btn>
        
                <v-list>
        
                    <v-list-tile
                        @click.stop="showDialog('delete')"
                    >
                        <v-list-tile-action>
                    
                            <v-icon>delete</v-icon>
                    
                        </v-list-tile-action>

                        <v-list-tile-content>
                    
                            <v-list-tile-title>Delete</v-list-tile-title>
                    
                        </v-list-tile-content>

                    </v-list-tile>
                    
                </v-list>

            </v-menu>
		
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
                                :simple="true" 
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

            </v-layout>

        </v-container>

        <c-dialog
            :show="dialog.show"
            v-on:confirmed="onConfirmed"
            v-on:dismissed="onDismissed"
            :loading="dialog.loading"
            actions="true"
            cancable="true"
        >   
            <template v-if="dialog.type == 'delete'">

                <template slot="headliner">Delete Household</template>

                <template slot="body">Are you sure you want to delete this Household?</template>

            </template>

        </c-dialog>
        
    </div>

</template>

<script>

import { firebase, firestore } from '~/plugins/firebase.js'
import SensorDetailsCardItem from '~/components/SensorDetailsCardItem.vue'
import CardItemBaseStation from '~/components/admin/CardItemBaseStation.vue'
import CDialog from '~/components/Dialog.vue'


export default {
    data () {
        return {
            deleteLoading : false,
            baseStations : {},
            sensors : {},
            dialog : {
                show : false,
                type : null,
                loading : false
            }
        }
    },
    components : {
        SensorDetailsCardItem,
        CardItemBaseStation,
        CDialog
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
        showDialog (type)
        {
            this.dialog.show = true
            this.dialog.type = type
        },

        onSubmitted ()
        {
            this.dialog.show = false
        },

        async onConfirmed () 
        {
            switch(this.dialog.type)
            {
                case('delete') :
                    await this.deleteHousehold()
                break
            }
        },

        onDismissed ()
        {
            this.dialog.show = false
        },

        async deleteHousehold()
        {
            this.dialog.loading = true

            try{
                await firestore.collection('households').doc(this.$route.params.id).delete()
                this.$router.push('/admin/households')
            }
            catch(e)
            {
                console.log(e)
            }

            this.dialog.loading = false
        },
    }
}
</script>

<style>

</style>
