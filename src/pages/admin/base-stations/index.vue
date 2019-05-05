<template>
    
	<div>
		
		<v-toolbar color="cue-green-6" dark tabs>

			<v-toolbar-title>Base Stations</v-toolbar-title>

            <v-spacer></v-spacer>

		</v-toolbar>

        <v-tabs
            v-model="activeTab"
            color="cue-green-6"
            dark
            slider-color="cue-yellow-3"
        >
            <v-tab
                v-for="(tab, i) in tabs"
                :key="i"
                ripple
            >
                {{ tab.name }}

            </v-tab>

            <v-tab-item
                v-for="(tab, i) in tabs"
                :key="i"
            >
                <v-container
                    grid-list-md
                >
                    <v-layout column fill-height justify-center>
                        
                        <v-layout row wrap>
                            
                            <v-flex xs12 sm11 md10 lg9 xl9>
                                
                                <v-layout column>

                                    <card-item-base-station
                                        v-for="baseStation in filteredBaseStation(tab.filter)"
                                        :key="baseStation.id"
                                        :base-station="baseStation"
                                    >
                                    </card-item-base-station>

                                    <v-card v-if="!loading && !filteredBaseStation(tab.filter).length" color="cue-green-1 darken-2" class="white--text">
                                        <v-card-title primary-title>
                                            
                                            <div>
                                                <div class="headline">{{ tab.empty }}</div>
                                                <span>Listen to your favorite artists and albums whenever and wherever, online and offline.</span>
                                            </div>
                                        
                                        </v-card-title>

                                        <v-card-actions>
                                        
                                            <v-btn flat dark>Listen now</v-btn>
                                        
                                        </v-card-actions>

                                    </v-card>

                                    <v-container class="text-xs-center" v-if="loading">

                                        <v-progress-circular
                                            v-if="loading"
                                            :size="60"
                                            width="6"
                                            color="cue-green-4"
                                            indeterminate
                                        ></v-progress-circular>

                                    </v-container>
                                    
                                    
                                </v-layout> 
                        
                            </v-flex>
                            
                        </v-layout>

                    </v-layout>
                        
                </v-container>

            </v-tab-item>

        </v-tabs>

        <v-btn
            color="cue-yellow-5"
            dark fixed bottom right fab
            :loading="registerBaseStationLoading"
            @click="registerBaseStation"
        >
            <v-icon>add</v-icon>
        </v-btn>

	</div>

</template>

<script>
import { firebase, firestore } from '~/plugins/firebase.js'
import { websocket } from '~/plugins/websocket.js'

import CardItemBaseStation from '~/components/admin/CardItemBaseStation.vue'

export default {
    data () {
        return {
            loading : true,
            baseStations : {},
            registerBaseStationLoading: false,
            activeTab: 0,
            tabs : [
                {
                    name : 'all',
                    filter : () => {
                        return true
                    },
                    empty : 'No Base Stations were found.'
                }, {
                    name : 'unclaimed',
                    filter : (baseStation) => {
                        return (baseStation.data.households == null || baseStation.data.households.id == null)
                    },
                    empty : 'No unclaimed Base Stations were found.'
                }, {
                    name : 'claimed',
                    filter : (baseStation) => {
                        return (baseStation.data.households != null && baseStation.data.households.id != null)
                    },
                    empty : 'No Base Stations have been claimed yet.'
                }
            ]
        }
    },
    components : {
        CardItemBaseStation
    },

    created ()
	{
		firestore.collection('base_stations')
			.onSnapshot(({ docs }) => {

			const baseStations = {}

			docs.forEach(doc => {

				const oldBaseStation = this.baseStations[doc.id]
				const meta = (oldBaseStation) ? oldBaseStation.meta : {}

				const data = doc.data()

				const baseStation = {
					id      : doc.id,
					path    : `/admin/base-stations/${doc.id}`,
					data    : data,
					meta    : meta
				}

				baseStations[doc.id] = baseStation
			})

            this.baseStations = baseStations
            this.loading = false
		})
	},

    methods : {
        filteredBaseStation(filter)
        {
            return Object.values(this.baseStations).filter(filter)
        },

        registerBaseStation()
        {
            this.registerBaseStationLoading = true

            this.$axios.$put(`base-stations/`)
				.catch(console.error)
				.finally(() => {
					this.registerBaseStationLoading = false
				})
        },
    }
}
</script>

<style>

</style>