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

                                        <v-chip v-if="baseStation.data.households">

                                            <v-avatar class="teal">
                                                <v-icon color="white">check</v-icon>
                                            </v-avatar>
                                            Claimed

                                        </v-chip>

                                    </v-card-actions>

                                    <v-card-actions>

                                        <v-btn
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
                
            <v-dialog v-model="settingsDialog.show" max-width="600px">
                
                <v-form
                    ref="updateAddressForm"
                    >

                    <v-card>
                        
                        <v-card-title class="headline white--text blue-grey lighten-1">
                            Base Station settings
                        </v-card-title>

                        <v-card-text>

                            <v-container grid-list-md>

                                <v-layout wrap>

                                    <v-flex
                                        xs12
                                        md5
                                    >

                                        <v-text-field
                                            v-model="settingsDialog.pin"
                                            :rules="settingsDialog.pinRules"
                                            label="Pin code"
                                            required
                                        ></v-text-field>
                                    </v-flex>

                                </v-layout>

                                <v-layout wrap>

                                    <v-flex
                                        xs12
                                        md5
                                    >
                                        <v-text-field
                                            v-model="settingsDialog.ip"
                                            :rules="settingsDialog.ipRules"
                                            label="IP Address"
                                            required
                                        ></v-text-field>
                                    </v-flex>

                                    <v-flex
                                        xs12
                                        md3
                                    >
                                        <v-text-field
                                            v-model="settingsDialog.port"
                                            :rules="settingsDialog.portRules"
                                            label="Port"
                                            required
                                        ></v-text-field>
                                    </v-flex>

                                </v-layout>

                            </v-container>

                        </v-card-text>
            
                        <v-card-actions>
            
                            <v-spacer></v-spacer>
                
                            <v-btn color="blue darken-1" flat @click="settingsDialog.show = false">Cancel</v-btn>
                            <v-btn
                                color="blue darken-1"
                                flat
                                type="submit"
                                @click="settingsSubmit"
                                :loading="settingsDialog.loading"
                                >
                                Update
                            </v-btn>
            
                        </v-card-actions>
            
                    </v-card>
                
                </v-form>

            </v-dialog>
            
        </v-container>
                    
	</div>

</template>

<script>
import { firebase, firestore } from '~/plugins/firebase.js'
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
            websockets: {},
            settingsDialog : {
                show : false,
                loading : false,
                ip: null,
                ipRules: [
                    v => !!v || 'You have to provide an IP address',
                    v => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v) || 'You have to provide a valid IP address'
                ],
                port: null,
                portRules: [
                    v => !!v || 'You have to provide a port',
                    v => /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/.test(v) || 'The port must be an integer between 0 and 65535'
                ],
                pin: null,
                pinRules: [
                     v => !!v || 'You have to provide a pin code',
                ],
                id: null,
            }
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

        async showSettingsDialog(baseStationId)
        {
            const baseStation = this.baseStations[baseStationId]

            this.settingsDialog.baseStation = baseStationId

            const websocket = baseStation.data.websocket


            if(baseStation.data.websocket)
            {

                
                this.settingsDialog.ip      = websocket.address
                this.settingsDialog.port    = websocket.port
            }

            this.settingsDialog.id      = baseStationId
            this.settingsDialog.pin     = baseStation.data.pin

            // else this.$refs.updateAddressForm.reset()

            this.settingsDialog.show = true
        },

        async settingsSubmit(event)
        {
            event.preventDefault()
            
            if (!this.$refs.updateAddressForm.validate()) return

            this.settingsDialog.loading = true

            try{
                await firestore.collection('base_stations').doc(this.settingsDialog.baseStation).update({
                    'websocket' : {
                        'address' : this.settingsDialog.ip,
                        'port' : this.settingsDialog.port
                    },
                    'pin' : this.settingsDialog.pin
                })
            }
            catch(e)
            {
                console.log(e)
            }
    
            this.settingsDialog.loading = false
            this.settingsDialog.show = false
    
            this.settingsDialog.ip = null
            this.settingsDialog.id = null
            this.settingsDialog.pin = null
            this.settingsDialog.address = null

            this.$refs.updateAddressForm.reset()
        },

        async unlink(baseStationId)
        {
            const baseStation = this.baseStationDocs.filter(doc => doc.id == baseStationId)[0]

            try{
				await firestore.collection('base_stations').doc(baseStation.id).update({
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

        async deleteBaseStation(baseStationId)
        {
            this.deleteBaseStationLoadingIds.push(baseStationId)
            
            try{
                await this.$axios.$delete(`base-stations/${baseStationId}`)

            }
            catch(e)
            {
                console.log(e)
            }
				
            const i = this.deleteBaseStationLoadingIds.indexOf(baseStationId)
            this.deleteBaseStationLoadingIds.splice(i,1)
        },

        toggleWebsocketConnection(baseStationId)
        {
            const baseStation = this.baseStationDocs.filter(doc => doc.id == baseStationId)[0]
            if(!baseStation) return
            if(!baseStation.data().websocket || !baseStation.data().websocket.address || !baseStation.data().websocket.port)
            {
                this.showSettingsDialog(baseStationId)                
                return
            } 

            this.websocketBaseStationLoadingIds.push(baseStationId)

            const data = baseStation.data()
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

                console.log('CLIENT', ws)

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

            ws.onclose = () => {
                const i = this.hasWebsocket.indexOf(baseStationId)
                this.hasWebsocket.splice(i,1)

                delete this.websockets[baseStationId]
                console.log('client Closed')
            }
            
            ws.onmessage = e => {
                if (typeof e.data === 'string') {
                    console.log("Received: '" + e.data + "'")
                }
            }
        },

        publishMessage(action, baseStationId)
        {
            const ws = this.websockets[baseStationId]
            if(!ws) return
            
            if (ws.readyState === ws.OPEN)
            {
                ws.send(
                    JSON.stringify({
                        action: action
                    })
                )
            }
        },
    }

}
</script>

<style>

</style>