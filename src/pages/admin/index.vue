<template>

	<v-layout row>

		<h2>ADMIN DASHBOARD</h2>

	</v-layout>

</template>

<script>

import { firebase, firestore, messaging } from '~/plugins/firebase.js'

export default {

	data () {
        return {
            households: [],
			activeHousehold : null,
			householdsDetailDrawer: false,
			admins: [
				['Management', 'people_outline'],
				['Settings', 'settings']
			],
			cruds: [
				['Create', 'add'],
				['Read', 'insert_drive_file'],
				['Update', 'update'],
				['Delete', 'delete']
			]
        }
    },

    created () {
    
		firestore.collection('households')
			.onSnapshot(({ docs }) => {
				const households = []
			
				docs.forEach(doc => {
				
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
	},
	
	methods : {
		toggleHouseholdInfo(household) {
				this.householdsDetailDrawer = !(this.activeHousehold && this.activeHousehold.id == household.id && this.householdsDetailDrawer)
				this.activeHousehold = household
			},
	}
}
</script>

<style>
</style>