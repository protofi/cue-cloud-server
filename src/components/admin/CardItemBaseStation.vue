<template>

    <v-flex xs12 md6>

        <v-card>
            
            <v-layout wrap>

                <v-flex xs2 sm2 lg1>
                    
                    <v-card-title>
                        
                        <v-avatar size="56" color="cue-green-2 darken-1">
                        
                            <v-icon dark>router</v-icon>
                        
                        </v-avatar>
                        
                    </v-card-title>
            
                </v-flex>
            
                <v-flex xs10 sm6 lg7>
            
                    <v-card-title primary-title>

                        <div>

                            <div
                                class="grey--text text--darken-1 subheadline">
                                
                                {{ baseStation.id }}

                            </div>

                            <div
                                class="title"
                                v-if="baseStation.data.websocket"
                            >
                                {{baseStation.data.websocket.address}}:{{baseStation.data.websocket.port}}
                            </div>

                        </div>

                    </v-card-title>
            
                </v-flex>

                <v-flex xs12 sm4 v-if="!simple">
                    
                    <v-card-title>

                        <v-layout row wrap>

                            <v-flex xs6 sm12
                                class="text-sm-right"
                                v-if="baseStation.data.pin"
                            >
                                <span class="headline">
                                    {{ baseStation.data.pin }}
                                </span>

                            </v-flex>

                            <v-flex xs6 sm12
                                class="text-xs-right"
                                v-if="baseStation.data.households"
                            >
                                <v-btn
                                    color="cue-green-6 darken-1"
                                    outline
                                    :to="`/admin/households/${baseStation.data.households.id}`"
                                    round ripple router
                                >
                                    <v-icon left>home</v-icon>
                                    Claimed
                                </v-btn>

                            </v-flex>

                        </v-layout>

                    </v-card-title>

                </v-flex>
            
            </v-layout>

            <v-divider light></v-divider>
            
            <v-card-actions>
                
                <v-btn
                    icon large ripple
                    @click.stop="toggleWebsocketConnection(baseStation.id)"
                >
                    <v-icon dark :color="this.websocket.connection ? 'cue-green-6' : 'grey darken-1'">
                        power{{(!this.websocket.connection) ? '_off' : ''}}
                    </v-icon>
                
                </v-btn>

                <v-menu
                    v-show="this.websocket.connection"
                    transition="slide-y-transition"
                    bottom
                >
                    <template>

                        <v-btn
                            slot="activator"
                            large icon
                        >
                            <v-icon>arrow_drop_down</v-icon>
                        </v-btn>

                    </template>

                    <v-list>
                    
                        <v-list-tile
                            v-for="(command, i) in websocket.commands"
                            :key="i"
                            @click="sendWebsocketCommand(command.name)"
                        >
                    
                            <v-list-tile-title>
                                {{ command.name }}
                            </v-list-tile-title>
                    
                        </v-list-tile>
                    
                    </v-list>
                </v-menu>

                <slot name="additional-actions-right"></slot>

                <v-spacer></v-spacer>

                <slot name="additional-actions-left"></slot>

                <v-btn icon large ripple
                    v-if="baseStation.data.households"
                    @click.stop="showDialog('unlink')"
                >
                    <v-icon>link_off</v-icon>
                </v-btn>

                <v-btn
                    v-if="!simple"
                    icon large ripple
                    @click.stop="showDialog('delete')"
                >
                    <v-icon>delete</v-icon>
                </v-btn>

                <v-btn
                    icon large ripple
                    @click.stop="showDialog('edit')"
                >
                    <v-icon>settings</v-icon>
                </v-btn>

            </v-card-actions>
            
        </v-card>

        <c-dialog
            :show="dialog.show"
            v-on:confirmed="onConfirmed"
            v-on:dismissed="onDismissed"
            :loading="dialog.loading"
            :actions="dialog.type != 'edit'"
            :cancable="dialog.type != 'edit'"
        >   
            
            <template v-if="dialog.type == 'edit'">

                <template slot="headliner">Edit Base Station</template>
                
                <form-edit-base-station
                    :base-station="baseStation"
                    :cancable="true"
                    v-on:submitted="onSubmitted"
                    v-on:dismissed="onDismissed">
                </form-edit-base-station>
            
            </template>

            <template v-if="dialog.type == 'delete'">

                <template slot="headliner">Delete base station</template>

                <template slot="body">Are you sure you want to delete this Base Station?</template>

            </template>

            <template v-if="dialog.type == 'unlink'">

                <template slot="headliner">Unlink base station</template>

                <template slot="body">Are you sure you want to unlink this Base Station from the Household?</template>

            </template>

        </c-dialog>

    </v-flex>

</template>

<script>

import { firebase, firestore } from '~/plugins/firebase.js'
import { websocket } from '~/plugins/websocket.js'

import FormEditBaseStation from '~/components/FormEditBaseStation.vue'
import CDialog from '~/components/Dialog.vue'

export default {
	props : [
        'base-station',
        'simple'
    ],
    components : {
        FormEditBaseStation,
        CDialog
    },
	data () {
        return {
            websocket: {
                connection : null,
                commands : [
                    {
                        name : 'Pair'
                    },
                    {
                        name : 'Calibrate'
                    },
                    {
                        name : 'Disconnect'
                    }
                ]
            },
            dialog : {
                show : false,
                type : null,
                loading : false
            }
        }
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
                    await this.deleteBaseStation()
                break

                case('unlink') :
                    await this.unlink()
                break
            }
        },

        onDismissed ()
        {
            this.dialog.show = false
        },

        async deleteBaseStation()
        {
            this.dialog.loading = true
            try{
				await firestore.collection('base_stations').doc(this.baseStation.id).delete()
			}
			catch(e)
			{
				console.log(e)
            }
            this.dialog.show = false
            this.dialog.loading = false
        },

        toggleWebsocketConnection()
        {
            // this.websocket.connected = !this.websocket.connected
            
            if(!this.baseStation.data.websocket || !this.baseStation.data.websocket.address || !this.baseStation.data.websocket.port)
            {
            //     this.showSettingsDialog(baseStationId)                
                return
            } 

            // this.websocketBaseStationLoadingIds.push(baseStationId)

            const data = this.baseStation.data
            const address = `ws://${data.websocket.address}:${data.websocket.port}`

            let ws = this.websocket.connection

            if(ws)
            {
                ws.close()
                delete _this.websocket.connection
                // const i = this.hasWebsocket.indexOf(baseStationId)
                // this.hasWebsocket.splice(i,1)

                // delete this.websockets[baseStationId]
                
                // const j = this.websocketBaseStationLoadingIds.indexOf(baseStationId)
                // this.websocketBaseStationLoadingIds.splice(j,1)

                return
            }

            const _this = this

            ws = new websocket(address)
            
            ws.onerror = event => {
                console.log('Connection Error', event)

                console.log('CLIENT', ws)

                // const j = _this.websocketBaseStationLoadingIds.indexOf(baseStationId)
                // _this.websocketBaseStationLoadingIds.splice(j,1)
            }

            ws.onopen = () => {
                console.log('WebSocket client Connected')
                
                // _this.hasWebsocket.push(baseStationId)
                _this.websocket.connection = ws

                // const j = _this.websocketBaseStationLoadingIds.indexOf(baseStationId)
                // _this.websocketBaseStationLoadingIds.splice(j,1)
            }

            ws.onclose = () => {
                // const i = this.hasWebsocket.indexOf(baseStationId)
                // this.hasWebsocket.splice(i,1)

                delete _this.websocket.connection
                console.log('client Closed')
            }
            
            ws.onmessage = e => {
                if (typeof e.data === 'string') {
                    console.log("Received: '" + e.data + "'")
                }
            }
        },

        async unlink()
        {
            this.dialog.loading = true
            const householdId = this.baseStation.data.households.id

			try{
				await firestore.collection('households').doc(householdId).update({
						[`base_stations.${this.baseStation.id}`] : firebase.firestore.FieldValue.delete()
					})
			}
			catch(e)
			{
				console.log(e)
            }

            try{
				await firestore.collection('base_stations').doc(this.baseStation.id).update({
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
            
            this.dialog.show = false
            this.dialog.loading = false
        },

        sendWebsocketCommand(command) 
        {
            const ws = this.websockets.connection
            if(!ws) return
            
            if (ws.readyState === ws.OPEN)
            {
                ws.send(
                    JSON.stringify({
                        action: command
                    })
                )
            }
        }
	}
}

</script>