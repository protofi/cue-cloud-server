<template>
    
	<div>
		
		<v-toolbar color="cyan" dark tabs>

			<v-toolbar-title>Base Stations</v-toolbar-title>

            <v-spacer></v-spacer>

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
                                        
                                        <v-spacer></v-spacer>

                                        <div>

                                            <div class="headline"> {{ baseStation.data.pin }} </div>
                                        
                                        </div>

                                    </v-card-title>

                                    <v-card-actions v-if="baseStation.data.households">

                                        <v-spacer></v-spacer>

                                        <v-chip>
                                            <v-avatar class="teal">
                                                <v-icon color="white">check</v-icon>
                                            </v-avatar>
                                            Claimed
                                        </v-chip>  

                                    </v-card-actions>

                                    <v-card-actions>

                                        <v-spacer></v-spacer>

                                        <!-- <v-btn
                                            icon large ripple
                                            :loading="unlinkBaseStationLoading"
                                            v-if="baseStation.data.households"
                                            @click.stop="unlink(baseStation.id)"
                                        >
                                            <v-icon>link_off</v-icon>
                                        </v-btn>   

                                        <v-btn icon large ripple>
                                            <v-icon>delete</v-icon>
                                        </v-btn>               
                                    -->
                                    </v-card-actions>

                                </v-card>

                            </v-flex>
                            
                        </v-layout> 
                
                    </v-flex>
                    
                </v-layout>

            </v-layout>

            <v-btn
                color="pink"
                dark
                fixed
                bottom
                right
                fab
                :loading="registerBaseStationLoading"
                @click="registerBaseStation"
            >
                <v-icon>add</v-icon>
            </v-btn>

        </v-container>
                    
	</div>

</template>

<script>
import { firestore } from '~/plugins/firebase.js'

export default {
    data () {
        return {
            baseStationDocs : [],
            registerBaseStationLoading: false,
            unlinkBaseStationLoading: false,
        }
    },
    async mounted() {

        firestore.collection('base_stations').onSnapshot(({docs}) => {
            this.baseStationDocs = docs
        }, console.log)
    },

    computed : {
        baseStations () {
            const baseStations = []
            this.baseStationDocs.forEach(doc => {

                const data = doc.data()

                const baseStation = {
                    id      : doc.id,
                    path    : `/sensors/${doc.id}`,
                    data    : data
                }
    
                baseStations.push(baseStation)
            })

            return baseStations
        },
    },

    methods : {
        
        registerBaseStation() {
            this.registerBaseStationLoading = true

            this.$axios.$put(`base-stations/`)
				.catch(e => {
					console.log(e)
				})
				.finally(() => {
					this.registerBaseStationLoading = false
				})
        },

        unlink(baseStationId)
        {
            this.unlinkBaseStationLoading = true
            this.$axios.$delete(`base-stations/${baseStationId}/households/`)
				.catch(e => {
					console.log(e)
				})
				.finally(() => {
					this.unlinkBaseStationLoading = false
				})
        }
    }

}
</script>

<style>

</style>
