<template>
    
    <div>
		
		<v-toolbar color="cyan" dark tabs>

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

        <v-container>
            <v-card
                v-for="sensor in sensors"
                :key="sensor.id"
                ripple
                :to="sensor.path"
                router
            >

                <v-card-title
                    primary-title
                >

                    <v-avatar color="blue-grey lighten-1">
                        <v-icon dark>notifications</v-icon>
                    </v-avatar>
                    
                    <v-spacer></v-spacer>

                    <div>

                        <div class="headline"> {{ sensor.data.name }} </div>
                        <span class="grey--text"> {{ sensor.data.location }} </span>
                    
                    </div>

                </v-card-title>

                <v-card-actions
                    @click.stop.prevent=""
                >

                    <v-switch
                        label="Muted"
                        v-model="sensor.muted"
                        :loading="sensorLoading == sensor.id"
                        @click.stop.prevent="toggleMuteSensor(sensor)"
                    ></v-switch>

                    <v-spacer></v-spacer>
                    
                    <v-btn icon @click.stop.prevent="show = !show">
                        <v-icon>{{ show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>

                </v-card-actions>

                <v-slide-y-transition>

                    <v-card-text v-show="show">
                        I'm a thing. But, like most politicians, he promised more than he could deliver. You won't have time for sleeping, soldier, not with all the bed making you'll be doing. Then we'll go with that data file! Hey, you add a one and two zeros to that or we walk! You're going to do his laundry? I've got to find a way to escape.
                    </v-card-text>

                </v-slide-y-transition>

            </v-card>

        </v-container>

	</div>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'

export default {
    data () {
        return {
            user : null,
            household : null,
            sensorDocs : [],
            show: false,
            sensorLoading : null
        }
    },

    async mounted() {

        firestore.collection('users').doc(this.userId).onSnapshot((snapshot) => {
            this.user = snapshot.data()
        }, (e) => {
            console.log('LISTEN ON USER', e)
        })

        firestore.collection('sensors').where(`users.${this.userId}.id`, '==', this.userId).onSnapshot(({docs}) => {
            this.sensorDocs = docs
        }, (e) => {
            console.log('LISTEN ON SENSORS', e)
        })
    },

    computed : {
        hasHousehold () {
            return 
        },

        userId () {
            return this.$store.getters['auth/user'].uid
        },
        sensors () {
            const sensors = []
            this.sensorDocs.forEach(doc => {

                const data = doc.data()

                const sensor = {
                    id      : doc.id,
                    path    : `/sensors/${doc.id}`,
                    data    : data,
                    muted   : (data.users[this.userId].pivot && data.users[this.userId].pivot.muted) ? true : false
                }
    
                sensors.push(sensor)
            })

            return sensors
        }
    },

    methods : {
        async toggleMuteSensor(sensor) {

            this.sensorLoading = sensor.id
            
            const muted = !sensor.muted

            await firestore.collection('sensors_users').doc(`${sensor.id}_${this.userId}`).set({
                pivot : {
                    muted : muted
                }
            },
            {
                merge : true
            })

            this.sensorLoading = null
        }
    }
}
</script>
