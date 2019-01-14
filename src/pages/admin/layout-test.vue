<template>
    
    <v-card>
        <v-toolbar color="light-blue" dark>

          <v-toolbar-title>Households</v-toolbar-title>

        </v-toolbar>

        <v-list two-line subheader>
          <v-list-tile
            v-for="household in households"
            :key="household.id"
            avatar
          >
            <v-list-tile-avatar>
              <v-icon class="grey lighten-1 white--text">home</v-icon>
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title>{{ household.id }}</v-list-tile-title>
              <v-list-tile-sub-title></v-list-tile-sub-title>
            </v-list-tile-content>

            <v-list-tile-action>
              <v-btn icon ripple
              @click.stop="toggleHouseholdInfo(household)">
                <v-icon color="grey lighten-1">info</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>

        </v-list>
      </v-card>

</template>

<script>

import { firebase, firestore, messaging } from '~/plugins/firebase.js'

export default {
    layout: 'new-layout',

    data () {
        return {
            households: [],
            activeHousehold : null,
        }
    },

    created () {
    
		firestore.collection('households')
			.onSnapshot(snapshot => {
				const households = []
			
				snapshot.docs.forEach(doc => {
				
					const household = {
						id    : doc.id,
						data : doc.data()
					}

					households.push(household)

					if(this.activeHousehold && this.activeHousehold.id == doc.id)
						this.activeHousehold = household
				})

				this.households = households
			}, error => {
				console.log(error.message)
			})
    }
}
</script>

<style>

</style>
