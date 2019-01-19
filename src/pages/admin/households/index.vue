<template>

    <v-container>

        <v-navigation-drawer
            stateless
            value="true"
            v-model="householdsDetailDrawer"
            v-show="showHousheoldDetailDrawer"
            right
            fixed
            width="600"
            dark
        >

            <v-card dark flat>
                
                <v-toolbar>

                    <v-toolbar-title>Household details</v-toolbar-title>

                    <v-spacer></v-spacer>
                    <v-btn icon
                        @click.stop="householdsDetailDrawer = false"
                    >
                        <v-icon>clear</v-icon>
                    </v-btn>

                </v-toolbar>
                
                <admin-household-detail-list
                    :activeHousehold="activeHousehold"
                />

            </v-card>

        </v-navigation-drawer>

        <v-layout column fill-height justify-center>
            
            <v-layout row wrap>
                
                <v-flex xs12 sm6 md6 lg6 xl6>

                    <v-card>
			
                        <v-toolbar color="light-blue" dark>

                            <v-toolbar-title>Households</v-toolbar-title>

                        </v-toolbar>

                        <v-list two-line subheader>
                        
                            <v-list-tile
                                v-for="household in households"
                                :key="household.id"

                                @click.stop="toggleHouseholdInfo(household)"
                                ripple
                                avatar
                                router
                            >
                                <v-list-tile-avatar>
                                    <v-icon class="grey lighten-1 white--text">home</v-icon>
                                </v-list-tile-avatar>

                                <v-list-tile-content>
                                    
                                    <v-list-tile-title>{{ household.id }}</v-list-tile-title>
                                    <v-list-tile-sub-title></v-list-tile-sub-title>

                                </v-list-tile-content>

                                <v-list-tile-action>

                                    <v-icon color="grey lighten-1">info</v-icon>

                                </v-list-tile-action>

                            </v-list-tile>

                        </v-list>

                    </v-card>
        
                </v-flex>

                <v-flex
                    xs12 sm6
                    md5 offset-md1
                    lg5 offset-lg1
                    xl5 offset-xl1
                    v-show="!showHousheoldDetailDrawer"
                >

                    <v-card dark>
                        
                        <v-toolbar>

                            <v-toolbar-title>Details</v-toolbar-title>

                        </v-toolbar>
                        
                        <admin-household-detail-list
                            :activeHousehold="activeHousehold"
                        />
    
                    </v-card>

                </v-flex>
            
            </v-layout>

        </v-layout>

    </v-container>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'
import AdminHouseholdDetailList from '~/components/admin/HouseholdDetailList.vue'

export default {
    data() {
        return {
            householdsDetailDrawer: false,
            households: [],
            activeHousehold : null,
        }
    },
    components : {
        AdminHouseholdDetailList
    },
    created () {
    
		firestore.collection('households')
			.onSnapshot(({ docs }) => {
				const households = []
			
				docs.forEach(doc => {
				
					const household = {
                        id      : doc.id,
                        path    : `/admin/households/${doc.id}`,
						data    : doc.data()
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
    computed: {
        showHousheoldDetailDrawer () {
            return this.$vuetify.breakpoint.name == 'xs'
        }
    },
    methods : {
        toggleHouseholdInfo(household) {
            this.householdsDetailDrawer = !(this.activeHousehold && this.activeHousehold.id == household.id && this.householdsDetailDrawer)
            this.activeHousehold = household
        },
    },
}
</script>

<style>

</style>
