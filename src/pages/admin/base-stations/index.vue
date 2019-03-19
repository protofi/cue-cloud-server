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

                                        <p class="headline"> {{ baseStation.data.pin }} </p>

                                    </v-card-title>

                                    <v-card-actions>

                                        <p v-if="baseStation.data.websocket"
                                            class="headline">
                                            {{baseStation.data.websocket.address}}:{{baseStation.data.websocket.port}}
                                        </p>

                                        <v-spacer></v-spacer>

                                        <v-chip v-if="baseStation.data.households">

                                            <v-avatar class="teal">
                                                <v-icon color="white">check</v-icon>
                                            </v-avatar>
                                            Claimed

                                        </v-chip>

                                    </v-card-actions>

                                    <v-card-actions>

                                        <v-btn
                                            disabled
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
                                                @click.stop="enterPairingMode(baseStation.id)"                                                
                                                >
                                                
                                                Pairing
                                            </v-btn>
                                            <v-btn
                                                :disabled="!hasWebsocket.includes(baseStation.id)"
                                                @click.stop="enterCalibrationMode(baseStation.id)">
                                                Calibration
                                            </v-btn>
                                        </div>
                                       
                                        <v-spacer></v-spacer>
                                        
                                        <v-btn
                                            icon large ripple
                                            :loading="unlinkBaseStationLoading"
                                            v-if="baseStation.data.households"
                                            @click.stop="unlink(baseStation.id)"
                                        >
                                            <v-icon>link_off</v-icon>
                                        </v-btn>

                                        <v-btn icon large ripple
                                            @click.stop="deleteBaseStation(baseStation.id)"
                                            :loading="deleteBaseStationLoadingIds.includes(baseStation.id)"
                                        >
                                            <v-icon>delete</v-icon>
                                        </v-btn>               
                                   
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
import { websocket } from '~/plugins/websocket.js'

export default {
    data () {
        return {
            baseStationDocs : [],
            registerBaseStationLoading: false,
            unlinkBaseStationLoading: false,
            deleteBaseStationLoadingIds: [],
            websocketBaseStationLoadingIds: [],
            hasWebsocket : [],
            websockets: {}
        }
    },
    async mounted() {

        firestore.collection('base_stations').onSnapshot(({docs}) => {
            this.baseStationDocs = docs
        }, console.error)
    },

    computed : {
        baseStations () {
            const baseStations = {}
            this.baseStationDocs.forEach(doc => {

                const data = doc.data()

                const baseStation = {
                    id      : doc.id,
                    path    : `/sensors/${doc.id}`,
                    data    : data
                }
    
                baseStations[doc.id] = baseStation
            })

            return baseStations
        },
    },

    methods : {
        
        registerBaseStation() {
            this.registerBaseStationLoading = true

            this.$axios.$put(`base-stations/`)
				.catch(console.error)
				.finally(() => {
					this.registerBaseStationLoading = false
				})
        },

        unlink(baseStationId)
        {
            this.unlinkBaseStationLoading = true
            this.$axios.$delete(`base-stations/${baseStationId}/`)
				.catch(console.error)
				.finally(() => {
					this.unlinkBaseStationLoading = false
				})
        },

        deleteBaseStation(baseStationId)
        {
            this.deleteBaseStationLoadingIds.push(baseStationId)
            
            this.$axios.$delete(`base-stations/${baseStationId}`)
                .catch(console.error)
				.finally(() => {
                    const i = this.deleteBaseStationLoadingIds.indexOf(baseStationId)
                    this.deleteBaseStationLoadingIds.splice(i,1)
				})
        },

        toggleWebsocketConnection(baseStationId)
        {
            this.websocketBaseStationLoadingIds.push(baseStationId)

            const baseStation = this.baseStationDocs.filter(doc => doc.id == baseStationId)
            if(!baseStation) return

            const data = baseStation[0].data()
            const address = `ws://${data.websocket.address}:${data.websocket.port}`

            let ws = this.websockets[baseStationId]

            if(ws)
            {
                ws.close()
                
                const i = this.hasWebsocket.indexOf(baseStationId)
                this.hasWebsocket.splice(i,1)

                delete this.websockets[baseStationId]
                
                const j = this.websocketBaseStationLoadingIds.indexOf(baseStationId)
                this.websocketBaseStationLoadingIds.splice(j,1)

                return
            }

            const _this = this

            ws = new websocket(address)
            
            ws.onerror = event => {
                console.log('Connection Error', event)
                const j = _this.websocketBaseStationLoadingIds.indexOf(baseStationId)
                _this.websocketBaseStationLoadingIds.splice(j,1)
            }

            ws.onopen = () => {
                console.log('WebSocket client Connected')
                
                _this.hasWebsocket.push(baseStationId)
                _this.websockets[baseStationId] = ws

                const j = _this.websocketBaseStationLoadingIds.indexOf(baseStationId)
                _this.websocketBaseStationLoadingIds.splice(j,1)
            }

            ws.onclose = function() {
                console.log('client Closed')
            }
            
            ws.onmessage = function(e) {
                if (typeof e.data === 'string') {
                    console.log("Received: '" + e.data + "'")
                }
            }
        },

        enterPairingMode(baseStationId)
        {
            const ws = this.websockets[baseStationId]
            if(!ws) return

            if (ws.readyState === ws.OPEN)
            {

                ws.send(
                    JSON.stringify({
                        action: 'pairing'
                    })
                );
            }
        },

        enterCalibrationMode(baseStationId)
        {
            const ws = this.websockets[baseStationId]
            if(!ws) return
            
            if (ws.readyState === ws.OPEN)
            {
                ws.send(
                    JSON.stringify({
                        action: 'calibration'
                    })
                )
            }
        }
    }

}
</script>

<style>

</style>
