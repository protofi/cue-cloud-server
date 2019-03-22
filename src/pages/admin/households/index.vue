<template>

    <div>

        <v-toolbar
            color="cyan"
            
            dark
            tabs
        >

			<v-toolbar-title>Households</v-toolbar-title>

		</v-toolbar>

        <v-layout column fill-height justify-center>
            
            <v-container class="text-xs-center" v-if="loading">

                <v-progress-circular
                    :size="50"
                    color="cyan"
                    indeterminate
                ></v-progress-circular>

            </v-container>

            <v-layout v-if="!loading" row wrap>
                
                <v-flex xs12 sm6 md6 lg6 xl6>
                    
                    <v-container v-if="!hasHousehold">

                        <v-card>

                            <v-img
                                src="~/../../ghost-town-wallpapers.jpg"
                                aspect-ratio="2"
                            ></v-img>
                                
                                <v-card-title primary-title>
                                        <span class="headline">No Households were found</span>
                                </v-card-title>

                            <v-card-actions>
                                
                                <v-btn 
                                    dark
                                    color="pink"
                                    @click.stop="showCreateHouseholdDialog">
                                    <v-icon left>add</v-icon>
                                    Create new
                                </v-btn>
                            
                            </v-card-actions>

                        </v-card>

                    </v-container>

                    <v-list two-line v-if="hasHousehold">
                        
                        <v-subheader>
                            
                            <v-spacer></v-spacer>

                            <v-list-tile-action v-if="selectedHouseholds.length > 0">

                                <v-layout>
                                
                                    <v-btn
                                        icon
                                        ripple
                                        @click.stop="bulkDelete"
                                        :loading="deleteLoading"
                                    >
                                        <v-icon color="grey">delete</v-icon>
                                    </v-btn>
                                 
                                </v-layout>

                            </v-list-tile-action>

                            <v-list-tile-action>

                                <v-checkbox v-model="allChecked"></v-checkbox>

                            </v-list-tile-action>

                        </v-subheader>

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

                                <v-layout>
                                
                                    <v-icon color="grey lighten-1">info</v-icon>
                                 
                                </v-layout>

                            </v-list-tile-action>
                            
                            <v-list-tile-action @click.stop.prevent="">

                                <v-checkbox :value="household.id" v-model="selectedHouseholds"></v-checkbox>

                            </v-list-tile-action>

                        </v-list-tile>

                    </v-list>
            
                </v-flex>

                <v-flex
                    xs12 sm6
                    md5 offset-md1
                    lg5 offset-lg1
                    xl5 offset-xl1
                    v-if="hasHousehold"
                    v-show="!showHouseholdDetailDrawer"
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

        <v-container>

            <v-navigation-drawer
                stateless
                value="true"
                v-if="hasHousehold"
                v-model="householdsDetailDrawer"
                v-show="showHouseholdDetailDrawer"
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

        </v-container>

        <v-btn
            color="pink"
            dark
            fixed
            bottom
            right
            fab
            v-if="hasHousehold"
            :loading="createHouseholdDialog.loading"
            @click="showCreateHouseholdDialog"
        >
            <v-icon>add</v-icon>
        </v-btn>

        <v-dialog v-model="createHouseholdDialog.show" max-width="600px">
            
            <v-form
                ref="createHouseholdForm"
                >

                <v-card>
        
                    <v-card-title
                        class="headline white--text pink"
                        >
                            Create new Household
                    </v-card-title>

                    <v-card-text>

                        <v-container grid-list-md>

                            <v-layout wrap>

                                To create a Household an Owner must be picked. 

                            </v-layout>

                            <v-layout wrap>

                                <v-flex xs12 sm6>
                                    <v-select
                                    :items="users"
                                    no-data-text="No users found"
                                    label="Owner"
                                    v-model="createHouseholdDialog.owner"
                                    required
                                    :rules="createHouseholdDialog.ownerRules"
                                    ></v-select>
                                </v-flex>

                            </v-layout>

                        </v-container>

                        <p> 
                            Only users not already assigned a Household can be chosen as Owner.
                        </p>

                    </v-card-text>
        
                    <v-card-actions>
        
                        <v-spacer></v-spacer>
            
                        <v-btn color="blue darken-1" flat @click="createHouseholdDialog.show = false">Cancel</v-btn>
                        <v-btn
                            color="blue darken-1"
                            flat
                            type="submit"
                            @click="createHosueholdSubmit"
                            :loading="createHouseholdDialog.loading"
                            >
                            Create
                        </v-btn>
        
                    </v-card-actions>
        
                </v-card>
            
            </v-form>

        </v-dialog>
    
    </div>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'
import AdminHouseholdDetailList from '~/components/admin/HouseholdDetailList.vue'

export default {
    data() {
        return {
            householdsDetailDrawer: false,
            households: [],
            loading : true,
            activeHousehold : null,
            selectedHouseholds : [],
            deleteLoading : false,
            allChecked : false,
            createHouseholdDialog : {
                show : false,
                loading : false,
                owner : null,
                ownerRules: [
                    v => !!v || 'You need to choose an Owner',
                ],
                userDocs : []
            }
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
    watch : {
        households()
        {
            this.loading = false
        },
        selectedHouseholds(selectedHouseholds)
        {
            this.allChecked = (selectedHouseholds.length == this.households.length && this.households.length > 0)
        },
        allChecked(value)
        {
            if(this.selectedHouseholds.length == this.households.length)
            {
                this.selectedHouseholds = []
            }
            
            if(value)
            {
                this.selectedHouseholds = []

                this.households.forEach(household => {
                    this.selectedHouseholds.push(household.id)
                })
            }
        }
    },
    computed: {
        showHouseholdDetailDrawer () {
            return this.$vuetify.breakpoint.name == 'xs'
        },
        users () {
            return this.createHouseholdDialog.userDocs.filter(user => {
                return !((user.data()).households)
            }).map(user => {
                const data = user.data()
                return {
                    text : (data.name) ? data.name : data.email,
                    value : user.id
                }
            })
        },
        hasHousehold () {
            return this.households.length > 0
        }
    },
    methods : {
        toggleHouseholdInfo(household) {
            this.householdsDetailDrawer = !(this.activeHousehold && this.activeHousehold.id == household.id && this.householdsDetailDrawer)
            this.activeHousehold = household
        },
        
        async showCreateHouseholdDialog()
        {
            this.createHouseholdDialog.show = true

            try{
                this.createHouseholdDialog.userDocs = (await firestore.collection('users').get()).docs
            }
            catch(e)
            {
                console.log('LISTEN ON USER', e)
            }
        },

        async createHosueholdSubmit(event)
        {
            event.preventDefault()
            
            if (!this.$refs.createHouseholdForm.validate()) return

            this.createHouseholdDialog.loading = true

            try{

                const householdSnap = await firestore.collection('households').doc()
                const householdId = householdSnap.id

                await firestore.collection('users').doc(this.createHouseholdDialog.owner).update({
                    'households' : {
                        id : householdId
                    }
                })

                await householdSnap.set({
                    users : {
                        [this.createHouseholdDialog.owner] : true
                    }
                })

                this.createHouseholdDialog.loading = false
                this.createHouseholdDialog.owner = null
                this.createHouseholdDialog.show = false
            }
            catch(e)
            {
                console.log(e)
            }
        },
        
        async bulkDelete()
        {
            if(this.selectedHouseholds.length < 1) return
            
            this.deleteLoading = true

            try{
                const deletions = []

                this.selectedHouseholds.forEach(id => {
                    deletions.push(
                        firestore.collection('households').doc(id).delete()
                    )  
                })

                await Promise.all(deletions)
            }
            catch(e)
            {
                console.log(e)
            }

            this.deleteLoading = false
            this.selectedHouseholds = []
        }
    },
}
</script>

<style>

</style>
