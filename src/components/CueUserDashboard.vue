<template>
    
    <div>
		
		<v-toolbar color="cue-green-4" dark tabs>

			<v-toolbar-title>My Home</v-toolbar-title>

            <v-spacer></v-spacer>

            <v-btn
                v-if="user && user.households"
                icon
                :to="`households/${user.households.id}`"
            >
                <v-icon>settings</v-icon>
            </v-btn>

		</v-toolbar>

        <v-container
		fluid
		grid-list-xl
	>
            <v-container
                fluid
                grid-list-lg
            >

                <v-layout row wrap>

                    <sensor-details-card-item
                        v-for="sensor in sensors"
                        :key="sensor.id"
                        :sensor="sensor"
                    >
                        <template slot="additional-actions">
                            
                            <v-hover>
                            <v-btn
                                ripple flat color="cue-green-8"
                                @click.stop="toggleMute(sensor)"
                                :loading="sensorLoading == sensor.id"
                                slot-scope="{ hover }"
                            >
                                <v-icon left dark color="grey darken-1"
                                    v-if="sensor.muted && hover"
                                >
                                    notifications
                                </v-icon>

                                <v-icon left dark color="grey darken-1"
                                    v-if="sensor.muted && !hover"
                                >
                                    notifications_off
                                </v-icon>

                                {{ (sensor.muted) ? 'Unmute' : 'mute' }}
                                
                            </v-btn>
                            </v-hover>
                        
                        </template>

                    </sensor-details-card-item>

                </v-layout>

            </v-container>
            
	</v-container>

	</div>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'
import SensorDetailsCardItem from '~/components/admin/SensorDetailsCardItem.vue'

export default {
    data () {
        return {
            user : null,
            household : null,
            show: false,
            sensorLoading : null,
            sensors : {}
        }
    },

    components : {
        SensorDetailsCardItem,
    },

    async mounted() {

        firestore.collection('users').doc(this.userId).onSnapshot((snapshot) => {
            this.user = snapshot.data()
        }, (e) => {
            console.log('LISTEN ON USER', e)
        })

		firestore.collection('sensors').where(`users.${this.userId}.id`, '==', this.userId)
			.onSnapshot(({ docs }) => {

			const sensors = {}

			docs.forEach(doc => {

				const oldSensor = this.sensors[doc.id]
				const meta = (oldSensor) ? oldSensor.meta : {}

				const data = doc.data()

				const sensor = {
					id      : doc.id,
                    path    : `/sensors/${doc.id}`,
                    data    : data,
                    meta    : meta,
                    muted   : (data.users[this.userId].pivot && data.users[this.userId].pivot.muted) ? true : false
				}

				sensors[doc.id] = sensor
			})

			this.sensors = sensors
		})
	},

    computed : {
        hasHousehold () {
            return 
        },

        userId () {
            return this.$store.getters['auth/user'].uid
        },

    },

    methods : {
        async toggleMute(sensor) {

            this.sensorLoading = sensor.id
            const muted = !sensor.muted

            try{
                await firestore.collection('sensors_users').doc(`${sensor.id}_${this.userId}`).set({
                    pivot : {
                        muted : muted
                    }
                },{ merge : true })
            }
            catch(e)
            {
                console.log(e)
            }
            sensor.muted = muted
            this.sensorLoading = null
        }
    }
}
</script>
